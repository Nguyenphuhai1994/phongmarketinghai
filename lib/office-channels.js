"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
function connectionBinding(c) { return crypto.createHash("sha256").update(JSON.stringify([c.platform,c.url,c.adminUrl || "",c.apiRoot || "",c.username || "",c.pageId || "",c.graphVersion || "v25.0"])).digest("hex"); }
function readConnections(dataDir) { try { return JSON.parse(fs.readFileSync(path.join(dataDir,"control/channel-connections.json"),"utf8")); } catch(e) { if(e.code !== "ENOENT") throw e; return {}; } }
function readChannels(dataDir) {
  const file = path.join(dataDir, "control", "channels.json"); let channels = [];
  try { channels = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { if (e.code !== "ENOENT") throw e; }
  if (!Array.isArray(channels)) throw fail("Sổ kênh đăng không hợp lệ", 500);
  const connections = readConnections(dataDir);
  return { channels: channels.map((c) => { const meta = connections[c.id], connected = meta?.binding === connectionBinding(c) && meta.status === "connected";
    return { ...c, connectionStatus: connected ? "connected" : meta ? "needs_reconnect" : "not_connected", canPublish: !!connected, connectedName: connected ? meta.name : "", verifiedAt: connected ? meta.verifiedAt : null };
  }), revision: crypto.createHash("sha256").update(JSON.stringify(channels)).digest("hex") };
}
function saveChannels(dataDir, body) {
  const current = readChannels(dataDir);
  if (body.revision !== current.revision) throw fail("Danh sách đã thay đổi. Tải lại trước khi lưu.", 409);
  if (!Array.isArray(body.channels) || body.channels.length > 20) throw fail("Tối đa 20 kênh");
  const field = (v, max, required = false) => { if (typeof v !== "string" || v.length > max || (required && !v.trim())) throw fail("Thông tin kênh không hợp lệ"); return v.trim(); };
  const channels = body.channels.map((c) => {
    if (!c || !["facebook", "website"].includes(c.platform)) throw fail("Nền tảng không hợp lệ");
    const id = c.id || crypto.randomUUID(); if (typeof id !== "string" || !/^[a-z0-9-]{1,80}$/.test(id)) throw fail("Mã kênh không hợp lệ");
    let url; try { url = new URL(field(c.url, 1000, true)); } catch { throw fail("Đường dẫn kênh không hợp lệ"); }
    if (url.protocol !== "https:" || url.username || url.password || url.hash || (c.platform === "facebook" && !["facebook.com", "www.facebook.com"].includes(url.hostname))) throw fail("Dùng đường dẫn HTTPS công khai đúng nền tảng, không kèm thông tin đăng nhập");
    for (const key of url.searchParams.keys()) if (/token|secret|password|key|code/i.test(key)) throw fail("Không lưu thông tin đăng nhập trong đường dẫn kênh");
    const facebookKind = c.platform === "facebook" ? c.facebookKind || "unknown" : null;
    if (facebookKind && !["unknown", "page", "profile"].includes(facebookKind)) throw fail("Loại tài khoản Facebook không hợp lệ");
    let adminUrl = "", apiRoot = "", username = "", pageId = "", graphVersion = "v25.0";
    if(c.platform === "website") {
      const base = new URL(url.href); if(!base.pathname.endsWith("/"))base.pathname += "/";
      try { adminUrl = new URL(c.adminUrl || "wp-admin/",base).href; apiRoot = new URL(c.apiRoot || "wp-json/",base).href; } catch { throw fail("Đường dẫn quản trị hoặc REST API không hợp lệ"); }
      for(const candidate of [adminUrl,apiRoot]) { const target = new URL(candidate); if(target.origin !== url.origin || target.username || target.password || target.search || target.hash) throw fail("Đường dẫn quản trị và API phải cùng website, không kèm thông tin đăng nhập"); }
      if(!apiRoot.endsWith("/"))apiRoot += "/";
      username = field(c.username || "",100); if(username.includes(":"))throw fail("Tên đăng nhập không được chứa dấu hai chấm");
    } else {
      pageId = field(c.pageId || url.searchParams.get("id") || "",40); if(pageId && !/^\d+$/.test(pageId))throw fail("Page ID phải là mã số Fanpage");
      graphVersion = field(c.graphVersion || "v25.0",12); if(!/^v[1-9]\d*\.0$/.test(graphVersion))throw fail("Phiên bản Graph API không hợp lệ (ví dụ v25.0)");
    }
    return { id, adminUrl, apiRoot, username, pageId, graphVersion, name: field(c.name, 100, true), platform: c.platform, url: url.href, employeeId: field(c.employeeId || "", 80), purpose: field(c.purpose || "", 4000), facebookKind, publishingPolicy: "employee_permissions" };
  });
  if (new Set(channels.map((c) => c.id)).size !== channels.length || new Set(channels.map((c) => c.url)).size !== channels.length) throw fail("Kênh bị trùng mã hoặc đường dẫn");
  const dir = path.join(dataDir, "control"), file = path.join(dir, "channels.json"); fs.mkdirSync(dir, { recursive: true });
  const history = path.join(dir, "channels-history"); fs.mkdirSync(history, { recursive: true });
  fs.writeFileSync(path.join(history, `${Date.now()}-${crypto.randomUUID()}.json`), JSON.stringify(current.channels, null, 2), { mode: 0o600 });
  fs.writeFileSync(file + ".tmp", JSON.stringify(channels, null, 2) + "\n", { mode: 0o600 }); fs.renameSync(file + ".tmp", file);
  return readChannels(dataDir);
}
function promptChannels(dataDir, employee = {}, attempt = 1) {
  const { channels } = readChannels(dataDir); if (!channels.length) return "";
  const list = channels.map(({id,name,platform,url,canPublish,purpose,employeeId}) => ({id,name,platform,url,purpose,employeeId,connected:canPublish,permission:employee.channelPermissions?.[id] || "none"}));
  return "\nKÊNH ĐĂNG VÀ QUYỀN CỦA BẠN:\n" + JSON.stringify(list) + "\nQuyền none: không được yêu cầu đăng lên kênh này. Quyền review: soạn bài để Hải duyệt; hệ thống chỉ đưa vào hàng chờ duyệt. Quyền publish: được đăng trực tiếp phần việc Hải giao lên đúng kênh đó. Không lấy hoặc đưa mật khẩu/token vào tệp hay báo cáo.\nNếu nhiệm vụ yêu cầu đăng, tạo file dang-bai-luot-" + attempt + ".json với cấu trúc {\"posts\":[{\"channelId\":\"ID kênh\",\"title\":\"Tiêu đề\",\"content\":\"Nội dung văn bản thuần, không HTML\",\"files\":[\"banner.png\"]}]}. Tệp files là sản phẩm thật trong thư mục việc, tối đa 10 tệp/100 MB; Facebook nhận bài chữ, ảnh hoặc 1 video riêng. Chỉ yêu cầu đăng nếu nhiệm vụ của Hải thực sự yêu cầu; không tự đăng báo cáo công việc hoặc nhật ký nội bộ. Máy chủ kiểm tra quyền hiện tại rồi thực hiện, bạn không tự gọi API bằng tài khoản của chủ. Tối đa 5 bài mỗi lượt.\nKhông coi tạo tệp hoặc duyệt kết quả công việc là đã đăng. Kết quả đăng và link bài thật được hiển thị trong mục Kênh đăng. Với review hãy báo đã gửi chờ duyệt; với publish hãy báo đã yêu cầu hệ thống đăng, không bịa link bài.\n";
}
module.exports = { readChannels, saveChannels, promptChannels, connectionBinding, readConnections };
