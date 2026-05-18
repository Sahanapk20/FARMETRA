const crypto = require("crypto");

function sha256(obj) {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash("sha256").update(str).digest("hex");
}

module.exports = { sha256 };
