const { neon } = require("@neondatabase/serverless");

let schemaReady;

function getSql() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("Set DATABASE_URL or POSTGRES_URL in the Vercel project.");
  }
  return neon(connectionString);
}

async function ensureSchema(sql) {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS registered_serials (
        serial TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  }
  await schemaReady;
}

function normalizeSerial(value) {
  if (typeof value !== "string") return null;
  const serial = value.trim().toUpperCase();
  if (serial.length < 3 || serial.length > 128 || !/^[A-Z0-9._-]+$/.test(serial)) {
    return null;
  }
  return serial;
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  return {};
}

module.exports = { ensureSchema, getSql, normalizeSerial, parseBody };
