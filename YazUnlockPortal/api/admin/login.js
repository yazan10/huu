const { createSessionCookie, hasSameOrigin, passwordMatches, secrets } = require("../../lib/admin-auth");
const { parseBody } = require("../../lib/serials");

module.exports = async function login(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!hasSameOrigin(req)) return res.status(403).json({ error: "forbidden" });

  try {
    secrets();
    const body = parseBody(req);
    if (!passwordMatches(body.password)) {
      return res.status(401).json({ error: "invalid_credentials" });
    }
    res.setHeader("Set-Cookie", createSessionCookie());
    return res.status(200).json({ authenticated: true });
  } catch (error) {
    console.error("Admin login unavailable:", error.message);
    return res.status(503).json({ error: "admin_auth_unavailable" });
  }
};
