"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { EventEmitter } = require("events");
const { PassThrough } = require("stream");
const { createDispatcher } = require("../lib/dispatcher");
const { createAuth, local, writeAllowed } = require("../lib/office-auth");

function fixture(t, publishing = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lifesport-test-"));
  let now = Date.parse("2026-10-29T10:00:00Z"); const children = [];
  const cfg = { staff: [{ roster: true, key: "trinh", name: "Trinh content", role: "Viết content", room: "claude" }, { roster: true, key: "nhi", name: "Nhi design", role: "Thiết kế", room: "claude" }] };
  const auth = createAuth(root);
  const spawnProcess = (bin, args, options) => {
    const c = new EventEmitter(); c.stdin = new PassThrough(); c.stdout = new PassThrough(); c.stderr = new PassThrough(); c.kill = () => setImmediate(() => c.emit("close", null));
    children.push({ c, bin, args, options }); return c;
  };
  const make = () => createDispatcher({ root, dataDir: root, cfg, auth, spawnProcess, clock: () => now, publishing });
  const d = make(); t.after(async () => { d.stop(); await new Promise((r) => setImmediate(r)); fs.rmSync(root, { recursive: true, force: true }); });
  const body = { title: "Chiến dịch Lifesport", brief: "Viết nội dung và thiết kế ảnh", employeeIds: ["trinh", "nhi"], startAt: "2026-10-29T18:00:00+07:00", dueAt: "2026-10-30T18:00:00+07:00" };
  return { root, d, body, children, make, auth, advance: (n) => { now += n; } };
}
function complete(child, result = "Đã tạo nội dung") {
  const manifest = path.join(child.options.cwd, "ban-giao-luot-1.json");
  if (!fs.existsSync(manifest)) fs.writeFileSync(manifest, JSON.stringify({ status: "ready", transfers: [] }));
  child.c.stdout.write(JSON.stringify({ type: "thread.started", thread_id: "session-trinh" }) + "\n");
  child.c.stdout.write(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: result } }) + "\n");
  child.c.stdout.write(JSON.stringify({ type: "turn.completed" }) + "\n"); child.c.emit("close", 0);
}
test("lịch, nhiều người, chạy tuần tự, trả kết quả và duyệt", (t) => {
  const f = fixture(t), jobs = f.d.createJobs(f.body);
  assert.equal(jobs.length, 2); assert.equal(jobs[0].campaignId, jobs[1].campaignId);
  assert.equal(jobs[0].startAt, "2026-10-29T11:00:00.000Z");
  f.d.tick(); assert.equal(f.children.length, 0);
  f.advance(3600000); f.d.tick(); f.d.tick(); assert.equal(f.children.length, 1);
  assert(f.children[0].args.includes("workspace-write")); assert(!f.children[0].args.includes("--dangerously-bypass-approvals-and-sandbox"));
  complete(f.children[0]);
  assert.equal(f.d.view().jobs.find((j) => j.id === jobs[0].id).status, "review");
  assert.equal(f.d.forSession("session-trinh").name, "Trinh content");
  f.d.action(jobs[0].id, "approve"); assert.equal(f.d.view().jobs.find((j) => j.id === jobs[0].id).status, "completed");
  f.d.tick(); assert.equal(f.children.length, 2); complete(f.children[1]);
});
test("tự giao việc theo người nhận và chép đúng nội dung làm đầu vào bất biến", (t) => {
  const f = fixture(t); const [parent] = f.d.createJobs({ ...f.body, startAt: null, employeeIds: ["trinh"] }); f.d.tick();
  const cwd = f.children[0].options.cwd;
  fs.writeFileSync(path.join(cwd, "bai-viet.txt"), "Nội dung của Trinh");
  fs.writeFileSync(path.join(cwd, "ban-giao-luot-1.json"), JSON.stringify({ status: "ready", transfers: [{ employeeId: "nhi", title: "Thiết kế theo bài viết", brief: "Dùng bài-viet.txt để thiết kế" }] }));
  complete(f.children[0]);
  const p = f.d.view().jobs.find((j) => j.id === parent.id), child = f.d.view().jobs.find((j) => j.parentJobId === p.id);
  assert.equal(p.status, "handed_off"); assert.equal(child.status, "queued"); assert.equal(child.employeeId, "nhi"); assert.equal(child.campaignId, p.campaignId);
  assert.equal(child.inputSources[0].name, "Trinh content");
  fs.writeFileSync(path.join(cwd, "bai-viet.txt"), "Đã bị sửa sau khi chuyển");
  f.d.tick(); const received = path.join(f.children[1].options.cwd, child.inputSources[0].folder, "bai-viet.txt");
  assert.equal(fs.readFileSync(received, "utf8"), "Nội dung của Trinh");
  complete(f.children[1], "Đã tạo thiết kế");
  assert.equal(f.d.view().jobs.find((j) => j.id === child.id).status, "review");
  assert.throws(() => f.d.action(p.id, "retry"));
});
test("chuỗi chọn sẵn chỉ tạo bước kế tiếp khi bước trước thành công, không cần duyệt giữa chừng", (t) => {
  const f = fixture(t); const [parent] = f.d.createJobs({ ...f.body, startAt: null, mode: "sequence" });
  assert.equal(f.d.view().jobs.length, 1); f.d.tick(); complete(f.children[0]);
  assert.equal(f.d.view().jobs.length, 2);
  const child = f.d.view().jobs.find((j) => j.parentJobId === parent.id); assert.equal(child.employeeId, "nhi");
  f.d.tick(); complete(f.children[1]); assert.equal(f.d.view().jobs.find((j) => j.id === child.id).status, "review");
  const restored = f.make(); assert.equal(restored.view().jobs.length, 2); assert.equal(restored.view().jobs.find((j) => j.id === parent.id).status, "handed_off"); restored.stop();
});
test("thiếu công cụ hoặc bàn giao không hợp lệ dừng chuỗi, không tạo việc con", (t) => {
  for (const manifest of [
    { status: "blocked", reason: "Chưa có công cụ tạo ảnh", transfers: [] },
    { status: "ready", transfers: [{ employeeId: "khong-co", title: "a", brief: "b" }] },
    { status: "ready", transfers: [{ employeeId: "trinh", title: "Tự giao", brief: "Không được" }] },
    { status: "ready", transfers: [{ employeeId: "nhi", title: "a", brief: "b" }, { employeeId: "khong-co", title: "a", brief: "b" }] },
  ]) {
    const f = fixture(t); f.d.createJobs({ ...f.body, startAt: null, employeeIds: ["trinh"] }); f.d.tick();
    fs.writeFileSync(path.join(f.children[0].options.cwd, "ban-giao-luot-1.json"), JSON.stringify(manifest)); complete(f.children[0]);
    assert.equal(f.d.view().jobs.length, 1); assert.equal(f.d.view().jobs[0].status, "blocked");
  }
});
test("không đọc lại tệp bàn giao của lượt cũ và không giao trùng khi Codex phát close hai lần", (t) => {
  const f = fixture(t); const [p] = f.d.createJobs({ ...f.body, startAt: null, employeeIds: ["trinh"] }); f.d.tick();
  complete(f.children[0]); f.d.action(p.id, "retry"); f.d.tick(); complete(f.children[1]);
  assert.equal(f.d.view().jobs[0].status, "blocked");
  f.d.action(p.id, "retry"); f.d.tick();
  fs.writeFileSync(path.join(f.children[2].options.cwd, "ban-giao-luot-3.json"), JSON.stringify({ status: "ready", transfers: [{ employeeId: "nhi", title: "Thiết kế", brief: "Theo nội dung" }] }));
  complete(f.children[2]); f.children[2].c.emit("close", 0); assert.equal(f.d.view().jobs.length, 2);
});
test("không tự chuyển việc khi đã tắt quyền bàn giao", (t) => {
  const f = fixture(t); f.d.createJobs({ ...f.body, startAt: null, employeeIds: ["trinh"], autoHandoff: false }); f.d.tick();
  fs.writeFileSync(path.join(f.children[0].options.cwd, "ban-giao-luot-1.json"), JSON.stringify({ status: "ready", transfers: [{ employeeId: "nhi", title: "Thiết kế", brief: "Theo nội dung" }] }));
  complete(f.children[0]); assert.equal(f.d.view().jobs.length, 1); assert.equal(f.d.view().jobs[0].status, "review");
  assert.throws(() => f.d.createJobs({ ...f.body, mode: "sequence", autoHandoff: false }));
});
test("bàn giao quá nhiều tệp dừng rõ ràng thay vì chép thiếu sản phẩm", (t) => {
  const f = fixture(t); f.d.createJobs({ ...f.body, startAt: null, employeeIds: ["trinh"] }); f.d.tick();
  const cwd = f.children[0].options.cwd;
  for (let i = 0; i < 205; i++) fs.writeFileSync(path.join(cwd, `f-${i}.txt`), "test");
  fs.writeFileSync(path.join(cwd, "ban-giao-luot-1.json"), JSON.stringify({ status: "ready", transfers: [{ employeeId: "nhi", title: "Thiết kế", brief: "Dùng đầu vào" }] }));
  complete(f.children[0]); assert.equal(f.d.view().jobs.length, 1); assert.equal(f.d.view().jobs[0].status, "blocked"); assert.match(f.d.view().jobs[0].error, /200 tệp/);
});
test("chuỗi nhiều bước truyền được cả tệp từ các bước trước và dừng vòng lặp", (t) => {
  const f = fixture(t); f.d.createJobs({ ...f.body, startAt: null, employeeIds: ["trinh"] });
  for (let i = 0; i < 7; i++) {
    f.d.tick(); const c = f.children[i];
    fs.writeFileSync(path.join(c.options.cwd, `san-pham-${i}.txt`), `Bước ${i}`);
    fs.writeFileSync(path.join(c.options.cwd, "ban-giao-luot-1.json"), JSON.stringify({ status: "ready", transfers: [{ employeeId: i % 2 === 0 ? "nhi" : "trinh", title: "Bước tiếp", brief: "Dùng đầu vào để hoàn thiện" }] }));
    complete(c);
  }
  assert.equal(f.d.view().jobs.length, 7); assert.equal(f.d.view().jobs[0].status, "blocked");
  const incoming = f.d.files(f.d.view().jobs[0].id); assert(incoming.some((f) => f.name.endsWith("san-pham-0.txt")));
});
test("kiểm tra ngày, nhân viên và trạng thái; hạn mục tiêu báo quá hạn", (t) => {
  const f = fixture(t);
  assert.throws(() => f.d.createJobs({ ...f.body, employeeIds: ["missing"] }));
  assert.throws(() => f.d.createJobs({ ...f.body, startAt: "2026-10-30T19:00" }));
  assert.throws(() => f.d.createJobs({ ...f.body, dueAt: "2026-10-29T17:30:00+07:00" }));
  const [j] = f.d.createJobs({ ...f.body, employeeIds: ["trinh", "trinh"] });
  assert.equal(f.d.view().jobs.length, 1);
  assert.throws(() => f.d.action(j.id, "approve"));
  f.advance(3 * 86400000); assert.equal(f.d.view().jobs[0].overdue, true);
});
test("không báo thành công khi Codex lỗi hoặc không có kết quả", (t) => {
  const f = fixture(t); const [j] = f.d.createJobs({ ...f.body, startAt: null, employeeIds: ["trinh"] });
  f.d.tick(); f.children[0].c.emit("error", Object.assign(new Error("missing"), { code: "ENOENT" }));
  assert.equal(f.d.view().jobs[0].status, "failed"); assert.match(f.d.view().jobs[0].error, /Codex CLI/);
  f.d.action(j.id, "retry", { note: "Viết lại ngắn hơn" }); f.d.tick();
  f.children[1].c.emit("close", 0); assert.equal(f.d.view().jobs[0].status, "failed");
});
test("giữ lịch qua khởi động lại và không tự chạy lại việc bị gián đoạn", (t) => {
  const f = fixture(t); f.d.createJobs(f.body);
  const second = f.make(); assert.equal(second.view().jobs[0].status, "scheduled");
  f.advance(3600000); second.tick();
  const restarted = f.make(); assert.equal(restarted.view().jobs.filter((j) => j.status === "interrupted").length, 1);
  assert.equal(restarted.view().jobs.filter((j) => j.status === "scheduled").length, 1);
  complete(f.children[0]); second.stop(); restarted.stop();
});
test("huỷ việc đang chạy; không cho chạy lại trước khi tiến trình đóng", async (t) => {
  const f = fixture(t); const [j] = f.d.createJobs({ ...f.body, startAt: null, employeeIds: ["trinh"] }); f.d.tick();
  f.d.action(j.id, "cancel"); assert.equal(f.d.view().jobs[0].status, "cancelled");
  assert.throws(() => f.d.action(j.id, "retry"));
  await new Promise((r) => setImmediate(r));
  f.d.action(j.id, "retry"); assert.equal(f.d.view().jobs[0].status, "queued");
});
test("chỉ liệt kê sản phẩm, không lấy tệp symlink", (t) => {
  const f = fixture(t); const [j] = f.d.createJobs({ ...f.body, startAt: null, employeeIds: ["trinh"] }); f.d.tick();
  const cwd = f.children[0].options.cwd; fs.writeFileSync(path.join(cwd, "noi-dung.md"), "Nội dung");
  fs.symlinkSync(path.join(f.root, "control", "jobs.json"), path.join(cwd, "secret.json"));
  assert.deepEqual(f.d.files(j.id).map((f) => f.name), ["noi-dung.md"]); complete(f.children[0]);
});
function request(headers = {}, body = "") {
  const req = new PassThrough(); req.socket = { remoteAddress: "127.0.0.1" }; req.headers = { host: "localhost:7788", ...headers }; req.method = "POST"; req.end(body); return req;
}
function response() {
  return { code: null, headers: {}, body: "", writeHead(code, headers = {}) { this.code = code; this.headers = headers; }, end(body) { this.body = body; } };
}
test("chống ghi từ website khác và DNS rebinding; tunnel luôn cần đăng nhập", () => {
  assert.equal(local(request()), true);
  assert.equal(local(request({ host: "attacker.example" })), false);
  assert.equal(local(request({ "x-forwarded-for": "1.2.3.4" })), false);
  assert.equal(writeAllowed(request({ "x-office-request": "1", origin: "https://attacker.example" })), false);
  assert.equal(writeAllowed(request()), false);
  assert.equal(writeAllowed(request({ "x-office-request": "1", origin: "http://localhost:7788" })), true);
});
test("đăng nhập từ xa, cookie, đăng xuất và đổi mật khẩu", async (t) => {
  const f = fixture(t), headers = { host: "office.example", "x-forwarded-for": "1.2.3.4", "x-forwarded-proto": "https" };
  let res = response(); assert.equal(await f.auth.gate(request(headers), res, new URL("http://x/api/office")), false); assert.equal(res.code, 401);
  f.auth.setPassword("lifesport-test-password");
  const credential = fs.readFileSync(path.join(f.root, "control", "access.json"), "utf8"); assert(!credential.includes("lifesport-test-password"));
  res = response(); await f.auth.gate(request(headers, "password=lifesport-test-password"), res, new URL("http://x/office/login")); assert.equal(res.code, 303);
  assert.match(res.headers["Set-Cookie"], /HttpOnly; SameSite=Strict/); assert.match(res.headers["Set-Cookie"], /Secure/);
  const cookie = res.headers["Set-Cookie"].split(";")[0];
  assert.equal(await f.auth.gate(request({ ...headers, cookie }), response(), new URL("http://x/api/office")), true);
  const logout = response(); await f.auth.gate(request({ ...headers, cookie, "x-office-request": "1" }), logout, new URL("http://x/office/logout"));
  assert.equal(await f.auth.gate(request({ ...headers, cookie }), response(), new URL("http://x/api/office")), false);
  assert.throws(() => f.auth.setPassword("short"));
});
test("từ chối và làm lại giữ lịch sử, nhận yêu cầu và ghi chú đã chỉnh", (t) => {
  const f = fixture(t); const [j] = f.d.createJobs({ ...f.body, startAt: null, employeeIds: ["trinh"] }); f.d.tick(); complete(f.children[0], "Bản lần đầu");
  f.d.action(j.id, "reject", { note: "Nội dung quá dài" }); assert.equal(f.d.view().jobs[0].status, "rejected");
  f.d.action(j.id, "retry", { title: "Bài ngắn", brief: "Viết 80 từ", note: "Giữ đúng thông điệp, giảm độ dài" });
  const revised = f.d.view().jobs[0]; assert.equal(revised.title, "Bài ngắn"); assert.equal(revised.brief, "Viết 80 từ"); assert.equal(revised.reviewNote, "Giữ đúng thông điệp, giảm độ dài"); assert.equal(revised.history[0].result, "Bản lần đầu");
  f.d.tick(); assert.equal(f.children.length, 2); complete(f.children[1]);
});
test("chuyển người khác có ghi chú và snapshot sản phẩm; không giao trùng", (t) => {
  const f = fixture(t); const [j] = f.d.createJobs({ ...f.body, startAt: null, employeeIds: ["trinh"] }); f.d.tick();
  fs.writeFileSync(path.join(f.children[0].options.cwd, "content.md"), "Bài đã viết"); complete(f.children[0]);
  f.d.action(j.id, "transfer", { employeeId: "nhi", title: "Ảnh mới", brief: "Thiết kế theo bài", note: "Dùng màu vàng, không sửa câu chữ" });
  const child = f.d.view().jobs.find((x) => x.parentJobId === j.id); assert.equal(child.employeeId, "nhi"); assert.equal(child.title, "Ảnh mới"); assert.equal(child.reviewNote, "Dùng màu vàng, không sửa câu chữ");
  assert(f.d.files(child.id).some((x) => x.name.endsWith("content.md"))); assert.throws(() => f.d.action(j.id, "transfer", { employeeId: "nhi" }));
});
test("xoá và khôi phục cả chuỗi không tự chạy lại các việc đã huỷ", (t) => {
  const f = fixture(t); const [j] = f.d.createJobs({ ...f.body, startAt: null, mode: "sequence" }); f.d.tick(); complete(f.children[0]);
  f.d.action(j.id, "delete"); assert.equal(f.d.view().jobs.filter((x) => x.deletedAt).length, 2);
  f.d.tick(); assert.equal(f.children.length, 1); f.d.action(j.id, "restore"); assert.equal(f.d.view().jobs.filter((x) => x.deletedAt).length, 0);
  assert.equal(f.d.view().jobs.find((x) => x.parentJobId).status, "cancelled");
});
test("xoá việc đang chạy không cho sinh việc con sau khi tiến trình kết thúc", async (t) => {
  const f = fixture(t); const [j] = f.d.createJobs({ ...f.body, startAt: null, mode: "sequence" }); f.d.tick(); f.d.action(j.id, "delete");
  complete(f.children[0]); await new Promise((r) => setImmediate(r)); assert.equal(f.d.view().jobs.length, 1); assert(f.d.view().jobs[0].deletedAt); assert.equal(f.d.view().jobs[0].status, "cancelled");
});
test("thêm/sửa nhân viên và prompt nhiều dòng, chống ghi đè bản mới", (t) => {
  const f = fixture(t), e = f.d.saveEmployee({ name: "Nhân mới", role: "Chuyên viên", prompt: "Dòng 1\nDòng 2\nChỉ trả kết quả" });
  const updated = f.d.saveEmployee({ name: "Nhân mới", role: "Chuyên viên web", prompt: "Prompt mới", revision: e.revision }, e.id); assert.equal(updated.prompt, "Prompt mới");
  assert.throws(() => f.d.saveEmployee({ name: "Nhân mới", role: "Cũ", prompt: "Bản cũ", revision: e.revision }, e.id), /Tải lại/);
  assert.throws(() => f.d.saveEmployee({ name: "Trinh content", role: "Trùng tên" }));
  const restored = f.make(); assert.equal(restored.view().employees.find((x) => x.id === e.id).prompt, "Prompt mới"); restored.stop();
});
test("nội quy lưu qua vp, giữ bản cũ, phát hiện sửa đồng thời và được đưa vào lượt làm việc", (t) => {
  const f = fixture(t), rules = require("../lib/office-rules"), { execFileSync } = require("child_process"); const old = rules.readRules(f.root);
  const result = JSON.parse(execFileSync(process.execPath, [path.resolve(__dirname, "../tools/vp.js"), "noiquy", "luu"], { input: JSON.stringify({ content: "# Nội quy mới\nChỉ trả kết quả.", revision: old.revision }), encoding: "utf8", env: { ...process.env, VP_DATA: f.root } }));
  assert.match(result.content, /Chỉ trả kết quả/); assert.equal(fs.readdirSync(path.join(f.root, "control/rules-history")).length, 1);
  assert.throws(() => rules.saveRules(f.root, { content: "Đè nội quy", revision: old.revision }), /Tải bản mới/);
  const p = f.d.view().employees.find((e) => e.id === "trinh"); f.d.saveEmployee({ ...p, prompt: "Bạn là Trinh chuyên nghiệp" }, p.id);
  f.d.createJobs({ ...f.body, startAt: null, employeeIds: ["trinh"] }); f.d.tick();
  const prompt = f.children[0].c.stdin.read().toString(); assert.match(prompt, /Bạn là Trinh chuyên nghiệp/); assert.match(prompt, /Chỉ trả kết quả/); complete(f.children[0]);
});
test("khôi phục JSON bị dán prompt nhiều dòng mà không làm mất nội dung", (t) => {
  const f = fixture(t), file = path.join(f.root, "broken.json"), { readStore } = require("../lib/office-store");
  fs.writeFileSync(file, '{"role":"Dòng một\nDòng hai","jobs":[]}'); const restored = readStore(file); assert.equal(restored.role, "Dòng một\nDòng hai");
  assert(fs.readdirSync(path.join(f.root, "recovery")).length); fs.writeFileSync(file, '{"role": thiếu nháy}'); assert.throws(() => readStore(file));
});
test("định dạng preview và byte range để xem video, không chạy mã văn bản", () => {
  const { previewType, byteRange } = require("../lib/artifact-preview"); assert.equal(previewType("banner.svg"), "image/svg+xml"); assert.equal(previewType("a.js"), "text/plain; charset=utf-8"); assert.equal(previewType("secret.exe"), null);
  assert.deepEqual(byteRange("bytes=5-9", 20), { start: 5, end: 9 }); assert.deepEqual(byteRange("bytes=-5", 20), { start: 15, end: 19 }); assert.deepEqual(byteRange("bytes=15-", 20), { start: 15, end: 19 });
  assert.equal(byteRange("bytes=30-40", 20), null); assert.equal(byteRange("bytes=4-1", 20), null); assert.equal(byteRange("bytes=0-2,4-6", 20), null);
});

