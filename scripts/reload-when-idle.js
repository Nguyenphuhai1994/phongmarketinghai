"use strict";
// Nạp bản mới một lần khi cả hàng việc rảnh; không dừng báo cáo đang chạy.
const path = require("path"), { execFileSync } = require("child_process");
const root = path.resolve(__dirname, ".."), cfg = require("../lib/config").loadConfig(root);
(async () => {
  const deadline = Date.now() + 15 * 60000;
  while (Date.now() < deadline) {
    const r = await fetch(`http://127.0.0.1:${cfg.port}/api/office`, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) throw new Error("Không đọc được trạng thái văn phòng");
    const state = await r.json();
    if (!state.runtime?.publishingActive && !state.jobs.some((j) => !j.deletedAt && ["running", "queued"].includes(j.status))) {
      execFileSync(process.execPath, [path.join(__dirname, "reload-office.js")], { cwd: root, stdio: "inherit" }); return;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error("Hàng việc chưa rảnh sau 15 phút. Chạy lại reload-when-idle.js để nạp bản mới sau.");
})().catch((e) => { console.error(e.message); process.exitCode = 1; });
