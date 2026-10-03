const crypto = require("node:crypto");

const COOKIE_NAME = "yaz_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;

function secrets() {
  const password = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;
  if (!password || password.length < 4) {
    throw new Error("Set ADMIN_PASSWORD to a secret with at least 4 characters.");
  }
  if (!sessionSecret || Buffer.byteLength(sessionSecret, "utf8") < 32) {
    throw new Error("Set SESSION_SECRET to a random value of at least 32 bytes.");
  }
  return { password, sessionSecret };
}

function safeEqual(left, right) {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sign(expiresAt, secret) {
  return crypto.createHmac("sha256", secret).update(expiresAt).digest("base64url");
}

function createSessionCookie() {
  const { sessionSecret } = secrets();
  const expiresAt = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const token = `${expiresAt}.${sign(expiresAt, sessionSecret)}`;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

function hasValidSession(req) {
  const { sessionSecret } = secrets();
  const cookies = (req.headers.cookie || "").split(";").map((item) => item.trim());
  const entry = cookies.find((item) => item.startsWith(`${COOKIE_NAME}=`));
  if (!entry) return false;
  const token = entry.slice(COOKIE_NAME.length + 1);
  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature || !/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;
  return safeEqual(signature, sign(expiresAt, sessionSecret));
}

function hasSameOrigin(req) {
  const host = req.headers.host;
  if (!host) return false;
  const origin = req.headers.origin;
  const referer = req.headers.referer || req.headers.referrer;
  // بعض المتصفحات لا ترسل Origin في طلبات same-origin، فنقبل Referer كبديل.
  // ونقبل أيضاً Sec-Fetch-Site: same-origin كدليل إضافي.
  const fetchSite = req.headers["sec-fetch-site"];
  const candidate = origin || referer;
  if (candidate) {
    try {
      if (new URL(candidate).host === host) return true;
    } catch {
      return false;
    }
    return false;
  }
  if (fetchSite === "same-origin" || fetchSite === "same-site") return true;
  return false;
}

function passwordMatches(candidate) {
  const { password } = secrets();
  return typeof candidate === "string" && safeEqual(candidate, password);
}

module.exports = {
  COOKIE_NAME,
  createSessionCookie,
  hasSameOrigin,
  hasValidSession,
  passwordMatches,
  secrets
};
