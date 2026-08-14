import { createHash } from "node:crypto";
import { hasValidBearerToken } from "@/server/location-data";
import { createRedis, getRedis } from "@/server/redis";
import {
  SPOTIFY_EXPIRY_TELEGRAM_MESSAGE,
  SPOTIFY_REAUTH_TELEGRAM_MESSAGE,
  sendTelegramMessage,
} from "@/server/telegram";

export const SPOTIFY_REFRESH_TOKEN_KEY = "spotify:refresh_token";
export const SPOTIFY_AUTHORIZED_AT_KEY = "spotify:authorized_at";
export const SPOTIFY_EXPIRY_PINGED_FOR_KEY = "spotify:expiry_pinged_for";
export const UNKNOWN_AUTHORIZATION_PERIOD = "unknown";

export const REFRESH_TOKEN_LIFETIME_MONTHS = 6;
export const EXPIRY_WARNING_DAYS = 14;

interface SpotifyTokenResponse {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

const rejectedRefreshTokens = new Set<string>();

export class SpotifyRefreshError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_grant" | "token_error"
  ) {
    super(message);
    this.name = "SpotifyRefreshError";
  }
}

export interface SpotifyAuthStore {
  getRefreshToken(): Promise<string | null>;
  getAuthorizedAt(): Promise<string | null>;
  getExpiryPingedFor(): Promise<string | null>;
  saveAuthorization(refreshToken: string, authorizedAt: string): Promise<void>;
  markExpiryPinged(periodKey: string): Promise<void>;
}

export function createMemorySpotifyAuthStore(
  initial: {
    refreshToken?: string | null;
    authorizedAt?: string | null;
    expiryPingedFor?: string | null;
  } = {}
): SpotifyAuthStore {
  let refreshToken = initial.refreshToken ?? null;
  let authorizedAt = initial.authorizedAt ?? null;
  let expiryPingedFor = initial.expiryPingedFor ?? null;

  return {
    async getRefreshToken() {
      return refreshToken;
    },
    async getAuthorizedAt() {
      return authorizedAt;
    },
    async getExpiryPingedFor() {
      return expiryPingedFor;
    },
    async saveAuthorization(nextRefreshToken, nextAuthorizedAt) {
      refreshToken = nextRefreshToken;
      authorizedAt = nextAuthorizedAt;
    },
    async markExpiryPinged(periodKey) {
      expiryPingedFor = periodKey;
    },
  };
}

export function createRedisSpotifyAuthStore(
  redis: NonNullable<ReturnType<typeof getRedis>>
): SpotifyAuthStore {
  return {
    async getRefreshToken() {
      const value = await redis.get<string>(SPOTIFY_REFRESH_TOKEN_KEY);
      return typeof value === "string" && value ? value : null;
    },
    async getAuthorizedAt() {
      const value = await redis.get<string>(SPOTIFY_AUTHORIZED_AT_KEY);
      return typeof value === "string" && value ? value : null;
    },
    async getExpiryPingedFor() {
      const value = await redis.get<string>(SPOTIFY_EXPIRY_PINGED_FOR_KEY);
      return typeof value === "string" && value ? value : null;
    },
    async saveAuthorization(refreshToken, authorizedAt) {
      await redis.mset({
        [SPOTIFY_REFRESH_TOKEN_KEY]: refreshToken,
        [SPOTIFY_AUTHORIZED_AT_KEY]: authorizedAt,
      });
    },
    async markExpiryPinged(periodKey) {
      await redis.set(SPOTIFY_EXPIRY_PINGED_FOR_KEY, periodKey);
    },
  };
}

export function getSpotifyAuthStore(
  env: NodeJS.ProcessEnv = process.env
): SpotifyAuthStore | null {
  const redis = env === process.env ? getRedis() : createRedis(env);
  if (!redis) return null;
  return createRedisSpotifyAuthStore(redis);
}

