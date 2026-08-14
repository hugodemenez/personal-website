export const SPOTIFY_AUTHORIZE_URL =
  "https://www.hugodemenez.fr/api/spotify/authorize";

export const SPOTIFY_EXPIRY_TELEGRAM_MESSAGE = [
  "Spotify refresh token is expired or will expire within 14 days.",
  `Reauthorize: ${SPOTIFY_AUTHORIZE_URL}`,
].join("\n");

export const SPOTIFY_REAUTH_TELEGRAM_MESSAGE =
  "Spotify reauthorization succeeded. The new refresh token is stored.";

export async function sendTelegramMessage(
  text: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error("Telegram is not configured");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      }
    );
    if (!response.ok) {
      console.error("Telegram send failed", { status: response.status });
      return false;
    }
    return true;
  } catch (error) {
    console.error(
      "Telegram send failed",
      error instanceof Error ? error.message : "unknown error"
    );
    return false;
  }
}
