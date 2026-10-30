"use strict";
const fs = require("fs"), path = require("path");
const TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav", ".ogg": "audio/ogg", ".pdf": "application/pdf", ".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8" };
const TEXT = new Set([".txt", ".md", ".json", ".csv", ".tsv", ".srt", ".vtt", ".js", ".css", ".xml", ".py", ".log"]);
function previewType(name) { const ext = path.extname(name).toLowerCase(); return TYPES[ext] || (TEXT.has(ext) ? "text/plain; charset=utf-8" : null); }
function byteRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header || "");
  if (!m || (!m[1] && !m[2]) || size < 1) return null;
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1] && m[2] ? Math.min(size - 1, Number(m[2])) : size - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start <= end && start < size ? { start, end } : null;
}
function serveArtifact(req, res, target, name, inline) {
  const type = inline ? previewType(name) : "application/octet-stream";
  if (!type) { res.writeHead(415, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify({ error: "Định dạng này chưa có xem trước trực tiếp" })); return; }
  const size = fs.statSync(target).size;
  const headers = { "Content-Type": type, "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(path.basename(name))}`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store", "Accept-Ranges": "bytes" };
  if (inline) headers["Content-Security-Policy"] = "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:";
  let range;
  if (req.headers.range) {
    range = byteRange(req.headers.range, size);
    if (!range) { res.writeHead(416, { ...headers, "Content-Range": `bytes */${size}` }); res.end(); return; }
    headers["Content-Range"] = `bytes ${range.start}-${range.end}/${size}`;
  }
  headers["Content-Length"] = range ? range.end - range.start + 1 : size;
  res.writeHead(range ? 206 : 200, headers);
  const stream = fs.createReadStream(target, range || {}); stream.on("error", () => res.destroy()); res.on("close", () => stream.destroy()); stream.pipe(res);
}
module.exports = { serveArtifact, previewType, byteRange };
