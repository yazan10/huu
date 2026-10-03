const { ensureSchema, getSql, normalizeSerial, parseBody } = require("../../lib/serials");

module.exports = async function check(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  let serial;
  try {
    serial = normalizeSerial(parseBody(req).serial);
  } catch {
    return res.status(400).json({ error: "invalid_request" });
  }
  if (!serial) return res.status(400).json({ error: "invalid_serial" });

  try {
    const sql = getSql();
    await ensureSchema(sql);
    const rows = await sql`
      SELECT serial
      FROM registered_serials
      WHERE serial = ${serial}
      LIMIT 1
    `;
    return res.status(200).json({ registered: rows.length > 0 });
  } catch (error) {
    console.error("Serial check failed:", error.message);
    return res.status(503).json({ error: "verification_unavailable" });
  }
};