async function stage(f, name, bytes = Buffer.from("Tài liệu từ Hải")) {
  const { Readable } = require("stream");
  const req = Readable.from([bytes]); req.headers = { "x-file-name": encodeURIComponent(name), "x-office-request": "1", "content-length": String(bytes.length), host: "localhost" };
  req.method = "POST"; req.socket = { remoteAddress: "127.0.0.1" };
  let response, status;
  await f.d.handle(req, { headersSent: false, writeHead(code) { status = code; }, end(data) { response = JSON.parse(data); } }, new URL("http://localhost/api/office/uploads"));
  assert.equal(status, 201, JSON.stringify(response)); return response.attachment;
}
test("tệp nhiều định dạng đi qua giao việc, ghi chú, làm lại và chuyển người cùng snapshot", async (t) => {
  const f = fixture(t), attachments = [];
  for (const name of ["ảnh mẫu.png", "video.mp4", "hướng dẫn.pdf", "tài liệu.zip"]) attachments.push(await stage(f, name));
  const [j] = f.d.createJobs({ ...f.body, startAt: null, employeeIds: ["trinh"], attachmentIds: attachments.map((a) => a.id) });
  assert.equal(f.d.files(j.id).length, 4);
  for (const a of j.attachments) assert.equal(fs.readFileSync(path.join(f.root, "control/work", j.id, a.path), "utf8"), "Tài liệu từ Hải");
  f.d.tick(); assert(f.children[0].c.stdin.read().toString().includes("ảnh mẫu.png")); complete(f.children[0]);
  const note = await stage(f, "ghi-chu.txt"); f.d.action(j.id, "note", { note: "Giữ đúng màu", attachmentIds: [note.id] });
  const edit = await stage(f, "lam-lai.txt"); f.d.action(j.id, "retry", { note: "Sửa theo tệp", attachmentIds: [edit.id] });
  f.d.tick(); const prompt = f.children[1].c.stdin.read().toString(); assert(prompt.includes("Giữ đúng màu")); assert(prompt.includes("lam-lai.txt"));
  fs.writeFileSync(path.join(f.children[1].options.cwd, "ban-giao-luot-2.json"), JSON.stringify({ status: "ready", transfers: [] })); complete(f.children[1]);
  const transfer = await stage(f, "mau-moi.txt"); f.d.action(j.id, "transfer", { employeeId: "nhi", note: "Thêm ảnh", attachmentIds: [transfer.id] });
  const child = f.d.view().jobs.find((x) => x.parentJobId === j.id); assert(child);
  assert(f.d.files(child.id).some((x) => x.name.endsWith("mau-moi.txt"))); assert(f.d.files(child.id).some((x) => x.name.endsWith("ảnh mẫu.png")));
  fs.writeFileSync(path.join(f.root, "control/work", j.id, j.attachments[0].path), "Thay đổi sau bàn giao");
  const copy = f.d.files(child.id).find((x) => x.name.endsWith("ảnh mẫu.png")); assert.equal(fs.readFileSync(path.join(f.root, "control/work", child.id, copy.name), "utf8"), "Tài liệu từ Hải");
});
test("tải tệp chặn đường dẫn, quá dung lượng và tham chiếu giả; không tạo việc khi tệp lỗi", async (t) => {
  const f = fixture(t), { createUploads, MAX_FILE } = require("../lib/office-uploads"), u = createUploads(path.join(f.root, "control"));
  const { Readable } = require("stream");
  for (const name of ["../secret", "a/b.txt", "a\\b.txt", ".hidden"]) {
    const req = Readable.from(["x"]); req.headers = { "x-file-name": encodeURIComponent(name) }; await assert.rejects(u.receive(req));
  }
  const req = Readable.from(["x"]); req.headers = { "x-file-name": "large.mp4", "content-length": String(MAX_FILE + 1) }; await assert.rejects(u.receive(req), /250 MB/);
  assert.throws(() => f.d.createJobs({ ...f.body, attachmentIds: ["../../etc/passwd"] })); assert.equal(f.d.view().jobs.length, 0);
  const file = await stage(f, "file.txt"); const target = path.join(f.root, "control/uploads", file.id, "body"); fs.unlinkSync(target); fs.symlinkSync(__filename, target);
  assert.throws(() => f.d.createJobs({ ...f.body, attachmentIds: [file.id] })); assert.equal(f.d.view().jobs.length, 0);
});
test("quyền mạng bật rõ theo cấu hình nhưng giữ sandbox ghi trong workspace", (t) => {
  const f = fixture(t); const cfg = { workerNetworkAccess: true, staff: [] };
  const d = createDispatcher({ root: f.root, dataDir: f.root, cfg, auth: f.auth, spawnProcess: (bin, args) => {
    assert(args.includes("sandbox_workspace_write.network_access=true")); assert(args.includes("workspace-write")); assert(!args.includes("danger-full-access"));
    const c = new EventEmitter(); c.stdin = new PassThrough(); c.stdout = new PassThrough(); c.stderr = new PassThrough(); c.kill = () => {}; setImmediate(() => c.emit("close", 1)); return c;
  } });
  d.createJobs({ ...f.body, startAt: null, employeeIds: ["trinh"] }); d.tick(); assert.equal(d.view().runtime.permissions.network, true); d.stop();
});
test('các phiên trước khi làm lại và thư mục việc vẫn ánh xạ đúng nhân viên', (t) => {
 const f=fixture(t);const [j]=f.d.createJobs({...f.body,startAt:null,employeeIds:['trinh']});f.d.tick();complete(f.children[0]);f.d.action(j.id,'retry');f.d.tick();
 assert.equal(f.d.forSession('session-trinh').id,'trinh');assert.equal(f.d.forWorkDir(f.children[0].options.cwd).id,'trinh');assert.equal(f.d.forWorkDir(path.join(f.children[0].options.cwd,'dinh-kem')).id,'trinh');
 assert.equal(f.d.forWorkDir(f.children[0].options.cwd+'-fake'),null);assert.equal(f.d.forWorkDir('/etc'),null);
});
test('lưu quyền từng kênh cho nhân viên, chống kênh giả và đưa quyền vào prompt', t => {
 const f=fixture(t),channels=require('../lib/office-channels');channels.saveChannels(f.root,{revision:channels.readChannels(f.root).revision,channels:[{id:'web',name:'Web',platform:'website',url:'https://site.example/'}]});
 const e=f.d.view().employees.find(e=>e.id==='trinh');const updated=f.d.saveEmployee({...e,channelPermissions:{web:'publish'}},e.id);assert.equal(updated.channelPermissions.web,'publish');
 assert.throws(()=>f.d.saveEmployee({...updated,channelPermissions:{fake:'publish'}},e.id));
 f.d.createJobs({...f.body,startAt:null,employeeIds:['trinh']});f.d.tick();const prompt=f.children[0].c.stdin.read().toString();assert(prompt.includes('"permission":"publish"'));assert(!prompt.includes('applicationPassword'));
});
test('từ công việc nhân viên tới API đăng và link kết quả: máy chủ lấy đúng quyền chủ giao', async t => {
 let sent=0;const f=fixture(t,{keyProvider:()=>Buffer.alloc(32,3),request:async(url,options={})=>String(url).includes('users/me')?{status:200,data:{id:1,name:'Writer',capabilities:{publish_posts:true}}}:(sent++,{status:201,data:{id:55,status:'publish',link:'https://site.example/post/55'}})});
 const channels=require('../lib/office-channels');channels.saveChannels(f.root,{revision:channels.readChannels(f.root).revision,channels:[{id:'web',name:'Web',platform:'website',url:'https://site.example/',username:'writer'}]});
 const e=f.d.view().employees.find(e=>e.id==='trinh');f.d.saveEmployee({...e,channelPermissions:{web:'publish'}},e.id);await f.d.publisher.connect('web',{applicationPassword:'TEST_ONLY'});
 const [j]=f.d.createJobs({...f.body,startAt:null,employeeIds:['trinh']});f.d.tick();fs.writeFileSync(path.join(f.children[0].options.cwd,'dang-bai-luot-1.json'),JSON.stringify({posts:[{channelId:'web',employeeId:'nhi',title:'Bài',content:'Nội dung',files:[]}]}));complete(f.children[0]);
 assert.equal(f.d.publisher.list()[0].employeeId,'trinh');await f.d.publisher.tick();assert.equal(sent,1);assert.equal(f.d.view().jobs.find(x=>x.id===j.id).publications[0].url,'https://site.example/post/55');
});
test('xoá nhiều việc có bước bàn giao, không xoá trùng; khôi phục từng nhóm độc lập',t=>{
 const f=fixture(t),[parent,other]=f.d.createJobs({...f.body,startAt:null});f.d.tick();complete(f.children[0]);f.d.action(parent.id,'transfer',{employeeId:'nhi'});const child=f.d.view().jobs.find(j=>j.parentJobId===parent.id);
 const result=f.d.deleteJobs([parent.id,child.id,other.id],[parent.id,child.id,other.id]);assert.equal(result.selectedCount,3);assert.equal(result.affectedCount,3);assert(f.d.view().jobs.every(j=>j.deletedAt));
 f.d.action(parent.id,'restore');const jobs=f.d.view().jobs;assert(!jobs.find(j=>j.id===parent.id).deletedAt);assert(!jobs.find(j=>j.id===child.id).deletedAt);assert(jobs.find(j=>j.id===other.id).deletedAt);assert.equal(jobs.find(j=>j.id===child.id).status,'cancelled');
});
test('xoá hàng loạt kiểm tra toàn bộ trước khi ghi, từ chối mã sai và chuỗi thay đổi sau xác nhận',t=>{
 const f=fixture(t),[parent]=f.d.createJobs({...f.body,startAt:null,employeeIds:['trinh']});f.d.tick();complete(f.children[0]);
 assert.throws(()=>f.d.deleteJobs([parent.id,'missing'],[parent.id]));assert(!f.d.view().jobs[0].deletedAt);
 f.d.action(parent.id,'transfer',{employeeId:'nhi'});assert.throws(()=>f.d.deleteJobs([parent.id],[parent.id]),/thay đổi/);assert(f.d.view().jobs.every(j=>!j.deletedAt));
 const expected=f.d.view().jobs.map(j=>j.id);const result=f.d.deleteJobs([parent.id],expected);assert.equal(result.affectedCount,2);assert.throws(()=>f.d.deleteJobs([parent.id],expected));
});
test('xoá nhiều việc đang chạy và đang chờ không sinh bước mới khi tiến trình kết thúc',t=>{
 const f=fixture(t),jobs=f.d.createJobs({...f.body,startAt:null});f.d.tick();const result=f.d.deleteJobs(jobs.map(j=>j.id),jobs.map(j=>j.id));assert.equal(result.affectedCount,2);complete(f.children[0]);assert(f.d.view().jobs.every(j=>j.deletedAt&&j.status==='cancelled'));assert.equal(f.d.view().jobs.length,2);
});

