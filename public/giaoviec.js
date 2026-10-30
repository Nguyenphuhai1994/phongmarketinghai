"use strict";
const $ = (id) => document.getElementById(id);
const labels = { scheduled: "Đã đặt lịch", queued: "Chờ đến lượt", running: "Đang làm", review: "Chờ Hải duyệt", completed: "Đã duyệt", rejected: "Đã từ chối", handed_off: "Đã chuyển đồng nghiệp", blocked: "Bàn giao bị chặn", failed: "Cần kiểm tra", interrupted: "Đã gián đoạn", cancelled: "Đã huỷ" };
let state = null, selectedJob = null, revisionJob = null, refreshing = false, employeeSignature = "";
let selectedOrder = [];
const bulkSelected = new Set(); let visibleJobs = [], reportOpen = new URLSearchParams(location.search).get("report") === "1", bulkBusy = false, filterPeopleSignature = "";
const uploadQueues = new Map();
let pendingAction = "retry", revisionDirty = false;
let confirmCallback = null;
let previewFile = "", fileSignature = "", previewToken = 0, openJobMenus = new Set();
const fmt = (v) => v ? new Date(v).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric", hour12: false }) : "Chưa đặt";
function el(tag, cls, value) { const node = document.createElement(tag); if (cls) node.className = cls; if (value != null) node.textContent = value; return node; }
async function api(url, body) {
  const r = await fetch(url, { method: body === undefined ? "GET" : "POST", headers: { "Content-Type": "application/json", "x-office-request": "1" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: "no-store" });
  let j; try { j = await r.json(); } catch { throw new Error("Không kết nối được máy chủ"); }
  if (r.status === 401) { window.location.assign("/giaoviec.html"); throw new Error("Cần đăng nhập lại"); }
  if (!r.ok) throw new Error(j.error || "Không xử lý được yêu cầu"); return j;
}
function uploadWidget(key) {
  const box = document.querySelector(`[data-uploads="${key}"]`), input = $(key + "-files"), list = box.querySelector("ul");
  const queue = []; uploadQueues.set(key, queue);
  function render() {
    list.replaceChildren(...queue.map((entry) => {
      const row = el("li"), label = el("span", "", entry.file.name + " · " + (entry.file.size / 1048576).toFixed(1) + " MB"), remove = el("button", "text-button", "Bỏ"); remove.type = "button"; remove.disabled = !!entry.busy;
      remove.onclick = () => { queue.splice(queue.indexOf(entry), 1); render(); };
      row.append(label, el("small", entry.error ? "error" : "muted", entry.status || "Chờ tải khi gửi"), remove); return row;
    }));
  }
  input.onchange = () => {
    for (const file of input.files) {
      if (queue.length >= 20) { notify("Tối đa 20 tệp mỗi lần.", true); break; }
      if (file.size > 250 * 1048576 || queue.reduce((n, e) => n + e.file.size, 0) + file.size > 1073741824) { notify("Tệp quá 250 MB hoặc tổng tệp quá 1 GB.", true); continue; }
      queue.push({ file });
    }
    input.value = ""; render(); if (key === "revision") revisionDirty = true;
  };
  queue.render = render; queue.input = input;
}
function clearUploads(key) { const q = uploadQueues.get(key); q.splice(0); q.input.value = ""; q.render(); }
async function sendUploads(key) {
  const queue = uploadQueues.get(key); queue.input.disabled = true;
  try {
    for (const entry of queue) {
      if (entry.attachment) continue;
      entry.busy = true; entry.error = false; entry.status = "Đang tải…"; queue.render();
      try {
        entry.attachment = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest(); xhr.open("POST", "/api/office/uploads"); xhr.setRequestHeader("x-office-request", "1"); xhr.setRequestHeader("x-file-name", encodeURIComponent(entry.file.name)); xhr.setRequestHeader("Content-Type", "application/octet-stream");
          xhr.upload.onprogress = (event) => { if (event.lengthComputable) { entry.status = "Đang tải " + Math.round(event.loaded / event.total * 100) + "%"; queue.render(); } };
          xhr.onload = () => { let data; try { data = JSON.parse(xhr.responseText); } catch { return reject(new Error("Không đọc được phản hồi tải tệp")); } if (xhr.status >= 200 && xhr.status < 300) resolve(data.attachment); else reject(new Error(data.error || "Không tải được tệp")); };
          xhr.onerror = () => reject(new Error("Mất kết nối khi tải tệp. Thử gửi lại.")); xhr.onabort = () => reject(new Error("Đã dừng tải tệp")); xhr.send(entry.file);
        });
        entry.status = "Đã tải";
      } catch (e) { entry.error = true; entry.status = e.message; throw e; }
      finally { entry.busy = false; queue.render(); }
    }
    return queue.map((entry) => entry.attachment.id);
  } finally { queue.input.disabled = false; }
}
for (const key of ["assignment", "revision", "note"]) uploadWidget(key);
function employeeOptions() {
  const signature = JSON.stringify(state.employees.map((e) => [e.id, e.name, e.enabled]));
  if (signature === employeeSignature) return; employeeSignature = signature;
  const selected = new Set([...document.querySelectorAll('input[name="employee"]:checked')].map((n) => n.value));
  const fromLink = new URLSearchParams(location.search).get("employee");
  $("employee-options").replaceChildren();
  for (const e of state.employees.filter((e) => e.enabled)) {
    const label = el("label", "employee-option"), input = el("input"); input.type = "checkbox"; input.name = "employee"; input.value = e.id;
    input.checked = selected.has(e.id) || fromLink === e.id; label.append(input, el("span", "", e.name)); $("employee-options").append(label);
    input.onchange = () => { syncOrder(); renderOrder(); };
  }
  syncOrder(); renderOrder();
}
function syncOrder() {
  const ids = [...document.querySelectorAll('input[name="employee"]:checked')].map((n) => n.value);
  selectedOrder = [...selectedOrder.filter((id) => ids.includes(id)), ...ids.filter((id) => !selectedOrder.includes(id))];
}
function renderOrder() {
  const sequence = $("work-mode").value === "sequence", box = $("handoff-order"); box.replaceChildren(); box.hidden = !sequence;
  $("sequence-builder").hidden = !sequence;
  const add = $("sequence-person"), previous = add.value; add.replaceChildren(el("option", "", "Chọn nhân viên…")); add.firstChild.value = "";
  for (const e of (state?.employees || []).filter((e) => e.enabled && !selectedOrder.includes(e.id))) { const option = el("option", "", e.name); option.value = e.id; add.append(option); }
  if ([...add.options].some((o) => o.value === previous)) add.value = previous;
  $("auto-handoff").disabled = sequence; if (sequence) $("auto-handoff").checked = true;
  if (!sequence) return;
  if (selectedOrder.length < 2) box.append(el("p", "muted", "Chọn ít nhất 2 người để tạo chuỗi bàn giao."));
  for (const [index, id] of selectedOrder.entries()) {
    const row = el("div", "handoff-step"), select = el("select"); select.setAttribute("aria-label", "Người làm bước " + (index + 1));
    for (const e of state.employees.filter((e) => e.enabled && (e.id === id || !selectedOrder.includes(e.id)))) { const option = el("option", "", `${index + 1}. ${e.name}`); option.value = e.id; option.selected = e.id === id; select.append(option); }
    select.onchange = () => { selectedOrder[index] = select.value; applyOrder(); renderOrder(); }; row.append(select);
    for (const [delta, label] of [[-1, "Lên"], [1, "Xuống"]]) {
      const button = el("button", "secondary", label); button.type = "button"; button.disabled = index + delta < 0 || index + delta >= selectedOrder.length;
      button.setAttribute("aria-label", `${label}: ${state.employees.find((e) => e.id === id)?.name}`);
      button.onclick = () => { [selectedOrder[index], selectedOrder[index + delta]] = [selectedOrder[index + delta], selectedOrder[index]]; renderOrder(); }; row.append(button);
    }
    const remove = el("button", "secondary danger", "Bỏ bước"); remove.type = "button"; remove.setAttribute("aria-label", "Bỏ bước " + (index + 1)); remove.onclick = () => { selectedOrder.splice(index, 1); applyOrder(); renderOrder(); }; row.append(remove);
    box.append(row);
  }
}
function applyOrder() { document.querySelectorAll('input[name="employee"]').forEach((n) => { n.checked = selectedOrder.includes(n.value); }); }
function render() {
  openJobMenus = new Set([...document.querySelectorAll('.job-menu[open]')].map((m) => m.dataset.jobId));
  employeeOptions();
  filterPeople();
  const period=$("filter-period").value;
  if(period!=="custom"){const range=OfficeJobs.periodRange(period,state.runtime?.now || Date.now());$("filter-from").value=range.from;$("filter-to").value=range.to;}
  const filter=$("filter").value,options={status:filter,from:$("filter-from").value,to:$("filter-to").value,dateField:$("filter-date-field").value,employeeId:$("filter-person").value};
  let jobs=[];$("filter-error").textContent="";
  try{jobs=OfficeJobs.filterJobs(state.jobs,options);}catch(e){$("filter-error").textContent=e.message;}
  visibleJobs=jobs;
  for(const id of bulkSelected)if(!jobs.some(j=>j.id===id&&!j.deletedAt))bulkSelected.delete(id);
  const liveJobs=jobs.filter(j=>!j.deletedAt);
  const counts = [ ["Đang thực hiện", liveJobs.filter((j) => j.status === "running").length, ""], ["Đã đặt lịch / chờ", liveJobs.filter((j) => ["scheduled", "queued"].includes(j.status)).length, ""], ["Chờ anh duyệt", liveJobs.filter((j) => j.status === "review").length, "review"], ["Đã duyệt", liveJobs.filter((j) => j.status === "completed").length, ""] ];
  $("summary").replaceChildren(...counts.map(([name, n, cls]) => { const d = el("div", "metric " + cls); d.append(el("b", "", n), el("span", "", name)); return d; }));
  const total=state.jobs.filter(j=>filter==="trash"?j.deletedAt:!j.deletedAt).length;
  $("filter-count").textContent=`Hiển thị ${jobs.length} / ${total} công việc · giờ Việt Nam`;
  renderReport(jobs,options);
  renderBulk();
  $("job-list").replaceChildren();
  if (!jobs.length) $("job-list").append(el("p", "empty", state.jobs.length ? "Không có công việc khớp bộ lọc." : "Chưa có công việc. Anh giao chiến dịch đầu tiên ở bên trái."));
  for (const j of jobs) {
    const e = state.employees.find((e) => e.id === j.employeeId), card = el("article", "job"), top = el("div", "job-top"), title = el("div");
    if(!j.deletedAt){const label=el("label","job-select"),input=el("input");input.type="checkbox";input.checked=bulkSelected.has(j.id);input.disabled=bulkBusy;input.setAttribute("aria-label","Chọn việc: "+j.title+" — "+(e?.name||"Nhân viên"));input.onchange=()=>{if(input.checked)bulkSelected.add(j.id);else bulkSelected.delete(j.id);card.classList.toggle("job-selected",input.checked);renderBulk();};label.append(input);top.append(label);card.classList.toggle("job-selected",input.checked);}
    title.className="job-heading";
    title.append(el("div", "person", e?.name || "Nhân viên"), el("h3", "", j.title)); top.append(title, el("span", "badge " + j.status, labels[j.status])); card.append(top);
    card.append(el("p", "job-progress", j.error || j.progress));
    const parent = state.jobs.find((p) => p.id === j.parentJobId);
    if (parent) card.append(el("p", "handoff-source", "↳ Nhận từ " + state.employees.find((e) => e.id === parent.employeeId)?.name + " · bước " + ((j.depth || 0) + 1)));
    if (j.remainingSteps?.length) card.append(el("p", "handoff-source", "Tiếp theo: " + j.remainingSteps.map((id) => state.employees.find((e) => e.id === id)?.name).join(" → ")));
    const dates = el("div", "dates"); dates.append(el("span", "", "Giao: " + fmt(j.createdAt)), el("span", "", "Bắt đầu: " + fmt(j.startAt)), el("span", j.overdue ? "late" : "", (j.overdue ? "Quá hạn: " : "Hạn: ") + fmt(j.dueAt))); card.append(dates);
    const actions = el("div", "actions"); jobActions(actions, j, true);
    card.append(actions); $("job-list").append(card);
  }
  $("password-status").textContent = state.passwordConfigured ? "Đã có mật khẩu. Khi gắn domain, anh đăng nhập bằng mật khẩu này; phiên đăng nhập có hiệu lực 12 giờ." : "Chưa đặt mật khẩu. Truy cập từ xa đang bị chặn; anh đặt mật khẩu trước khi gắn domain.";
  $("password-form").hidden = !state.local; $("logout").hidden = state.local;
  $("team-list").replaceChildren(...state.employees.map((e) => { const n = el("div", "team-member"), link = el("a", "text-button", "Sửa hồ sơ & prompt"); link.href = "nhansu.html?edit=" + encodeURIComponent(e.id); n.append(el("strong", "", e.name), el("p", "", e.role), link); return n; }));
  if (selectedJob && $("details").open) renderDetails();
}
function filterPeople(){
  const signature=JSON.stringify(state.employees.map(e=>[e.id,e.name]));if(signature===filterPeopleSignature)return;filterPeopleSignature=signature;
  const select=$("filter-person"),previous=select.value;select.replaceChildren(el("option","","Tất cả nhân viên"));select.firstChild.value="";
  for(const e of state.employees){const option=el("option","",e.name);option.value=e.id;select.append(option);}if([...select.options].some(o=>o.value===previous))select.value=previous;
}
function renderBulk(){
  const jobs=visibleJobs.filter(j=>!j.deletedAt),count=bulkSelected.size;
  $("bulk-actions").hidden=$("filter").value==="trash";
  $("bulk-all").checked=!!jobs.length&&jobs.every(j=>bulkSelected.has(j.id));$("bulk-all").indeterminate=count>0&&!$("bulk-all").checked;$("bulk-all").disabled=!jobs.length||bulkBusy;
  $("bulk-count").textContent=count?`Đã chọn ${count} / ${jobs.length} việc`:"Chưa chọn việc";
  $("bulk-clear").disabled=!count||bulkBusy;$("bulk-delete").disabled=!count||bulkBusy;$("bulk-delete").textContent=count?`Xoá ${count} việc đã chọn`:"Xoá việc đã chọn";
}
function renderReport(jobs,options){
  const trash=options.status==="trash";$("report-toggle").disabled=trash;$("report-toggle").setAttribute("aria-expanded",String(reportOpen&&!trash));$("report-toggle").textContent=reportOpen&&!trash?"Ẩn báo cáo":"Xem báo cáo";$("job-report").hidden=!reportOpen||trash;if(!reportOpen||trash)return;
  const report=OfficeJobs.reportJobs(jobs,state.employees),s=report.totals,day=v=>v.split("-").reverse().join("/");
  const range=options.from||options.to?`${options.from?day(options.from):"Từ trước"} → ${options.to?day(options.to):"đến nay"}`:"Tất cả thời gian";
  $("report-period").textContent=range+" · "+$("filter-date-field").selectedOptions[0].textContent+" · "+$("filter").selectedOptions[0].textContent+" · "+$("filter-person").selectedOptions[0].textContent;
  $("report-metrics").replaceChildren(...[["Tổng công việc",s.total],["Đã trả kết quả",s.returned],["Chờ Hải duyệt",s.review],["Cần xử lý",s.attention]].map(([label,value])=>{const d=el("div");d.append(el("strong","",value),el("span","",label));return d;}));
  $("report-deadlines").textContent=s.timed?`${s.onTime} việc trả kết quả đúng hạn · ${s.late} việc trả kết quả trễ hạn (tính trên ${s.timed} việc có hạn và ngày kết thúc).`:"Chưa đủ dữ liệu hạn và ngày kết thúc để thống kê đúng/trễ hạn.";
  $("report-people").replaceChildren(...report.employees.map(e=>{const row=el("tr");row.append(el("th","",e.name));row.firstChild.scope="row";for(const value of [e.total,e.returned,e.review,e.approved,e.attention])row.append(el("td","",value));return row;}));
  if(!report.employees.length){const row=el("tr"),cell=el("td","","Không có công việc trong khoảng đã chọn.");cell.colSpan=6;row.append(cell);$("report-people").append(row);}
}
function filterChanged(){bulkSelected.clear();if(state)render();}
$("filter-period").onchange=filterChanged;
for(const id of ["filter-from","filter-to"])$(id).addEventListener("input",()=>{$("filter-period").value="custom";filterChanged();});
for(const id of ["filter-date-field","filter-person"])$(id).onchange=filterChanged;
$("filter-reset").onclick=()=>{$("filter").value="all";$("filter-period").value="all";$("filter-date-field").value="createdAt";$("filter-person").value="";$("filter-from").value=$("filter-to").value="";filterChanged();};
$("report-toggle").onclick=()=>{reportOpen=!reportOpen;if(state)render();};
$("bulk-all").onchange=()=>{bulkSelected.clear();if($("bulk-all").checked)for(const j of visibleJobs)if(!j.deletedAt)bulkSelected.add(j.id);if(state)render();};
$("bulk-clear").onclick=()=>{bulkSelected.clear();if(state)render();};
$("bulk-delete").onclick=()=>{
  const ids=[...bulkSelected];if(!ids.length||bulkBusy)return;
  const affected=OfficeJobs.affectedJobs(state.jobs,ids),expectedAffectedIds=affected.map(j=>j.id),extra=affected.length-ids.length;
  const message=`Chuyển ${ids.length} việc đã chọn vào thùng rác?`+(extra?` Bao gồm thêm ${extra} bước bàn giao phía sau, tổng cộng ${affected.length} việc.`:"")+" Các việc đang chạy trong nhóm này sẽ dừng; yêu cầu đăng chưa gửi sẽ bị huỷ. Anh có thể khôi phục từ thùng rác.";
  confirmJob(message,async()=>{
    bulkBusy=true;renderBulk();
    try{const result=await api("/api/office/jobs/bulk-delete",{ids,expectedAffectedIds});bulkSelected.clear();if(selectedJob&&result.ids.includes(selectedJob)&&$("details").open)$("details").close();await refresh();notify(`Đã chuyển ${result.affectedCount} công việc vào thùng rác.`);}
    catch(e){await refresh();throw new Error(e.message+" Đóng hộp xác nhận rồi kiểm tra và chọn lại.");}
    finally{bulkBusy=false;if(state)render();}
  });
};
async function refresh() {
  if (refreshing) return; refreshing = true;
  try { state = await api("/api/office"); $("connection").textContent = "● Máy nhà đang kết nối"; $("connection").style.color = "var(--done)"; render(); }
  catch (e) { $("connection").textContent = "Mất kết nối máy nhà"; $("connection").style.color = "var(--danger)"; if (!state) $("job-list").textContent = e.message; }
  finally { refreshing = false; }
}
function actionButton(container, name, fn, cls = "secondary") {
  const button = el("button", cls, name); button.type = "button";
  button.onclick = async () => { button.disabled = true; try { await fn(); } catch (e) { notify(e.message, true); } finally { button.disabled = false; } };
  container.append(button);
}
async function runAction(id, action, note) {
  await api(`/api/office/jobs/${id}/${action}`, note === undefined ? {} : { note }); await refresh(); notify("Đã cập nhật công việc.");
}
function notify(message, error = false) { $("job-notice").textContent = message; $("job-notice").className = error ? "error" : ""; }
function openAction(j, action) {
  MemoryChoice.reset("revision");
  clearUploads("revision"); revisionJob = j.id; pendingAction = action; revisionDirty = false;
  $("revision-heading").textContent = { retry: "Yêu cầu làm lại", transfer: "Chuyển cho người khác", reject: "Từ chối kết quả" }[action];
  $("revision-save").textContent = { retry: "Giao lại công việc", transfer: "Chuyển công việc", reject: "Từ chối kết quả" }[action];
  $("revision-title").value = j.title; $("revision-brief").value = j.brief; $("revision-note").value = action === "retry" ? j.reviewNote || j.feedback || "" : "";
  $("revision-fields").hidden = action === "reject"; $("revision-title").disabled = $("revision-brief").disabled = action === "reject";
  $("transfer-field").hidden = action !== "transfer"; $("transfer-person").disabled = action !== "transfer"; $("transfer-person").replaceChildren();
  for (const e of state.employees.filter((e) => e.enabled && e.id !== j.employeeId)) { const option = el("option", "", e.name); option.value = e.id; $("transfer-person").append(option); }
  $("revision-error").textContent = ""; $("revision").showModal();
}
function jobActions(container, j, card = false) {
  if (card) actionButton(container, "Xem chi tiết", () => openDetails(j.id));
  if (j.deletedAt) { actionButton(container, "Khôi phục công việc", () => runAction(j.id, "restore")); return; }
  if (j.status === "review") actionButton(container, "Duyệt kết quả", () => openApproval(j), "primary");
  let target = container;
  if (card) { const menu = el("details", "job-menu"), summary = el("summary", "", "Thao tác ▾"), content = el("div"); menu.dataset.jobId = j.id; menu.open = openJobMenus.has(j.id); menu.append(summary, content); container.append(menu); target = content; }
  if (j.status === "review") actionButton(target, "Từ chối", () => openAction(j, "reject"));
  if (!j.childJobIds?.length && ["review", "completed", "rejected", "failed", "interrupted", "blocked", "cancelled"].includes(j.status)) {
    actionButton(target, "Yêu cầu làm lại", () => openAction(j, "retry")); actionButton(target, "Chuyển cho người khác", () => openAction(j, "transfer"));
  }
  if (["scheduled", "queued", "running"].includes(j.status)) actionButton(target, "Huỷ công việc", () => confirmJob("Huỷ công việc này? Sản phẩm đã tạo vẫn được giữ.", () => runAction(j.id, "cancel")));
  actionButton(target, "Xoá công việc", () => confirmJob("Chuyển công việc và các bước sau vào thùng rác? Các bước đang chạy sẽ dừng. Anh có thể khôi phục sau.", async () => { await runAction(j.id, "delete"); if ($("details").open) $("details").close(); }), "secondary danger");
}
function confirmJob(message, callback) { confirmCallback = callback; $("confirm-message").textContent = message; $("confirm-error").textContent = ""; $("confirm-action").showModal(); }
$("confirm-close").onclick = () => $("confirm-action").close();
$("confirm-save").onclick = async () => { $("confirm-save").disabled = true; try { await confirmCallback(); $("confirm-action").close(); } catch (e) { $("confirm-error").textContent = e.message; } finally { $("confirm-save").disabled = false; } };
function renderDetails() {
  const j = state.jobs.find((j) => j.id === selectedJob); if (!j) return;
  $("detail-title").textContent = j.title;
  $("detail-meta").textContent = `${state.employees.find((e) => e.id === j.employeeId)?.name} · ${labels[j.status]} · Bắt đầu ${fmt(j.startAt)}`;
  $("detail-brief").textContent = j.brief; $("detail-result").textContent = j.result || j.error || "Chưa có kết quả. Tiến độ sẽ cập nhật tự động.";
  if (j.error && j.result) $("detail-result").textContent = j.error + "\n\n" + j.result;
  if (j.parentJobId) {
    const parent = state.jobs.find((p) => p.id === j.parentJobId);
    $("detail-meta").textContent += " · Nhận tự động từ " + state.employees.find((e) => e.id === parent?.employeeId)?.name;
  }
  $("detail-publications").replaceChildren(...(j.publications||[]).map(p=>{
    const card=el("article","note-entry"),status={awaiting_review:"Chờ Hải duyệt đăng",queued:"Chờ gửi",posting:"Đang gửi",published:"Đã đăng",processing:"Video đang xử lý",blocked:"Bị chặn",failed:"Đăng thất bại",uncertain:"Chưa rõ kết quả",cancelled:"Đã huỷ"};
    card.append(el("strong","",p.channelName+" · "+(status[p.status]||p.status)));if(p.error)card.append(el("p","error",p.error));
    const a=el("a","text-button",p.url?"Mở bài đã đăng ↗":"Xem trong Kênh đăng");a.href=p.url||"kenh-dang.html";a.target="_blank";a.rel="noopener noreferrer";card.append(a);return card;
  }));
  $("note-form").hidden = !!j.deletedAt;
  $("detail-notes").replaceChildren(...(j.notes || []).map((n) => {
    const card = el("article", "note-entry"); card.append(el("small", "muted", fmt(n.at)), el("p", "", n.text));
    for (const f of n.attachments || []) actionButton(card, "Xem " + f.name, () => openPreview(j.id, { name: f.path, bytes: f.bytes }));
    return card;
  }));
  $("detail-events").replaceChildren(...j.events.map((e) => el("li", "", `${fmt(e.at)} · ${e.text}`)));
  const actions = $("detail-actions"); actions.replaceChildren();
  jobActions(actions, j);
  for (const id of j.childJobIds || []) {
    const child = state.jobs.find((x) => x.id === id);
    if (child) actionButton(actions, "Xem bước của " + state.employees.find((e) => e.id === child.employeeId)?.name, () => openDetails(id));
  }
}
async function loadFiles() {
  const id = selectedJob;
  try {
    const data = await api(`/api/office/jobs/${id}/files`); if (selectedJob !== id) return;
    const signature = id + JSON.stringify(data.files); if (signature === fileSignature) return; fileSignature = signature;
    $("result-summary").open = !data.files.length;
    $("detail-files").replaceChildren();
    if (!data.files.length) $("detail-files").append(el("p", "muted", "Chưa có tệp sản phẩm."));
    const priority = (f) => (f.name.startsWith("dau-vao/") ? 100 : 0) + (/^(ban-giao|ket-qua-luot)/.test(f.name) ? 40 : 0) + (/\.(png|jpe?g|webp|gif|svg|mp4|webm|mp3|wav)$/i.test(f.name) ? 0 : /\.(md|txt|pdf)$/i.test(f.name) ? 5 : 10);
    const files = data.files.sort((a, b) => priority(a) - priority(b) || a.name.localeCompare(b.name));
    for (const f of files) {
      const row = el("div", "artifact-file"), view = el("button", "secondary", "Xem " + f.name.split("/").pop()); view.type = "button"; view.onclick = () => openPreview(id, f);
      const a = el("a", "", `Tải về (${Math.ceil(f.bytes / 1024)} KB)`); a.href = `/api/office/jobs/${id}/download?name=${encodeURIComponent(f.name)}`; a.download = ""; row.append(view, a); $("detail-files").append(row);
    }
    if (!files.some((f) => f.name === previewFile) && files.length) await showPreview(id, files[0]);
  } catch (e) { $("detail-files").textContent = e.message; }
}
async function openPreview(id, file) { await showPreview(id, file); $("preview-name").scrollIntoView({ block: "start", behavior: "smooth" }); }
async function showPreview(id, file) {
  const token = ++previewToken, box = $("artifact-preview"), ext = file.name.split(".").pop().toLowerCase(); previewFile = file.name;
  const url = `/api/office/jobs/${id}/preview?name=${encodeURIComponent(file.name)}`; $("preview-name").textContent = file.name.split("/").pop(); box.replaceChildren();
  if (["png", "jpg", "jpeg", "webp", "gif", "avif", "svg"].includes(ext)) { const img = el("img"); img.src = url; img.alt = file.name; img.onerror = () => { if (token === previewToken) box.textContent = "Không hiển thị được ảnh. Anh có thể thử xem lại hoặc tải tệp."; }; box.append(img); }
  else if (["mp4", "webm", "mov", "mp3", "m4a", "wav", "ogg"].includes(ext)) { const media = el(["mp4", "webm", "mov"].includes(ext) ? "video" : "audio"); media.controls = true; media.preload = "metadata"; media.src = url; box.append(media); }
  else if (ext === "pdf") {
    box.textContent = "Đang mở PDF…";
    try {
      const info = await api(url + "&pdfInfo=1"); if (token !== previewToken || id !== selectedJob) return;
      const toolbar = el("div", "pdf-toolbar"), previous = el("button", "secondary", "Trang trước"), next = el("button", "secondary", "Trang sau"), label = el("span"), image = el("img"); let page = 1;
      previous.type = next.type = "button";
      const show = () => { previous.disabled = page <= 1; next.disabled = page >= info.pages; label.textContent = `Trang ${page} / ${info.pages}`; image.alt = file.name + " · trang " + page; image.src = url + "&page=" + page; };
      previous.onclick = () => { page--; show(); }; next.onclick = () => { page++; show(); };
      image.onerror = () => { if (token === previewToken) image.alt = "Không hiển thị được trang PDF. Anh thử lại hoặc tải tài liệu."; };
      toolbar.append(previous, label, next); box.replaceChildren(toolbar, image); show();
    } catch (e) { if (token === previewToken) box.textContent = e.message; }
  }
  else if (["html", "htm"].includes(ext)) { const frame = el("iframe"); frame.src = url; frame.title = "Xem trước " + file.name; frame.setAttribute("sandbox", ""); frame.referrerPolicy = "no-referrer"; box.append(frame); }
  else if (["txt", "md", "json", "csv", "tsv", "srt", "vtt", "js", "css", "xml", "py", "log"].includes(ext)) {
    if (file.bytes > 2 * 1024 * 1024) { box.textContent = "Tệp văn bản lớn hơn 2 MB. Anh tải về để xem toàn bộ."; return; }
    box.textContent = "Đang tải nội dung…";
    try { const r = await fetch(url); if (!r.ok) throw new Error("Không tải được tệp"); const content = await r.text(); if (token !== previewToken || id !== selectedJob) return; if (ext === "md" && window.MD) { const article = el("article", "markdown-preview"); article.innerHTML = MD.render(content); box.replaceChildren(article); } else box.replaceChildren(el("pre", "", content)); } catch (e) { if (token === previewToken) box.textContent = e.message; }
  } else box.textContent = "Định dạng này chưa có xem trước trực tiếp; anh có thể tải tệp bằng nút bên trên.";
}
async function openDetails(id) {
  MemoryChoice.reset("note"); if (selectedJob !== id) { clearUploads("note"); MemoryChoice.reset("note"); $("note-text").value = ""; $("note-error").textContent = ""; } selectedJob = id; previewFile = ""; fileSignature = ""; previewToken++; $("artifact-preview").replaceChildren(); $("preview-name").textContent = ""; renderDetails(); $("detail-files").textContent = "Đang tải tệp…"; if (!$("details").open) $("details").showModal(); await loadFiles(); }
