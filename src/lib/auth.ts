export const AUTH_COOKIE = "psk_auth";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export type AuthRole = "admin" | "member";
export type AuthPayload = { role: AuthRole; communityId?: string };

/** Members only see their own community's sessions; admins see everything. */
export function communityFilter(auth: AuthPayload | null): { communityId?: string | null } {
  return auth?.role === "member" ? { communityId: auth.communityId ?? null } : {};
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function passcodeToken(passcode: string): Promise<string> {
  return sha256Hex(passcode);
}

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "=");
  const binary = atob(withPadding);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function sign(encodedPayload: string): Promise<string> {
  return sha256Hex(`${process.env.APP_PASSCODE ?? ""}:${encodedPayload}`);
}

/**
 * The cookie carries the caller's role (and community, for members),
 * signed with the server-only APP_PASSCODE as a pepper so it can't be
 * self-minted — same trust model as the old fixed-marker token, just with
 * an actual identity payload instead of a single constant string.
 */
export async function makeSessionToken(payload: AuthPayload): Promise<string> {
  const encoded = toBase64Url(JSON.stringify(payload));
  const sig = await sign(encoded);
  return `${encoded}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<AuthPayload | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if ((await sign(encoded)) !== sig) return null;
  try {
    return JSON.parse(fromBase64Url(encoded)) as AuthPayload;
  } catch {
    return null;
  }
}
