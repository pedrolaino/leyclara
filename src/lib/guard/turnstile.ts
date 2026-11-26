/**
 * Cloudflare Turnstile: captcha invisible y gratuito. Si no hay TURNSTILE_SECRET_KEY
 * (desarrollo), la verificación se saltea.
 */
export async function verifyTurnstile(secret: string | undefined, token: unknown, ip?: string): Promise<boolean> {
  if (!secret) return true;
  if (typeof token !== "string" || !token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "local") body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
