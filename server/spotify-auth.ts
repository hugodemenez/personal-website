import { createHash } from "node:crypto";
import { hasValidBearerToken } from "@/server/location-data";
import {
  SPOTIFY_EXPIRY_TELEGRAM_MESSAGE,
  SPOTIFY_REAUTH_TELEGRAM_MESSAGE,
  sendTelegramMessage,
} from "@/server/telegram";
import {
  persistVercelEnvAndRedeploy,
  type VercelEnvWrites,
} from "@/server/vercel-env";

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

export type PersistEnv = (
  vars: VercelEnvWrites,
  env?: NodeJS.ProcessEnv
) => Promise<boolean>;

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

export function resolveRefreshToken(
  env: NodeJS.ProcessEnv = process.env
): string | null {
  return env.SPOTIFY_REFRESH_TOKEN ?? null;
}

export function resolveAuthorizedAt(
  env: NodeJS.ProcessEnv = process.env
): Date | null {
  return parseAuthorizedAt(env.SPOTIFY_AUTHORIZED_AT);
}

export type AuthorizeDecision =
  | { action: "still_valid" }
  | { action: "start_oauth" }
  | { action: "unavailable" };

export async function evaluateAuthorizeRequest(options: {
  now?: Date;
  env?: NodeJS.ProcessEnv;
  refresh?: typeof refreshSpotifyAccessToken;
} = {}): Promise<AuthorizeDecision> {
  const now = options.now ?? new Date();
  const env = options.env ?? process.env;
  const refreshToken = resolveRefreshToken(env);
  const authorizedAt = resolveAuthorizedAt(env);

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

  if (!refreshToken || !env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
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
  options: {
    env?: NodeJS.ProcessEnv;
    persistEnv?: PersistEnv;
  } = {}
): Promise<boolean> {
  const persist = options.persistEnv ?? persistVercelEnvAndRedeploy;
  return persist(
    {
      SPOTIFY_REFRESH_TOKEN: refreshToken,
      SPOTIFY_AUTHORIZED_AT: authorizedAt.toISOString(),
    },
    options.env ?? process.env
  );
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
  env?: NodeJS.ProcessEnv;
  refresh?: typeof refreshSpotifyAccessToken;
  sendTelegram?: (text: string, env?: NodeJS.ProcessEnv) => Promise<boolean>;
  persistEnv?: PersistEnv;
} = {}): Promise<{ ok: true; action: "noop" | "pinged" }> {
  const now = options.now ?? new Date();
  const env = options.env ?? process.env;
  const refreshToken = resolveRefreshToken(env);
  const authorizedAt = resolveAuthorizedAt(env);
  const pingedFor = env.SPOTIFY_EXPIRY_PINGED_FOR ?? null;
  const period = authorizationPeriodKey(authorizedAt);

  if (pingedFor === period) {
    return { ok: true, action: "noop" };
  }

  let tokenInvalid = !refreshToken;
  if (refreshToken && env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET) {
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

  const persist = options.persistEnv ?? persistVercelEnvAndRedeploy;
  await persist({ SPOTIFY_EXPIRY_PINGED_FOR: period }, env);

  return { ok: true, action: "pinged" };
}
