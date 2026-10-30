"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function local(req) {
  let hostname; try { hostname = new URL("http://" + req.headers.host).hostname; } catch { return false; }
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname) && /^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(req.socket.remoteAddress || "") &&
    !["cf-ray", "cf-connecting-ip", "forwarded", "x-forwarded-for", "x-forwarded-host"].some((h) => req.headers[h]);
}
function writeAllowed(req) {
  if (req.headers["x-office-request"] !== "1") return false;
  try { return !req.headers.origin || new URL(req.headers.origin).host === req.headers.host; } catch { return false; }
}
async function readBody(req, limit = 64000) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > limit) throw Object.assign(new Error("Nội dung quá dài"), { status: 413 });
  }
  try { return JSON.parse(body || "{}"); } catch { throw Object.assign(new Error("JSON không hợp lệ"), { status: 400 }); }
}
const loginPage = (message = "Đăng nhập để điều hành văn phòng") => `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Đăng nhập văn phòng</title><body style="background:#080b10;color:#eee;font:16px system-ui;display:grid;place-items:center;min-height:95vh"><form method="post" action="/office/login" style="display:grid;gap:16px;max-width:340px;padding:24px"><h1 style="font-size:24px">Phòng marketing Lifesport</h1><p>${message}</p><label for="password">Mật khẩu văn phòng</label><input id="password" name="password" type="password" required autocomplete="current-password" style="font:inherit;padding:12px"><button style="font:inherit;padding:12px">Đăng nhập</button></form></body></html>`;

function createAuth(dataDir, legacyKey = "") {
  const file = path.join(dataDir, "control", "access.json");
  let credential = null;
  try { credential = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { if (e.code !== "ENOENT") throw e; }
  const sessions = new Map(), failures = new Map();
  function setPassword(password) {
    if (typeof password !== "string" || password.length < 12 || password.length > 256) throw Object.assign(new Error("Mật khẩu cần từ 12 đến 256 ký tự"), { status: 400 });
    const salt = crypto.randomBytes(16).toString("hex");
    credential = { salt, hash: crypto.scryptSync(password, salt, 64).toString("hex") };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + ".tmp", JSON.stringify(credential), { mode: 0o600 });
    fs.renameSync(file + ".tmp", file);
    sessions.clear();
  }
  if (!credential && legacyKey) {
    const salt = crypto.randomBytes(16).toString("hex");
    credential = { salt, hash: crypto.scryptSync(legacyKey, salt, 64).toString("hex") };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(credential), { mode: 0o600 });
  }
  function authenticated(req) {
    if (local(req)) return true;
    const token = (req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith("office_session="))?.slice(15);
    const expiry = sessions.get(token);
    if (!expiry || expiry < Date.now()) { sessions.delete(token); return false; }
    return true;
  }
  async function gate(req, res, url) {
    if (url.pathname === "/office/login" && req.method === "POST") {
      if (req.headers.origin) {
        try { if (new URL(req.headers.origin).host !== req.headers.host) { res.writeHead(403); res.end(); return false; } } catch { res.writeHead(403); res.end(); return false; }
      }
      const ip = req.socket.remoteAddress || "unknown";
      const recent = (failures.get(ip) || []).filter((t) => t > Date.now() - 600000);
      if (recent.length >= 8) { res.writeHead(429, { "Content-Type": "text/html; charset=utf-8" }); res.end(loginPage("Thử lại sau 10 phút.")); return false; }
      let body = "";
      for await (const chunk of req) { body += chunk; if (body.length > 2048) { res.writeHead(413); res.end(); return false; } }
      const password = new URLSearchParams(body).get("password") || "";
      const hash = credential && crypto.scryptSync(password, credential.salt, 64);
      if (!credential || !crypto.timingSafeEqual(hash, Buffer.from(credential.hash, "hex"))) {
        recent.push(Date.now()); failures.set(ip, recent);
        res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" }); res.end(loginPage("Mật khẩu không đúng hoặc chưa được thiết lập trên máy nhà.")); return false;
      }
      failures.delete(ip);
      for (const [key, expiry] of sessions) if (expiry < Date.now()) sessions.delete(key);
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, Date.now() + 12 * 3600000);
      const secure = req.socket.encrypted || req.headers["x-forwarded-proto"] === "https";
      res.writeHead(303, { Location: "/giaoviec.html", "Set-Cookie": `office_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${secure ? "; Secure" : ""}`, "Cache-Control": "no-store" }); res.end(); return false;
    }
    if (url.pathname === "/office/logout" && req.method === "POST") {
      if (!writeAllowed(req)) { res.writeHead(403); res.end(); return false; }
      const token = (req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith("office_session="))?.slice(15);
      sessions.delete(token);
      res.writeHead(200, { "Set-Cookie": "office_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0", "Content-Type": "application/json" }); res.end('{"ok":true}'); return false;
    }
    if (authenticated(req)) return true;
    res.writeHead(401, { "Content-Type": url.pathname.startsWith("/api/") ? "application/json" : "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(url.pathname.startsWith("/api/") ? JSON.stringify({ error: "Cần đăng nhập", login: true }) : loginPage()); return false;
  }
  return { gate, setPassword, configured: () => !!credential };
}
module.exports = { createAuth, local, writeAllowed, readBody };
