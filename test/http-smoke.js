"use strict";
// Chạy sau kiểm thử UI trên test/ui-server.js; không dùng máy chủ production.
const assert = require("node:assert/strict");
(async () => {
  const base = "http://127.0.0.1:7790", state = await (await fetch(base + "/api/office")).json();
  assert.equal(state.runtime.scheduler, false);
  const content = state.jobs.find((j) => j.title === "Bài viết ngắn hơn"); assert.equal(content.deletedAt, null); assert.equal(content.status, "cancelled"); assert.equal(content.reviewNote, "Giữ ý chính, bỏ câu mở đầu dài."); assert.equal(content.history.length, 1);
  const banner = state.jobs.find((j) => j.title === "Banner thử nghiệm" && !j.parentJobId), transfer = state.jobs.find((j) => j.parentJobId === banner.id);
  assert.equal(transfer.employeeId, "ninh"); assert.equal(transfer.brief, "Tối ưu banner cho website"); assert.equal(transfer.reviewNote, "Giữ màu vàng, ưu tiên xem trên điện thoại.");
  assert.equal(state.employees.find((e) => e.name === "Nhân viên kiểm thử").prompt, "Prompt đã cập nhật.\nChỉ trả kết quả, không giải thích dài.");
  const rules = await (await fetch(base + "/api/office/rules")).json(); assert.match(rules.content, /Luôn kiểm tra sản phẩm/);
  const url = base + `/api/office/jobs/${banner.id}/preview?name=banner.svg`;
  let r = await fetch(url); assert.equal(r.status, 200); assert.match(r.headers.get("content-type"), /image\/svg\+xml/); assert.match(r.headers.get("content-disposition"), /^inline/); assert.match(r.headers.get("content-security-policy"), /sandbox/); assert.match(await r.text(), /LIFESPORT/);
  r = await fetch(url, { headers: { range: "bytes=0-5" } }); assert.equal(r.status, 206); assert.equal((await r.arrayBuffer()).byteLength, 6);
  r = await fetch(url, { headers: { range: "bytes=999999-" } }); assert.equal(r.status, 416);
  r = await fetch(base + `/api/office/jobs/${banner.id}/preview?name=../../access.json`); assert.equal(r.status, 404);
  r = await fetch(url, { headers: { "x-forwarded-for": "198.51.100.9" } }); assert.equal(r.status, 401);
  r = await fetch(base + "/api/office/employees", { method: "POST", headers: { "content-type": "application/json", "x-office-request": "1", origin: "https://untrusted.example" }, body: "{}" }); assert.equal(r.status, 403);
  console.log("PASS: UI persisted edits, transfer notes, redo history, trash restore, employee prompts, rules, inline preview, byte ranges, traversal/auth/CSRF checks");
})().catch((e) => { console.error(e); process.exitCode = 1; });
