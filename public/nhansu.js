"use strict";
(() => {
  const $ = (id) => document.getElementById(id); let people = [], channels = [], editing = null, revision = null, dirty = false;
  async function api(url, body) {
    const r = await fetch(url, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", "x-office-request": "1" }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store" });
    const j = await r.json(); if (r.status === 401) { location.reload(); throw new Error("Cần đăng nhập lại"); } if (!r.ok) throw new Error(j.error || "Không lưu được hồ sơ"); return j;
  }
  function element(tag, text, cls) { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; }
  function list() {
    $("people-list").replaceChildren();
    for (const p of people) {
      const row = element("div", "", "people-person" + (p.id === editing ? " selected" : "")); row.append(element("strong", p.name), element("p", p.role), element("p", p.running ? "Đang làm việc" : p.enabled ? "Sẵn sàng nhận việc" : "Đang tạm dừng"));
      const button = element("button", "Sửa hồ sơ", "secondary"); button.type = "button"; button.onclick = () => { if (leave()) select(p.id, true); };
      const link = element("a", "Giao việc"); link.href = "giaoviec.html?employee=" + encodeURIComponent(p.id); row.append(button, link); $("people-list").append(row);
    }
  }
  const leave = () => !dirty || window.confirm("Hồ sơ chưa được lưu. Bỏ thay đổi để mở hồ sơ khác?");
  function select(id, scroll = false) {
    editing = id; const p = people.find((e) => e.id === id); revision = p?.revision || null; dirty = false;
    $("person-heading").textContent = p ? "Sửa hồ sơ: " + p.name : "Thêm nhân viên"; $("person-save").textContent = p ? "Lưu hồ sơ" : "Tạo nhân viên";
    $("person-name").value = p?.name || ""; $("person-role").value = p?.role || ""; $("person-prompt").value = p?.prompt || ""; $("person-enabled").checked = p?.enabled !== false;
    $("person-channels").replaceChildren(...channels.map((c) => {
      const row=element("div","","permission-row"),label=element("label",c.name),select=element("select"),id="permission-"+c.id; label.htmlFor=id;select.id=id;select.dataset.channelId=c.id;
      for(const [value,text] of [["none","Không được đăng"],["review","Soạn bài chờ Hải duyệt"],["publish","Đăng trực tiếp"]]){const option=element("option",text);option.value=value;select.append(option);}
      select.value=p?.channelPermissions?.[c.id]||"none";row.append(label,select,element("small",c.canPublish?"Đã kết nối":"Kênh chưa kết nối; vẫn có thể đặt quyền trước","muted"));return row;
    }));
    if(!channels.length)$("person-channels").append(element("p","Chưa có kênh. Thêm kênh ở mục Kênh đăng trước.","muted"));
    $("person-running").textContent = p?.running ? "Nhân viên đang làm việc. Prompt mới sẽ áp dụng từ lượt sau." : ""; $("person-error").textContent = ""; list();
    if (scroll) $("person-form").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function load() { const s = await api("/api/office"); people = s.employees; channels = s.channels || []; list(); }
  $("person-form").addEventListener("input", () => { dirty = true; });
  $("new-person").onclick = () => { if (leave()) select(null, true); };
  $("person-reload").onclick = async () => { if (!leave()) return; try { await load(); select(editing); } catch (e) { $("person-error").textContent = e.message; } };
  $("person-form").onsubmit = async (event) => {
    event.preventDefault(); $("person-save").disabled = true; $("person-error").textContent = "";
    try {
      const r = await api("/api/office/employees" + (editing ? "/" + editing : ""), { channelPermissions: Object.fromEntries([...document.querySelectorAll("#person-channels select")].map(s=>[s.dataset.channelId,s.value])), name: $("person-name").value, role: $("person-role").value, prompt: $("person-prompt").value, enabled: $("person-enabled").checked, revision });
      dirty = false; await load(); select(r.employee.id); $("people-status").className = "notice-ok"; $("people-status").textContent = "Đã lưu hồ sơ. Prompt áp dụng từ lượt sau; quyền đăng được kiểm tra trước khi gửi bài.";
    } catch (e) { $("person-error").textContent = e.message; } finally { $("person-save").disabled = false; }
  };
  window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
  load().then(() => select(new URLSearchParams(location.search).get("edit"))).catch((e) => { $("people-status").className = "notice-error"; $("people-status").textContent = e.message; });
})();