$("detail-close").onclick = () => $("details").close();
$("details").addEventListener("close", () => { selectedJob = null; previewToken++; $("artifact-preview").replaceChildren(); });
$("team-open").onclick = () => location.assign("nhansu.html"); $("team-close").onclick = () => $("team").close();
const leaveRevision = () => !revisionDirty || window.confirm("Ghi chú chưa được gửi. Bỏ thay đổi?");
$("revision-close").onclick = () => { if (leaveRevision()) { revisionDirty = false; $("revision").close(); } };
$("revision-form").addEventListener("input", () => { revisionDirty = true; });
$("revision").addEventListener("cancel", (e) => { if (!leaveRevision()) e.preventDefault(); else revisionDirty = false; });
$("filter").onchange = filterChanged;
$("select-all").onclick = () => { const inputs = [...document.querySelectorAll('input[name="employee"]')], select = !inputs.every((n) => n.checked); inputs.forEach((n) => { n.checked = select; }); syncOrder(); renderOrder(); };
$("work-mode").onchange = renderOrder;
$("sequence-add").onclick = () => { const id = $("sequence-person").value; if (id && !selectedOrder.includes(id)) { selectedOrder.push(id); applyOrder(); renderOrder(); } };
function dateValue(id) {
  const v = $(id).value; if (!v) return null;
  const d = new Date(v + ":00+07:00"); if (!Number.isFinite(+d)) throw new Error("Ngày giờ không hợp lệ"); return d.toISOString();
}
$("assignment-form").onsubmit = async (event) => {
  event.preventDefault(); const button = event.target.querySelector('[type="submit"]'); button.disabled = true; $("form-error").textContent = ""; $("form-success").textContent = "";
  try {
    syncOrder(); const employeeIds = selectedOrder;
    if (!employeeIds.length) throw new Error("Anh chọn ít nhất một nhân viên nhận việc.");
    const sequence = $("work-mode").value === "sequence";
    const r = await api("/api/office/jobs", { attachmentIds: await sendUploads("assignment"), title: $("title").value, brief: $("brief").value, employeeIds, mode: $("work-mode").value, autoHandoff: $("auto-handoff").checked, startAt: dateValue("startAt"), dueAt: dateValue("dueAt") });
    clearUploads("assignment"); $("title").value = ""; $("brief").value = ""; $("form-success").textContent = sequence ? "Đã tạo chuỗi bàn giao. Người đầu tiên bắt đầu theo lịch; các bước sau tự nhận kết quả và chạy tiếp." : `Đã giao ${r.jobs.length} phần việc. Đội sẽ bắt đầu theo lịch và hàng chờ.`; await refresh();
  } catch (e) { $("form-error").textContent = e.message; } finally { button.disabled = false; }
};
$("employee-form").onsubmit = async (event) => {
  event.preventDefault(); const button = event.target.querySelector("button"); button.disabled = true; $("employee-error").textContent = "";
  try { await api("/api/office/employees", { name: $("employee-name").value, role: $("employee-role").value }); event.target.reset(); await refresh(); } catch (e) { $("employee-error").textContent = e.message; } finally { button.disabled = false; }
};
$("password-form").onsubmit = async (event) => {
  event.preventDefault(); const button = event.target.querySelector("button"); button.disabled = true;
  try { await api("/api/office/password", { password: $("password").value }); $("password").value = ""; $("password-message").textContent = "Đã lưu mật khẩu; các phiên đăng nhập cũ đã hết hiệu lực."; await refresh(); } catch (e) { $("password-message").textContent = e.message; } finally { button.disabled = false; }
};
$("revision-form").onsubmit = async (event) => {
  event.preventDefault(); const button = event.target.querySelector('[type="submit"]'); button.disabled = true;
  try { await api(`/api/office/jobs/${revisionJob}/${pendingAction}`, { ...MemoryChoice.values("revision"), attachmentIds: await sendUploads("revision"), title: $("revision-title").value, brief: $("revision-brief").value, note: $("revision-note").value, employeeId: $("transfer-person").value }); revisionDirty = false; $("revision").close(); await refresh(); notify("Đã " + { retry: "giao lại việc kèm ghi chú", transfer: "chuyển việc kèm ghi chú cho người nhận", reject: "từ chối kết quả" }[pendingAction] + "."); } catch (e) { $("revision-error").textContent = e.message; } finally { button.disabled = false; }
};
$("note-form").onsubmit = async (event) => {
  event.preventDefault(); const button = event.target.querySelector('[type="submit"]'), id = selectedJob; button.disabled = true; $("note-error").textContent = "";
  try {
    await api(`/api/office/jobs/${id}/note`, { ...MemoryChoice.values("note"), note: $("note-text").value, attachmentIds: await sendUploads("note") });
    clearUploads("note"); MemoryChoice.reset("note"); $("note-text").value = ""; await refresh(); if (selectedJob === id) await loadFiles();
  } catch (e) { $("note-error").textContent = e.message; } finally { button.disabled = false; }
};
$("logout").onclick = async () => { await api("/office/logout", {}); location.reload(); };
const requestedStatus=new URLSearchParams(location.search).get("status");
if([...$("filter").options].some(o=>o.value===requestedStatus))$("filter").value=requestedStatus;
refresh().then(()=>{const id=new URLSearchParams(location.search).get("job");if(id&&state?.jobs.some(j=>j.id===id))openDetails(id);else if(reportOpen)$("job-report").scrollIntoView({block:"start"});}); setInterval(() => { if (!document.hidden) { refresh(); if (selectedJob && $("details").open) loadFiles(); } }, 3000);

MemoryChoice.mount("revision-form","revision"); MemoryChoice.mount("note-form","note");
let approvalJob=null;
function openApproval(j) { approvalJob=j.id; $("approval-example").checked=false; $("approval-context").value=""; $("approval-error").textContent=""; $("approval").showModal(); }
$("approval-close").onclick=()=>$("approval").close();
$("approval-form").onsubmit=async(event)=>{event.preventDefault();const button=event.target.querySelector('[type="submit"]');button.disabled=true;try{await api(`/api/office/jobs/${approvalJob}/approve`,{saveExample:$("approval-example").checked,exampleContext:$("approval-context").value});$("approval").close();await refresh();notify("Đã duyệt kết quả"+($("approval-example").checked?" và lưu mẫu tốt trong Kinh nghiệm.":"."));}catch(e){$("approval-error").textContent=e.message;}finally{button.disabled=false;}};
