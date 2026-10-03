const { hasSameOrigin, hasValidSession } = require("../../lib/admin-auth");
const { ensureSchema, getSql, normalizeSerial, parseBody } = require("../../lib/serials");

module.exports = async function serials(req, res) {
  try {
    if (!hasValidSession(req)) return res.status(401).json({ error: "unauthorized" });
  } catch (error) {
    console.error("Admin session unavailable:", error.message);
    return res.status(503).json({ error: "admin_auth_unavailable" });
  }

  if (req.method === "GET") {
    try {
      const sql = getSql();
      await ensureSchema(sql);
      const requestedPage = Number.parseInt(req.query.page || "0", 10);
      const page = Number.isInteger(requestedPage) && requestedPage >= 0 ? requestedPage : 0;
      const pageSize = 100;
      const rows = await sql`
        SELECT serial, created_at
        FROM registered_serials
        ORDER BY created_at DESC, serial ASC
        LIMIT ${pageSize + 1}
        OFFSET ${page * pageSize}
      `;
      return res.status(200).json({
        serials: rows.slice(0, pageSize),
        page,
        hasMore: rows.length > pageSize
      });
    } catch (error) {
      console.error("Admin serial list failed:", error.message);
      return res.status(503).json({ error: "serial_list_unavailable" });
    }
  }

  if (req.method === "DELETE") {
    if (!hasSameOrigin(req)) return res.status(403).json({ error: "forbidden" });
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
      const removed = await sql`
        DELETE FROM registered_serials
        WHERE serial = ${serial}
        RETURNING serial
      `;
      return res.status(200).json({ deleted: removed.length > 0 });
    } catch (error) {
      console.error("Admin serial deletion failed:", error.message);
      return res.status(503).json({ error: "serial_delete_unavailable" });
    }
  }

  res.setHeader("Allow", "GET, DELETE");
  return res.status(405).json({ error: "method_not_allowed" });
};
