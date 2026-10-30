"use strict";
// macOS: chạy văn phòng khi đăng nhập, tự khởi động lại nếu tiến trình lỗi.
const fs = require("fs"), os = require("os"), path = require("path"), { execFileSync } = require("child_process");
if (process.platform !== "darwin") { console.error("Script này dành cho macOS. Hệ khác chạy npm start bằng trình quản lý dịch vụ của máy."); process.exit(1); }
const root = path.resolve(__dirname, ".."), label = "vn.lifesport.marketing-office", domain = `gui/${process.getuid()}`;
const file = path.join(os.homedir(), "Library", "LaunchAgents", label + ".plist");
const xml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
if (process.argv.includes("--remove")) {
  try { execFileSync("launchctl", ["bootout", domain + "/" + label]); } catch {}
  if (fs.existsSync(file)) fs.unlinkSync(file); console.log("Đã gỡ dịch vụ văn phòng; mã nguồn và dữ liệu vẫn còn."); process.exit(0);
}
if (fs.existsSync(file)) { console.error("Dịch vụ đã có. Dùng launchctl kickstart -k " + domain + "/" + label + " để khởi động lại."); process.exit(1); }
const data = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array><string>${xml(process.execPath)}</string><string>${xml(path.join(root, "server.js"))}</string></array>
<key>WorkingDirectory</key><string>${xml(root)}</string>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer>
<key>EnvironmentVariables</key><dict><key>PATH</key><string>${xml(process.env.PATH)}</string><key>TZ</key><string>Asia/Ho_Chi_Minh</string></dict>
<key>StandardOutPath</key><string>${xml(path.join(root, "server.log"))}</string>
<key>StandardErrorPath</key><string>${xml(path.join(root, "server.log"))}</string>
</dict></plist>`;
fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data, { mode: 0o600 });
try { execFileSync("launchctl", ["bootstrap", domain, file], { stdio: "inherit" }); console.log("Đã cài dịch vụ: " + label + ". Văn phòng tự chạy khi anh đăng nhập macOS."); }
catch (e) { console.error("Đã ghi plist nhưng chưa nạp được dịch vụ: " + file); process.exitCode = 1; }
