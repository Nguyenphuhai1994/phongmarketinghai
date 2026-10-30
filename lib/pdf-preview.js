"use strict";
const fs = require("fs"), { execFile } = require("child_process");
let active = 0;
const cache = new Map(); let cacheBytes = 0;
const failure = (message, status = 400) => Object.assign(new Error(message), { status });
async function run(command, args, maxBuffer) {
  if (active >= 2) throw failure("Đang mở tài liệu khác. Anh thử lại sau vài giây.", 429);
  active++;
  try {
    return await new Promise((resolve, reject) => execFile(command, args, { timeout: 20000, maxBuffer, encoding: "buffer", env: { ...process.env, LC_ALL: "C" } }, (err, out) => err ? reject(failure("Không đọc được PDF. Tệp có thể bị khoá, hỏng hoặc máy thiếu công cụ Poppler.", 422)) : resolve(out)));
  } finally { active--; }
}
async function servePDF(req, res, target, url) {
  const stat = fs.statSync(target), key = `${target}:${stat.mtimeMs}:${stat.size}`;
  if (url.searchParams.has("pdfInfo")) {
    const info = await run("pdfinfo", [target], 1024 * 1024), pages = Number(info.toString().match(/^Pages:\s+(\d+)/m)?.[1]);
    if (!pages) throw failure("Không xác định được số trang PDF", 422);
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify({ pages })); return;
  }
  const page = Number(url.searchParams.get("page"));
  if (!Number.isInteger(page) || page < 1 || page > 10000) throw failure("Số trang PDF không hợp lệ");
  const id = `${key}:${page}`; let png = cache.get(id);
  if (!png) {
    png = await run("pdftoppm", ["-f", String(page), "-l", String(page), "-singlefile", "-scale-to", "1600", "-png", target], 20 * 1024 * 1024);
    if (png[0] !== 137 || png.toString("ascii", 1, 4) !== "PNG") throw failure("Không hiển thị được trang PDF", 422);
    while (cache.size && cacheBytes + png.length > 40 * 1024 * 1024) { const first = cache.keys().next().value; cacheBytes -= cache.get(first).length; cache.delete(first); }
    cache.set(id, png); cacheBytes += png.length;
  }
  res.writeHead(200, { "Content-Type": "image/png", "Content-Length": png.length, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" }); res.end(png);
}
module.exports = { servePDF };
