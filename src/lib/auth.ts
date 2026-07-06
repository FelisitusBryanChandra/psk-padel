export const AUTH_COOKIE = "psk_auth";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export async function passcodeToken(passcode: string): Promise<string> {
  const data = new TextEncoder().encode(passcode);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
