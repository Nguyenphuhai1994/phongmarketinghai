"use strict";
(() => {
  if (window.top !== window) return;
  let current = null, dirty = false; const toolbar = document.createElement("div"); toolbar.className = "rule-toolbar";
  const open = document.createElement("button"); open.textContent = "Sửa nội quy"; toolbar.append(open);
  const note = document.createElement("p"); note.textContent = "Nội quy được lưu cho cả phòng và áp dụng từ lượt làm việc tiếp theo."; toolbar.append(note);
  const head = document.querySelector(".head"); (head || document.body.firstElementChild).after(toolbar);
  const dialog = document.createElement("dialog"); dialog.className = "rule-dialog";
  dialog.innerHTML = '<form><h2>Sửa nội quy của phòng</h2><label for="rule-content">Nội dung (Markdown)</label><textarea id="rule-content" maxlength="100000" required></textarea><p class="muted">Mỗi lần lưu giữ một bản sao nội quy cũ. Nội quy mới được đưa vào các lượt nhận việc tiếp theo.</p><p class="error" role="alert"></p><div class="rule-actions"><button type="submit">Lưu nội quy</button><button type="button" class="secondary" data-action="reload">Tải bản mới</button><button type="button" class="secondary" data-action="close">Đóng</button></div></form>';
  document.body.append(dialog); const input = dialog.querySelector("textarea"), message = dialog.querySelector(".error"), save = dialog.querySelector('[type="submit"]');
  async function api(body) {
    const r = await fetch("/api/office/rules", { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", "x-office-request": "1" }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store" });
    const data = await r.json(); if (!r.ok) throw new Error(data.error || "Không tải được nội quy"); return data;
  }
  async function load() { current = await api(); input.value = current.content; dirty = false; message.textContent = ""; }
  open.onclick = async () => { open.disabled = true; try { await load(); dialog.showModal(); } catch (e) { note.textContent = e.message; } finally { open.disabled = false; } };
  input.oninput = () => { dirty = true; };
  const leave = () => !dirty || window.confirm("Nội quy chưa được lưu. Bỏ thay đổi?");
  dialog.querySelector('[data-action="reload"]').onclick = async () => { if (leave()) try { await load(); } catch (e) { message.textContent = e.message; } };
  dialog.querySelector('[data-action="close"]').onclick = () => { if (leave()) { dirty = false; dialog.close(); } };
  dialog.addEventListener("cancel", (e) => { if (!leave()) e.preventDefault(); else dirty = false; });
  dialog.querySelector("form").onsubmit = async (event) => { event.preventDefault(); save.disabled = true; message.textContent = ""; try { current = await api({ content: input.value, revision: current.revision }); dirty = false; dialog.close(); window.dispatchEvent(new Event("office-rules-saved")); note.textContent = "Đã lưu nội quy. Các lượt làm việc tiếp theo sẽ dùng bản mới."; } catch (e) { message.textContent = e.message; } finally { save.disabled = false; } };
  window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
})();
