"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
// Chỉ khôi phục ký tự điều khiển được dán trực tiếp trong chuỗi JSON; không đoán dấu ngoặc/dấu nháy.
function readStore(file) {
  const source = fs.readFileSync(file, "utf8");
  try { return JSON.parse(source); } catch (original) {
    let quoted = false, escaped = false, fixed = "";
    for (const c of source) {
      if (quoted && c.charCodeAt(0) < 32) { fixed += JSON.stringify(c).slice(1, -1); escaped = false; continue; }
      fixed += c;
      if (escaped) { escaped = false; continue; }
      if (quoted && c === "\\") escaped = true;
      else if (c === '"') quoted = !quoted;
    }
    let state; try { state = JSON.parse(fixed); } catch { throw original; }
    const backup = path.join(path.dirname(file), "recovery"); fs.mkdirSync(backup, { recursive: true });
    fs.writeFileSync(path.join(backup, `jobs-invalid-${Date.now()}-${crypto.randomUUID()}.json.bak`), source, { mode: 0o600 });
    return state;
  }
}
module.exports = { readStore };
