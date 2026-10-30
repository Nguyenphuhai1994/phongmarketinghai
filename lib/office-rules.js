"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const fail = (message, status) => Object.assign(new Error(message), { status });
function readRules(dataDir) {
  const file = path.join(dataDir, "NOI-QUY.md"); let content = "";
  try { if (!fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) throw fail("Tệp nội quy không hợp lệ", 400); content = fs.readFileSync(file, "utf8"); } catch (e) { if (e.code !== "ENOENT") throw e; }
  return { content, revision: crypto.createHash("sha256").update(content).digest("hex"), file: "NOI-QUY.md" };
}
function saveRules(dataDir, body) {
  if (typeof body.content !== "string" || !body.content.trim() || body.content.length > 100000) throw fail("Nội quy cần có nội dung, tối đa 100.000 ký tự", 400);
  const current = readRules(dataDir);
  if (body.revision !== current.revision) throw fail("Nội quy đã được thay đổi ở nơi khác. Tải bản mới trước khi lưu.", 409);
  const history = path.join(dataDir, "control", "rules-history"); fs.mkdirSync(history, { recursive: true });
  fs.writeFileSync(path.join(history, `${Date.now()}-${crypto.randomUUID()}.md`), current.content, { mode: 0o600 });
  const file = path.join(dataDir, "NOI-QUY.md");
  fs.writeFileSync(file + ".tmp", body.content, { mode: 0o600 }); fs.renameSync(file + ".tmp", file);
  return readRules(dataDir);
}
module.exports = { readRules, saveRules };
