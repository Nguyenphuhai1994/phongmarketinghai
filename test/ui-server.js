"use strict";
// Máy chủ kiểm thử UI dùng dữ liệu tạm và không bật worker, không sửa việc thật.
const fs = require("fs"), os = require("os"), path = require("path"), http = require("http"), crypto = require("crypto");
const { createDispatcher } = require("../lib/dispatcher"), { createAuth } = require("../lib/office-auth");
const root = path.resolve(__dirname, ".."), dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifesport-ui-"));
const employees = [ ["dat", "Đạt Codex", "Công cụ"], ["trinh", "Trinh content", "Nội dung"], ["nhi", "Nhi design", "Thiết kế"], ["ninh", "Ninh Web", "Website"] ].map(([id, name, role]) => ({ id, name, role, prompt: "Prompt thử nghiệm", enabled: true, room: "codex" }));
const jobs = ["Bài viết thử nghiệm", "Banner thử nghiệm", "Việc để kiểm tra làm lại"].map((title, i) => ({ id: crypto.randomUUID(), campaignId: crypto.randomUUID(), employeeId: i === 1 ? "nhi" : "trinh", title, brief: "Yêu cầu ban đầu", status: "review", createdAt: Date.now(), startedAt: Date.now(), startAt: new Date().toISOString(), dueAt: null, attempts: 1, result: "Kết quả đã tạo", progress: "Chờ duyệt", events: [], autoHandoff: false, parentJobId: null, inputSources: [], remainingSteps: [] }));
fs.mkdirSync(path.join(dataDir, "control"), { recursive: true }); fs.writeFileSync(path.join(dataDir, "control/jobs.json"), JSON.stringify({ employees, jobs }));
fs.writeFileSync(path.join(dataDir, "NOI-QUY.md"), "# Nội quy thử nghiệm\n\n## Chất lượng\nChỉ dùng dữ liệu thử.\n");
for (const j of jobs) fs.mkdirSync(path.join(dataDir, "control/work", j.id), { recursive: true });
fs.writeFileSync(path.join(dataDir, "control/work", jobs[0].id, "bai-viet.md"), "# Tiêu đề mẫu\n\nNội dung **đọc trực tiếp**, không cần tải về.");
fs.writeFileSync(path.join(dataDir, "control/work", jobs[1].id, "banner.svg"), '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#17212b"/><text x="320" y="190" text-anchor="middle" fill="#ecc970" font-size="40">LIFESPORT</text></svg>');
const publishingTest = process.env.VP_TEST_PUBLISHING === "1";
if (publishingTest) {
  const channels = require("../lib/office-channels");channels.saveChannels(dataDir,{revision:channels.readChannels(dataDir).revision,channels:[
    {id:"web-test",name:"Website thử nghiệm",platform:"website",url:"https://site.example/",username:"test-writer",employeeId:"trinh"},
    {id:"fb-test",name:"Fanpage thử nghiệm",platform:"facebook",url:"https://www.facebook.com/profile.php?id=42",facebookKind:"page",pageId:"42",employeeId:"nhi"}
  ]});
}
const publishing = publishingTest ? {keyProvider:()=>Buffer.alloc(32,9),request:async(url,options={})=>{
  const u=String(url);if(u.includes("users/me"))return {status:200,data:{id:1,name:"Tài khoản thử",capabilities:{publish_posts:true}}};
  if(u.includes("fields=id,name"))return {status:200,data:{id:"42",name:"Fanpage thử"}};
  if(options.method==="POST" && u.endsWith("/posts"))return {status:201,data:{id:123,status:"publish",link:"https://site.example/post/123"}};
  if(options.method==="POST" && u.endsWith("/feed"))return {status:200,data:{id:"42_123"}};
  return {status:403,data:{error:{message:"API thử không hỗ trợ"}}};
}} : {};
const auth = createAuth(dataDir), dispatcher = createDispatcher({ root, dataDir, cfg: { staff: [] }, auth, publishing });
if(publishingTest){
  const folder=path.join(dataDir,"control/work",jobs[0].id);fs.writeFileSync(path.join(folder,"dang-bai-luot-1.json"),JSON.stringify({posts:[{channelId:"web-test",title:"Bài chờ duyệt thử nghiệm",content:"Chỉ là dữ liệu thử. Không gửi lên website thật.",files:[]}]}));
  dispatcher.publisher.ingest(jobs[0],folder,[]);dispatcher.publisher.start();
}
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost"); if (!await auth.gate(req, res, url)) return;
    if (url.pathname.startsWith("/api/office")) return dispatcher.handle(req, res, url);
    if (url.pathname === "/state") {res.setHeader("Content-Type","application/json");return res.end(JSON.stringify(require("../lib/marketing-state").marketingState(dispatcher.view(),{title:"Phòng marketing thử nghiệm"})));}

    const file = path.resolve(root, "public", url.pathname === "/" ? "index.html" : url.pathname.slice(1));
    if (!file.startsWith(path.join(root, "public") + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }); res.end(b); });
  } catch (e) { if (!res.headersSent) res.writeHead(500); res.end(e.message); }
}).listen(7790, "127.0.0.1", () => console.log("UI TEST http://localhost:7790/giaoviec.html — " + dataDir));
