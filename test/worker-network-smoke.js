"use strict";
// Phiên Codex thật, dữ liệu tạm; không tạo việc trong phòng đang vận hành.
const fs = require("fs"), path = require("path"), os = require("os"), assert = require("assert/strict");
const { createDispatcher } = require("../lib/dispatcher"), { createAuth } = require("../lib/office-auth");
const root = path.resolve(__dirname, ".."), dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifesport-network-"));
const cfg = { ...JSON.parse(fs.readFileSync(path.join(root, "config.json"))), workerNetworkAccess: true, jobTimeoutMinutes: 3,
  staff: [{ key: "network-test", name: "Kiểm tra mạng", role: "Kiểm tra kỹ thuật", roster: true }] };
const d = createDispatcher({ root, dataDir, cfg, auth: createAuth(dataDir) });
const [job] = d.createJobs({ title: "Kiểm tra quyền tải tài nguyên", brief: "Chỉ kiểm tra kỹ thuật: dùng curl tải https://example.com vào network-check.html trong thư mục việc. Không tắt kiểm tra chứng chỉ TLS. Đọc tệp để xác nhận có Example Domain; không chỉ nói đã tải. Không sửa hoặc tải lên dữ liệu nào khác. Trả kết quả ngắn bằng tiếng Việt.", employeeIds: ["network-test"], autoHandoff: false });
d.tick(); const started = Date.now();
const timer = setInterval(() => {
  const current = d.view().jobs[0];
  if (current.status === "running" && Date.now() - started < 195000) return;
  clearInterval(timer); d.stop();
  try {
    assert.equal(current.status, "review", current.error);
    const output = path.join(dataDir, "control/work", job.id, "network-check.html");
    assert.match(fs.readFileSync(output, "utf8"), /Example Domain/);
    console.log(JSON.stringify({ ok: true, permissions: d.view().runtime.permissions, output, result: current.result }, null, 2));
  } catch (e) { console.error(e.message); console.error("Dữ liệu kiểm tra: " + dataDir); process.exitCode = 1; }
}, 1000);
