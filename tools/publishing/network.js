"use strict";
const https = require("https"), dns = require("dns").promises, net = require("net");
function publicAddress(ip) {
  const v = net.isIP(ip);
  if (v === 4) {
    const [a,b] = ip.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0,168].includes(b)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && [18,19,51].includes(b)) || (a === 203 && b === 0));
  }
  return v === 6 && /^[23][0-9a-f]{0,3}:/i.test(ip) && !/^(2001:db8:|2001:0*:|2002:)/i.test(ip);
}
async function request(url, { method = "GET", headers = {}, body } = {}) {
  const target = new URL(url);
  if (target.protocol !== "https:" || target.username || target.password || (target.port && target.port !== "443")) throw Object.assign(new Error("Kênh đăng cần HTTPS cổng chuẩn, không kèm thông tin đăng nhập trong URL"), { status: 400 });
  const addresses = await dns.lookup(target.hostname, { all: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address))) throw Object.assign(new Error("Không được kết nối kênh tới địa chỉ mạng nội bộ"), { status: 400 });
  const pinned = addresses.find(a=>a.family===4) || addresses[0];
  return new Promise((resolve, reject) => {
    const req = https.request(target, { method, headers: { "User-Agent": "LifesportOffice/1.0", Accept: "application/json", ...headers, ...(body ? { "Content-Length": body.length } : {}) }, lookup(host, options, callback) { callback(null, options?.all ? [pinned] : pinned.address, pinned.family); } }, (res) => {
      const chunks = []; let length = 0;
      res.on("data", (b) => { length += b.length; if (length > 2 * 1024 * 1024) { res.destroy(); reject(new Error("Phản hồi nền tảng quá lớn")); } else chunks.push(b); });
      res.on("end", () => { let data = null; try { data = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch {} resolve({ status: res.statusCode, data }); });
      res.on("error", reject);
    });
    req.setTimeout(body?.length > 1024 * 1024 ? 120000 : 30000, () => req.destroy(new Error("Kết nối nền tảng quá thời gian")));
    req.on("error", reject); if (body) req.write(body); req.end();
  });
}
module.exports = { request, publicAddress };
