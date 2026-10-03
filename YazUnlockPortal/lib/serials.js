const GITHUB_API = "https://api.github.com";
const MAX_FILE_BYTES = 900 * 1024;

function getStoreConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repository = process.env.GITHUB_REPO;
  const file = process.env.GITHUB_DATA_FILE || "YazUnlockPortal/data/serials.json";
  if (!token || !owner || !repository) {
    throw new Error("Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO in Vercel.");
  }
  if (file.startsWith("/") || file.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("GITHUB_DATA_FILE must be a relative path inside the data repository.");
  }
  return { token, owner, repository, file };
}

function getFileUrl({ owner, repository, file }) {
  const encodedFile = file.split("/").map(encodeURIComponent).join("/");
  return `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/contents/${encodedFile}`;
}

function getHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

async function readSerials(config) {
  const response = await fetch(getFileUrl(config), {
    headers: getHeaders(config.token)
  });
  if (!response.ok) {
    throw new Error(`GitHub serial file read failed (${response.status}).`);
  }

  const file = await response.json();
  if (file.encoding !== "base64" || typeof file.content !== "string") {
    throw new Error("GitHub serial file must be smaller than 1 MB and use base64 encoding.");
  }

  let data;
  try {
    data = JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
  } catch {
    throw new Error("GitHub serial file contains invalid JSON.");
  }
  if (!data || !Array.isArray(data.serials)) {
    throw new Error("GitHub serial file must contain a serials array.");
  }

  for (const entry of data.serials) {
    if (!entry || typeof entry.serial !== "string" ||
        typeof entry.created_at !== "string" || !Number.isFinite(Date.parse(entry.created_at))) {
      throw new Error("GitHub serial file contains an invalid record.");
    }
  }
  return { serials: data.serials, sha: file.sha };
}

async function writeSerials(config, serials, sha) {
  const content = Buffer.from(`${JSON.stringify({ serials }, null, 2)}\n`, "utf8");
  if (content.length > MAX_FILE_BYTES) {
    throw new Error("GitHub serial file is nearing the Contents API size limit.");
  }

  const response = await fetch(getFileUrl(config), {
    method: "PUT",
    headers: {
      ...getHeaders(config.token),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Update registered serials",
      content: content.toString("base64"),
      sha
    })
  });
  if (response.status === 409) return false;
  if (!response.ok) {
    throw new Error(`GitHub serial file write failed (${response.status}).`);
  }
  return true;
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

async function listSerials() {
  const config = getStoreConfig();
  const { serials } = await readSerials(config);
  return serials.sort((left, right) =>
    right.created_at.localeCompare(left.created_at) || left.serial.localeCompare(right.serial)
  );
}

async function registerSerial(serial) {
  const config = getStoreConfig();
  const record = { serial, created_at: new Date().toISOString() };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await readSerials(config);
    if (current.serials.some((entry) => entry.serial === serial)) return false;
    if (await writeSerials(config, [...current.serials, record], current.sha)) return true;
  }
  throw new Error("Concurrent GitHub serial updates did not settle after three attempts.");
}

async function deleteSerial(serial) {
  const config = getStoreConfig();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await readSerials(config);
    const serials = current.serials.filter((entry) => entry.serial !== serial);
    if (serials.length === current.serials.length) return false;
    if (await writeSerials(config, serials, current.sha)) return true;
  }
  throw new Error("Concurrent GitHub serial updates did not settle after three attempts.");
}

module.exports = { deleteSerial, listSerials, normalizeSerial, parseBody, registerSerial };