export function addUtcCalendarMonths(date: Date, months: number): Date {
  const monthIndex = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(date.getUTCDate(), lastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}

export function refreshTokenExpiresAt(authorizedAt: Date): Date {
  return addUtcCalendarMonths(authorizedAt, REFRESH_TOKEN_LIFETIME_MONTHS);
}

export function isRefreshTokenNearExpiry(
  authorizedAt: Date,
  now: Date,
  warningDays = EXPIRY_WARNING_DAYS
): boolean {
  const expiresAt = refreshTokenExpiresAt(authorizedAt);
  const warningMs = warningDays * 24 * 60 * 60 * 1000;
  return now.getTime() >= expiresAt.getTime() - warningMs;
}

export function parseAuthorizedAt(
  value: string | null | undefined
): Date | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

export function authorizationPeriodKey(authorizedAt: Date | null): string {
  return authorizedAt
    ? authorizedAt.toISOString()
    : UNKNOWN_AUTHORIZATION_PERIOD;
}

export function shouldStartOAuthFlow(options: {
  authorizedAt: Date | null;
  now: Date;
  hasRefreshToken: boolean;
  tokenInvalid: boolean;
}): boolean {
  if (!options.hasRefreshToken || options.tokenInvalid) return true;
  if (!options.authorizedAt) return false;
  return isRefreshTokenNearExpiry(options.authorizedAt, options.now);
}

export function shouldSendExpiryPing(options: {
  authorizedAt: Date | null;
  now: Date;
  tokenInvalid: boolean;
  pingedFor: string | null;
}): boolean {
  const period = authorizationPeriodKey(options.authorizedAt);
  if (options.pingedFor === period) return false;
  if (options.tokenInvalid) return true;
  if (!options.authorizedAt) return false;
  return isRefreshTokenNearExpiry(options.authorizedAt, options.now);
}

function tokenFingerprint(refreshToken: string): string {
  return createHash("sha256").update(refreshToken).digest("hex");
}

export async function refreshSpotifyAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const fingerprint = tokenFingerprint(refreshToken);
  if (rejectedRefreshTokens.has(fingerprint)) {
    throw new SpotifyRefreshError(
      "Spotify refresh token has expired; reauthorization is required",
      "invalid_grant"
    );
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${clientId}:${clientSecret}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = (await response.json()) as SpotifyTokenResponse;
  if (!response.ok || !data.access_token) {
    if (data.error === "invalid_grant") {
      rejectedRefreshTokens.add(fingerprint);
      throw new SpotifyRefreshError(
        "Spotify refresh token has expired; reauthorization is required",
        "invalid_grant"
      );
    }

    throw new SpotifyRefreshError(
      `Spotify token refresh failed (${data.error ?? response.status})`,
      "token_error"
    );
  }

  return data.access_token;
}

export async function resolveRefreshToken(
  store: SpotifyAuthStore | null = getSpotifyAuthStore(),
  env: NodeJS.ProcessEnv = process.env
): Promise<string | null> {
  try {
    const stored = store ? await store.getRefreshToken() : null;
    if (stored) return stored;
  } catch (error) {
    console.error(
      "Failed to read Spotify refresh token from Redis",
      error instanceof Error ? error.message : "unknown error"
    );
  }

  return env.SPOTIFY_REFRESH_TOKEN ?? null;
}

export async function resolveAuthorizedAt(
  store: SpotifyAuthStore | null = getSpotifyAuthStore(),
  env: NodeJS.ProcessEnv = process.env
): Promise<Date | null> {
  try {
    const stored = store ? await store.getAuthorizedAt() : null;
    const fromStore = parseAuthorizedAt(stored);
    if (fromStore) return fromStore;
  } catch (error) {
    console.error(
      "Failed to read Spotify authorized_at from Redis",
      error instanceof Error ? error.message : "unknown error"
    );
  }

  return parseAuthorizedAt(env.SPOTIFY_AUTHORIZED_AT);
}

export type AuthorizeDecision =
  | { action: "still_valid" }
  | { action: "start_oauth" }
  | { action: "unavailable" };

export async function evaluateAuthorizeRequest(options: {
  now?: Date;
  store?: SpotifyAuthStore | null;
  env?: NodeJS.ProcessEnv;
  refresh?: typeof refreshSpotifyAccessToken;
} = {}): Promise<AuthorizeDecision> {
  const now = options.now ?? new Date();
  const env = options.env ?? process.env;
  const store =
    options.store !== undefined ? options.store : getSpotifyAuthStore(env);
  const refreshToken = await resolveRefreshToken(store, env);
  const authorizedAt = await resolveAuthorizedAt(store, env);

  if (refreshToken && authorizedAt && !isRefreshTokenNearExpiry(authorizedAt, now)) {
    return { action: "still_valid" };
  }

  if (
    shouldStartOAuthFlow({
      authorizedAt,
      now,
      hasRefreshToken: Boolean(refreshToken),
      tokenInvalid: false,
    })
  ) {
    return { action: "start_oauth" };
  }

  if (
    !refreshToken ||
    !env.SPOTIFY_CLIENT_ID ||
    !env.SPOTIFY_CLIENT_SECRET
  ) {
    return { action: "start_oauth" };
  }

  try {
    await (options.refresh ?? refreshSpotifyAccessToken)(
      env.SPOTIFY_CLIENT_ID,
      env.SPOTIFY_CLIENT_SECRET,
      refreshToken
    );
    return { action: "still_valid" };
  } catch (error) {
    if (error instanceof SpotifyRefreshError && error.code === "invalid_grant") {
      return { action: "start_oauth" };
    }
    console.error(
      "Spotify authorize probe failed",
      error instanceof Error ? error.message : "unknown error"
    );
    return { action: "unavailable" };
  }
}

export async function persistSpotifyAuthorization(
  refreshToken: string,
  authorizedAt: Date,
  store: SpotifyAuthStore | null = getSpotifyAuthStore()
): Promise<boolean> {
  if (!store) return false;
  try {
    await store.saveAuthorization(refreshToken, authorizedAt.toISOString());
    return true;
  } catch (error) {
    console.error(
      "Failed to persist Spotify authorization",
      error instanceof Error ? error.message : "unknown error"
    );
    return false;
  }
}

export async function notifySpotifyReauthorization(
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  await sendTelegramMessage(SPOTIFY_REAUTH_TELEGRAM_MESSAGE, env);
}

export function isAuthorizedCronRequest(
  request: Request,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return (
    Boolean(request.headers.get("x-vercel-cron")) ||
    hasValidBearerToken(request.headers.get("authorization"), env.CRON_SECRET)
  );
}

export async function runSpotifyExpiryCron(options: {
  now?: Date;
  store?: SpotifyAuthStore | null;
  env?: NodeJS.ProcessEnv;
  refresh?: typeof refreshSpotifyAccessToken;
  sendTelegram?: (text: string, env?: NodeJS.ProcessEnv) => Promise<boolean>;
} = {}): Promise<{ ok: true; action: "noop" | "pinged" }> {
  const now = options.now ?? new Date();
  const env = options.env ?? process.env;
  const store =
    options.store !== undefined ? options.store : getSpotifyAuthStore(env);
  const refreshToken = await resolveRefreshToken(store, env);
  const authorizedAt = await resolveAuthorizedAt(store, env);
  const pingedFor = store ? await store.getExpiryPingedFor() : null;
  const period = authorizationPeriodKey(authorizedAt);

  if (pingedFor === period) {
    return { ok: true, action: "noop" };
  }

  let tokenInvalid = !refreshToken;
  if (
    refreshToken &&
    env.SPOTIFY_CLIENT_ID &&
    env.SPOTIFY_CLIENT_SECRET
  ) {
    try {
      await (options.refresh ?? refreshSpotifyAccessToken)(
        env.SPOTIFY_CLIENT_ID,
        env.SPOTIFY_CLIENT_SECRET,
        refreshToken
      );
    } catch (error) {
      if (error instanceof SpotifyRefreshError && error.code === "invalid_grant") {
        tokenInvalid = true;
      } else {
        console.error(
          "Spotify expiry probe failed",
          error instanceof Error ? error.message : "unknown error"
        );
      }
    }
  }

  if (
    !shouldSendExpiryPing({
      authorizedAt,
      now,
      tokenInvalid,
      pingedFor,
    })
  ) {
    return { ok: true, action: "noop" };
  }

  const sent = await (options.sendTelegram ?? sendTelegramMessage)(
    SPOTIFY_EXPIRY_TELEGRAM_MESSAGE,
    env
  );
  if (!sent) return { ok: true, action: "noop" };

  if (store) {
    await store.markExpiryPinged(period);
  }

  return { ok: true, action: "pinged" };
}
