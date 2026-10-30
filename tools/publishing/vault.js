"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), crypto = require("crypto"), { execFileSync } = require("child_process");
function createVault(dataDir, keyProvider) {
  const dir = path.join(dataDir, "control"), file = path.join(dir, "channel-vault.json"); let key;
  function getKey(create = false) {
    if (key) return key;
    if (keyProvider) return key = keyProvider();
    if (process.platform !== "darwin") throw new Error("Kho kết nối hiện cần macOS Keychain");
    const service = "vn.lifesport.office." + crypto.createHash("sha256").update(path.resolve(dataDir)).digest("hex").slice(0, 20), account = os.userInfo().username;
    let encoded;
    try { encoded = execFileSync("/usr/bin/security", ["find-generic-password", "-a", account, "-s", service, "-w"], { encoding: "utf8", timeout: 10000 }).trim(); }
    catch (e) {
      if (!create || e.status !== 44 || fs.existsSync(file)) throw new Error("Không mở được kho kết nối. Kiểm tra quyền truy cập macOS Keychain.");
      encoded = crypto.randomBytes(32).toString("base64");
      try { execFileSync("/usr/bin/security", ["add-generic-password", "-a", account, "-s", service, "-w", encoded], { stdio: "pipe", timeout: 10000 }); }
      catch { throw new Error("Không lưu được khoá mã hoá vào macOS Keychain"); }
    }
    key = Buffer.from(encoded, "base64"); if (key.length !== 32) throw new Error("Khoá kết nối không hợp lệ"); return key;
  }
  function read() {
    if (!fs.existsSync(file)) return {};
    const entry = JSON.parse(fs.readFileSync(file, "utf8")), decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(entry.iv, "base64"));
    decipher.setAuthTag(Buffer.from(entry.tag, "base64")); return JSON.parse(Buffer.concat([decipher.update(Buffer.from(entry.body, "base64")), decipher.final()]).toString("utf8"));
  }
  function put(id, value) {
    const records = read(); if (value === null) delete records[id]; else records[id] = value;
    const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv("aes-256-gcm", getKey(true), iv), body = Buffer.concat([cipher.update(JSON.stringify(records), "utf8"), cipher.final()]);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file + ".tmp", JSON.stringify({ iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), body: body.toString("base64") }), { mode: 0o600 }); fs.renameSync(file + ".tmp", file);
  }
  return { get: (id) => read()[id], put };
}
module.exports = { createVault };
