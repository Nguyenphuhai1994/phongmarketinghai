"use strict";
// Nạp bản ứng dụng mới, giữ prompt đã sửa trên đĩa và việc mới nhất do dịch vụ lưu.
const fs = require("fs"), path = require("path"), os = require("os"), crypto = require("crypto"), { execFileSync } = require("child_process");
const { readStore } = require("../lib/office-store"), { loadConfig } = require("../lib/config");
(async () => {
  if (process.platform !== "darwin") throw new Error("Script dành cho dịch vụ macOS");
  const root = path.resolve(__dirname, ".."), cfg = loadConfig(root), file = path.join(cfg.dataDir, "control/jobs.json"), before = readStore(file);
  const url = `http://127.0.0.1:${cfg.port}/api/office`;
  let live;
  try { const r = await fetch(url, { signal: AbortSignal.timeout(2500) }); if (r.ok) live = await r.json(); } catch {}
  if ([...before.jobs, ...(live?.jobs || [])].some((j) => j.status === "running")) throw new Error("Còn công việc đang chạy. Chờ hoàn thành trước khi nạp bản mới.");
  if (live?.runtime?.publishingActive) throw new Error("Còn bài đang gửi/chờ gửi. Chờ hoàn thành trước khi nạp bản mới.");
  const domain = "gui/" + process.getuid(), label = "vn.lifesport.marketing-office";
  try { execFileSync("launchctl", ["bootout", domain + "/" + label], { stdio: "pipe" }); } catch (e) { if (!/No such process|Could not find|not found|No such file/i.test(String(e.stderr))) throw e; }
  const current = readStore(file), history = path.join(cfg.dataDir, "control/recovery"); fs.mkdirSync(history, { recursive: true });
  fs.copyFileSync(file, path.join(history, `jobs-before-reload-${Date.now()}-${crypto.randomUUID()}.json.bak`));
  const merged = new Map(current.employees.map((e) => [e.id, e]));
  for (const e of before.employees) merged.set(e.id, { ...(merged.get(e.id) || {}), ...e });
  current.employees = [...merged.values()];
  fs.writeFileSync(file + ".tmp", JSON.stringify(current, null, 2) + "\n", { mode: 0o600 }); fs.renameSync(file + ".tmp", file);
  const plist = path.join(os.homedir(), "Library/LaunchAgents/" + label + ".plist");
  // launchd có thể chưa giải phóng nhãn ngay sau bootout.
  for (let attempt = 0; ; attempt++) {
    try { execFileSync("launchctl", ["bootstrap", domain, plist], { stdio: "pipe" }); break; }
    catch (e) { if (attempt >= 3) throw e; await new Promise((resolve) => setTimeout(resolve, 750)); }
  }
  let state;
  for (let i = 0; i < 20; i++) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(1000) }); if (r.ok) { state = await r.json(); break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!state) throw new Error("Dịch vụ chưa trả lời. Kiểm tra server.log; dữ liệu và bản sao vẫn được giữ.");
  for (const e of before.employees) {
    const updated = state.employees.find((x) => x.id === e.id), expected = e.prompt || (e.role.length > 300 ? e.role : "");
    if (!updated || (expected && updated.prompt !== expected)) throw new Error("Cần kiểm tra lại prompt: " + e.name);
  }
  console.log(JSON.stringify({ ok: true, employees: state.employees.map((e) => ({ name: e.name, promptChars: e.prompt?.length || 0 })), jobs: state.jobs.length, scheduler: state.runtime.scheduler }, null, 2));
})().catch((e) => { console.error(e.message); process.exitCode = 1; });
