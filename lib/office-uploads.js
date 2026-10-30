"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const { pipeline } = require("stream/promises"), { Transform } = require("stream");
const MAX_FILE = 250 * 1024 * 1024, MAX_BATCH = 1024 * 1024 * 1024;
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
function createUploads(dir) {
  const base = path.join(dir, "uploads"); let active = 0;
  async function receive(req) {
    if (active >= 2) throw fail("Đang tải nhiều tệp. Chờ rồi thử lại.", 429);
    let name;
    try { name = decodeURIComponent(req.headers["x-file-name"] || "").normalize("NFC"); } catch { throw fail("Tên tệp không hợp lệ"); }
    if (!name || name.length > 180 || /[\x00-\x1f\x7f/\\]/.test(name) || name.startsWith(".") || name === "..") throw fail("Tên tệp không hợp lệ; dùng tên không quá 180 ký tự");
    if (Number(req.headers["content-length"]) > MAX_FILE) throw fail("Mỗi tệp tối đa 250 MB", 413);
    const id = crypto.randomUUID(), folder = path.join(base, id); let bytes = 0;
    fs.mkdirSync(folder, { recursive: true, mode: 0o700 }); active++;
    try {
      const count = new Transform({ transform(chunk, encoding, callback) { bytes += chunk.length; callback(bytes > MAX_FILE ? fail("Mỗi tệp tối đa 250 MB", 413) : null, chunk); } });
      await pipeline(req, count, fs.createWriteStream(path.join(folder, "body"), { flags: "wx", mode: 0o600 }));
      const item = { id, name, bytes, createdAt: Date.now() };
      fs.writeFileSync(path.join(folder, "meta.json"), JSON.stringify(item), { mode: 0o600 }); return item;
    } catch (e) { fs.rmSync(folder, { recursive: true, force: true }); throw e; }
    finally { active--; }
  }
  function resolve(ids = []) {
    if (!Array.isArray(ids) || ids.length > 20 || new Set(ids).size !== ids.length) throw fail("Tối đa 20 tệp đính kèm mỗi lần");
    const items = ids.map((id) => {
      if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) throw fail("Mã tệp không hợp lệ");
      const folder = path.join(base, id), source = path.join(folder, "body"); let item;
      try {
        if (fs.lstatSync(folder).isSymbolicLink() || !fs.lstatSync(source).isFile() || fs.lstatSync(source).isSymbolicLink()) throw new Error();
        item = JSON.parse(fs.readFileSync(path.join(folder, "meta.json"), "utf8"));
        if (item.id !== id || path.basename(item.name) !== item.name || /[/\\]/.test(item.name)) throw new Error();
        item.bytes = fs.statSync(source).size;
      } catch { throw fail("Tệp đính kèm không còn hợp lệ. Chọn và tải lại tệp.", 404); }
      return { ...item, source };
    });
    if (items.reduce((n, f) => n + f.bytes, 0) > MAX_BATCH) throw fail("Tổng tệp mỗi lần tối đa 1 GB", 413);
    return items;
  }
  function copy(items, destination) {
    return items.map(({ source, ...item }) => {
      const name = `dinh-kem/${item.id}/${item.name}`, target = path.join(destination, name);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const baseReal = fs.realpathSync(destination), parentReal = fs.realpathSync(path.dirname(target));
      if (!parentReal.startsWith(baseReal + path.sep) || (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink())) throw fail("Đường dẫn đính kèm không hợp lệ");
      fs.copyFileSync(source, target); return { ...item, path: name };
    });
  }
  return { receive, resolve, copy };
}
module.exports = { createUploads, MAX_FILE, MAX_BATCH };
