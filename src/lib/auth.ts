export const AUTH_COOKIE = "psk_auth";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export async function passcodeToken(passcode: string): Promise<string> {
  const data = new TextEncoder().encode(passcode);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * The auth cookie's value is independent of *which* valid passcode was
 * entered (shared or named) — it's always this fixed marker, signed with
 * the server-only APP_PASSCODE as a pepper so it can't be self-minted.
 */
export async function sessionToken(): Promise<string> {
  return passcodeToken(`${process.env.APP_PASSCODE ?? ""}:authenticated`);
}
