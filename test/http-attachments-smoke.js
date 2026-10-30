"use strict";
const assert = require("assert/strict"), fs = require("fs");
(async () => {
  const base = "http://localhost:7790";
  async function api(route, body) {
    const r = await fetch(base + route, { headers: { "Content-Type": "application/json", "x-office-request": "1" }, ...(body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }) });
    const data = await r.json(); assert(r.ok, JSON.stringify(data)); return data;
  }
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const stream = 'BT /F1 24 Tf 40 200 Td (LIFESPORT PDF PREVIEW) Tj ET'; objects.push('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
  let pdf = '%PDF-1.4\n', offsets = [0]; objects.forEach((obj,i) => { offsets.push(Buffer.byteLength(pdf)); pdf += (i+1) + ' 0 obj\n' + obj + '\nendobj\n'; });
  const xref = Buffer.byteLength(pdf); pdf += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map((n) => String(n).padStart(10,'0') + ' 00000 n \n').join('') + 'trailer << /Root 1 0 R /Size 6 >>\nstartxref\n' + xref + '\n%%EOF\n';
  const bytes = Buffer.from(pdf), headers = { "x-office-request": "1", "x-file-name": encodeURIComponent("Tài liệu.pdf"), "Content-Type": "application/octet-stream" };
  const blocked = await fetch(base + "/api/office/uploads", { method: "POST", headers: { "x-file-name": "a.txt" }, body: "x" }); assert.equal(blocked.status, 403);
  const unsafe = await fetch(base + "/api/office/uploads", { method: "POST", headers: { ...headers, "x-file-name": "..%2Fsecret" }, body: "x" }); assert.equal(unsafe.status, 400);
  const r = await fetch(base + "/api/office/uploads", { method: "POST", headers, body: bytes }); assert.equal(r.status, 201); const { attachment } = await r.json();
  const { jobs: [job] } = await api("/api/office/jobs", { title: "Kiểm tra PDF đính kèm", brief: "Xem tài liệu PDF ngay trên web", employeeIds: ["trinh"], attachmentIds: [attachment.id] });
  const { files } = await api(`/api/office/jobs/${job.id}/files`); assert.equal(files.length, 1);
  const preview = await fetch(base + `/api/office/jobs/${job.id}/preview?name=` + encodeURIComponent(files[0].name)); assert.equal(preview.headers.get("Content-Type"), "application/pdf"); assert.deepEqual(Buffer.from(await preview.arrayBuffer()), bytes);
  const range = await fetch(base + `/api/office/jobs/${job.id}/download?name=` + encodeURIComponent(files[0].name), { headers: { Range: "bytes=0-7" } }); assert.equal(range.status, 206); assert.equal(Buffer.from(await range.arrayBuffer()).toString(), "%PDF-1.4");
  const info = await api(`/api/office/jobs/${job.id}/preview?name=` + encodeURIComponent(files[0].name) + "&pdfInfo=1"); assert.equal(info.pages, 1);
  const image = await fetch(base + `/api/office/jobs/${job.id}/preview?name=` + encodeURIComponent(files[0].name) + "&page=1"); assert.equal(image.headers.get("Content-Type"), "image/png"); assert.equal(Buffer.from(await image.arrayBuffer()).subarray(1,4).toString(), "PNG");
  console.log(JSON.stringify({ ok: true, id: job.id, checks: ["CSRF", "filename", "upload", "create", "preview", "range"] }));
})().catch((e) => { console.error(e); process.exitCode = 1; });
