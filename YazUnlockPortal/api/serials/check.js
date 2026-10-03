const { listSerials, normalizeSerial, parseBody } = require("../../lib/serials");

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
    const serials = await listSerials();
    return res.status(200).json({ registered: serials.some((entry) => entry.serial === serial) });
  } catch (error) {
    console.error("Serial check failed:", error.message);
    return res.status(503).json({ error: "verification_unavailable" });
  }
};
