// Máy chủ Phòng marketing Lifesport: công việc, nhân sự, sản phẩm và xuất bản.
"use strict";
const http=require("http"), fs=require("fs"), path=require("path");
const {loadConfig}=require("./lib/config");
const ROOT = __dirname;
const CFG = loadConfig(ROOT);
if (!CFG) { console.error("Chưa có config.json. Chạy trước: npm run setup"); process.exit(1); }
const DATA = CFG.dataDir;
// Chỉ một máy chủ được sửa hàng đợi; tránh lần chạy npm start thứ hai làm gián đoạn việc đang chạy.
fs.mkdirSync(path.join(DATA, "control"), { recursive: true });
const serverLock = path.join(DATA, "control", "server.lock");
if (fs.existsSync(serverLock)) {
  const pid = Number(fs.readFileSync(serverLock, "utf8"));
  if (!Number.isInteger(pid) || pid <= 0) throw new Error("Khoá máy chủ không hợp lệ: " + serverLock);
  try { process.kill(pid, 0); throw new Error("Văn phòng đã chạy với PID " + pid); }
  catch (e) { if (e.code !== "ESRCH") throw e; fs.unlinkSync(serverLock); }
}
fs.writeFileSync(serverLock, String(process.pid), { flag: "wx", mode: 0o600 });
process.on("exit", () => { try { if (fs.readFileSync(serverLock, "utf8") === String(process.pid)) fs.unlinkSync(serverLock); } catch {} });
const officeAuth = require("./lib/office-auth").createAuth(DATA, CFG.accessKey || "");
const dispatcher = require("./lib/dispatcher").createDispatcher({ root: ROOT, dataDir: DATA, cfg: CFG, auth: officeAuth });
const PORT = Number(process.env.PORT || CFG.port);

const {marketingState}=require("./lib/marketing-state");
const clients=new Set();
const snapshot=()=>marketingState(dispatcher.view(),CFG);
const json=(res,value,code=200)=>{res.writeHead(code,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});res.end(JSON.stringify(value));};
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".ico":"image/x-icon"};
const webServer=http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,"http://localhost");
  res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("Referrer-Policy","same-origin");
  if(!await officeAuth.gate(req,res,url))return;
  if(url.pathname.startsWith("/api/office"))return dispatcher.handle(req,res,url);
  if(url.pathname==="/state")return json(res,snapshot());
  if(url.pathname==="/events"){
   res.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-cache","Connection":"keep-alive","X-Accel-Buffering":"no"});
   res.write("data: "+JSON.stringify(snapshot())+"\n\n");clients.add(res);req.on("close",()=>clients.delete(res));return;
  }
  if(["/perf","/perf-events","/docs","/hopthu","/tongquan"].includes(url.pathname)||url.pathname.startsWith("/chat/"))return json(res,{error:"Luồng điều hành kỹ thuật đã ngừng sử dụng. Dùng Công việc, Báo cáo và Kinh nghiệm của phòng marketing."},410);
  if(req.method!=="GET"&&req.method!=="HEAD")return json(res,{error:"Không có thao tác này"},405);
  const file=url.pathname==="/"?"index.html":decodeURIComponent(url.pathname.slice(1));
  const base=path.join(ROOT,"public"),target=path.resolve(base,file);
  if(!target.startsWith(base+path.sep))return json(res,{error:"Không có tệp này"},403);
  fs.readFile(target,(e,b)=>{if(e){res.writeHead(404);return res.end("Không có trang này");}res.writeHead(200,{"Content-Type":MIME[path.extname(target)]||"application/octet-stream","Cache-Control":"no-cache"});res.end(req.method==="HEAD"?undefined:b);});
 }catch(e){console.error("HTTP:",e.message);if(!res.headersSent)res.writeHead(500);res.end("Không xử lý được yêu cầu");}
});
const push=setInterval(()=>{if(!clients.size)return;const message="data: "+JSON.stringify(snapshot())+"\n\n";for(const res of clients){if(res.destroyed||res.writableLength>1024*1024){res.destroy();clients.delete(res);}else res.write(message);}},1000);
webServer.listen(PORT,CFG.host,()=>{fs.writeFileSync(path.join(ROOT,"server.pid"),String(process.pid)+"\n");dispatcher.start();console.log(CFG.title+" · http://localhost:"+PORT+" · Điều hành marketing");});
let stopping=false;
function shutdown(){if(stopping)return;stopping=true;clearInterval(push);dispatcher.stop();for(const res of clients)res.end();webServer.close(()=>process.exit(0));setTimeout(()=>process.exit(0),6500).unref();}
process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);