test("góp ý chỉ nhớ khi Hải chọn; lần chạy mới nhận đúng phạm vi và không đổi quyền", (t) => {
  const f=fixture(t),[j]=f.d.createJobs({...f.body,employeeIds:["trinh"],startAt:null,autoHandoff:false});
  f.d.action(j.id,"note",{note:"Chỉ sửa tiêu đề lần này"});assert.equal(f.d.memory.list().length,0);
  f.d.action(j.id,"note",{note:"Dùng câu ngắn, tự nhiên",remember:true});
  const m=f.d.memory.list()[0];assert.equal(m.employeeId,"trinh");assert.equal(m.scope,"employee");
  assert.equal(f.d.memory.selected({...j,employeeId:"nhi"}).length,0);
  f.d.tick();assert.match(f.children[0].c.stdin.read().toString(),/Dùng câu ngắn, tự nhiên/);
  assert.deepEqual(f.d.view().employees.find(e=>e.id==="trinh").channelPermissions,{});
});
test("phạm vi chiến dịch, từ khoá, tạm ngừng, cập nhật có phiên bản và khôi phục", (t) => {
  const f=fixture(t),[j]=f.d.createJobs({...f.body,startAt:null});
  let m=f.d.memory.save({title:"Ảnh khai trương",content:"Dùng nền sáng",kind:"lesson",scope:"campaign",campaignId:j.campaignId,keywords:"ảnh, banner"});
  assert.equal(f.d.memory.selected(j).length,1);
  assert.equal(f.d.memory.selected({...j,campaignId:"khac"}).length,0);
  assert.equal(f.d.memory.selected({...j,title:"Khác",brief:"Không khớp"}).length,0);
  assert.throws(()=>f.d.memory.save({...m,content:"Ghi đè",revision:"cu"},m.id),/đã thay đổi/);
  m=f.d.memory.save({...m,enabled:false},m.id);assert.equal(f.d.memory.selected(j).length,0);
  m=f.d.memory.save({...m,enabled:true},m.id);f.d.memory.remove(m.id,m.revision);assert.equal(f.d.memory.list().length,0);assert.equal(f.d.memory.list(true).length,1);
  m=f.d.memory.list(true)[0];m=f.d.memory.restore(m.id,m.revision);assert.equal(m.enabled,false);assert.equal(f.d.memory.selected(j).length,0);
});
test("duyệt không tự học; lưu mẫu có chủ ý giữ tệp bất biến qua lần sửa việc gốc", (t) => {
  const f=fixture(t),[j]=f.d.createJobs({...f.body,employeeIds:["trinh"],startAt:null,autoHandoff:false});f.d.tick();
  const folder=f.children[0].options.cwd;fs.writeFileSync(path.join(folder,"bai.md"),"Bản tốt");complete(f.children[0],"Báo cáo tốt");
  f.d.action(j.id,"approve");assert.equal(f.d.memory.list().length,0);
  const job=f.d.view().jobs.find(x=>x.id===j.id);
  const m=f.d.memory.save({title:"Mẫu tốt",content:"Tham khảo giọng viết",scope:"employee",employeeId:"trinh",kind:"example"},null,job);
  assert.equal(m.sample,"Báo cáo tốt");fs.writeFileSync(path.join(folder,"bai.md"),"Bản đã sửa");
  assert.equal(fs.readFileSync(f.d.memory.artifact(m.id,"bai.md").target,"utf8"),"Bản tốt");
  assert.throws(()=>f.d.memory.artifact(m.id,"../../jobs.json"),/Không có tệp/);
  f.d.action(j.id,"retry",{note:"Thử lại"});assert.equal(f.d.memory.list()[0].source.attempt,1);
});
test("duyệt kèm mẫu và ghi nhớ khi từ chối; lỗi xác thực không đổi trạng thái công việc", (t) => {
  const f=fixture(t),[j]=f.d.createJobs({...f.body,employeeIds:["trinh"],startAt:null,autoHandoff:false});f.d.tick();complete(f.children[0]);
  assert.throws(()=>f.d.action(j.id,"reject",{remember:true,note:""}),/Nội dung/);assert.equal(f.d.view().jobs[0].status,"review");
  f.d.action(j.id,"reject",{remember:true,note:"Không dùng lời quảng cáo phóng đại",memoryScope:"team"});
  assert.equal(f.d.memory.list()[0].scope,"team");f.d.action(j.id,"retry",{note:"Sửa"});f.d.tick();complete(f.children[1]);
  f.d.action(j.id,"approve",{saveExample:true,exampleContext:"Bài giới thiệu tự nhiên"});
  assert.equal(f.d.memory.list().length,2);assert.equal(f.d.memory.list().find(m=>m.kind==="example").source.jobId,j.id);
});
test("không nhận mẫu chưa duyệt; bộ nhớ giới hạn nội dung và ngừng áp dụng mục đã xoá", (t) => {
  const f=fixture(t),[j]=f.d.createJobs({...f.body,employeeIds:["trinh"],startAt:null});
  assert.throws(()=>f.d.memory.save({title:"Mẫu",content:"Nội dung",scope:"team",kind:"example"},null,j),/Hải duyệt/);
  assert.throws(()=>f.d.memory.save({title:"Mẫu",content:"Nội dung",scope:"team",kind:"example"}),/Chọn công việc/);
  assert.throws(()=>f.d.memory.save({title:"Sai",content:"Nội dung",scope:"employee",employeeId:"khong-co"}),/Chọn nhân viên/);
  for(let i=0;i<25;i++)f.d.memory.save({title:"Hướng dẫn "+i,content:"a".repeat(7900),scope:"team"});
  assert.ok(f.d.memory.prompt(j).length<40000);assert.ok(f.d.memory.selected(j).length<=20);
});
