import crypto from "node:crypto";

const secret =
  process.env.YOURS_SESSION_SECRET || "dev-only-change-me-before-public";

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function checkPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const next = crypto.scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return crypto.timingSafeEqual(next, prev);
}

export function signSession(userId) {
  const body = Buffer.from(JSON.stringify({ userId, t: Date.now() })).toString(
    "base64url"
  );
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readSession(cookieHeader) {
  const raw = String(cookieHeader || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("yours="));
  if (!raw) return null;
  const token = raw.slice(6);
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expect = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function setCookie(token) {
  return `yours=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600`;
}

export function clearCookie() {
  return "yours=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}

export function handleOk(h) {
  return /^[a-z][a-z0-9_]{2,23}$/.test(String(h || "").toLowerCase());
}
