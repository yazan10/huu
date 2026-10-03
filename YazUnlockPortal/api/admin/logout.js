const { hasSameOrigin } = require("../../lib/admin-auth");

module.exports = function logout(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!hasSameOrigin(req)) return res.status(403).json({ error: "forbidden" });
  res.setHeader("Set-Cookie", "yaz_admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0");
  return res.status(200).json({ authenticated: false });
};
