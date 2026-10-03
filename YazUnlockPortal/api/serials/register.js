const { normalizeSerial, parseBody, registerSerial } = require("../../lib/serials");

module.exports = async function register(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  let serial;
  try {
    serial = normalizeSerial(parseBody(req).serial);
  } catch {
    return res.status(400).json({ error: "invalid_request" });
  }
  if (!serial) return res.status(400).json({ error: "invalid_serial" });

  try {
    const created = await registerSerial(serial);
    return res.status(201).json({ registered: true, created });
  } catch (error) {
    console.error("Serial registration failed:", error.message);
    return res.status(503).json({ error: "registration_unavailable" });
  }
};
