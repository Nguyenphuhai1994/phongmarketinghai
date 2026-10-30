"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const { readChannels, readConnections, connectionBinding } = require("../../lib/office-channels");
const fail = (message, status = 400, confirmed = true) => Object.assign(new Error(message), { status, confirmed });
const MIME = { ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp", ".gif":"image/gif", ".mp4":"video/mp4", ".webm":"video/webm", ".pdf":"application/pdf" };
function createPublisher({ dataDir, employees, request = require("./network").request, keyProvider, clock = () => Date.now(), jobAllowed = () => true }) {
  const dir = path.join(dataDir,"control"), file = path.join(dir,"publications.json"), vault = require("./vault").createVault(dataDir,keyProvider);
  let posts = []; try { posts = JSON.parse(fs.readFileSync(file,"utf8")); } catch(e) { if(e.code !== "ENOENT")throw e; }
  let busy = false, timer = null; const connecting = new Set();
  const write = (target,value) => { fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target+".tmp",JSON.stringify(value,null,2)+"\n",{mode:0o600});fs.renameSync(target+".tmp",target); };
  const save = () => write(file,posts);
  for(const p of posts) if(p.status === "posting") { p.status="uncertain";p.error="Máy chủ dừng trong lúc gửi bài. Kiểm tra nền tảng trước khi giao đăng lại để tránh trùng.";save(); }
  const channel = (id) => readChannels(dataDir).channels.find(c=>c.id===id);
  const person = (id) => employees().find(e=>e.id===id);
  const permission = (id,cid) => person(id)?.enabled ? person(id)?.channelPermissions?.[cid] || "none" : "none";
  const cleanString = (v,max,required=true) => {if(typeof v!=="string" || v.length>max || (required && !v.trim()))throw fail("Nội dung đăng không hợp lệ");return v.trim();};
  const validLink = (value,c) => {try {const u=new URL(value),base=new URL(c.url);return u.protocol==="https:" && (c.platform==="facebook" ? ["www.facebook.com","facebook.com"].includes(u.hostname) : u.origin===base.origin) ? u.href : null;}catch{return null;}};
  async function call(url,options,writeRequest=false) {
    let r;try {r=await request(url,options);}catch(e){throw fail(e.status ? e.message : "Không nhận được xác nhận từ nền tảng. Kiểm tra bài trên kênh trước khi gửi lại.",e.status||502,!!e.confirmed);}
    if(r.status>=300 && r.status<400)throw fail("Nền tảng chuyển hướng. Cập nhật đúng địa chỉ HTTPS trong cấu hình rồi kết nối lại.",400);
    if(r.status>=400 || r.data?.error)throw fail(r.status===401 || r.status===403 ? "Thông tin kết nối hết hạn hoặc thiếu quyền đăng. Kiểm tra lại tài khoản/token và quyền trên nền tảng." : "Nền tảng từ chối yêu cầu (HTTP "+r.status+"). Kiểm tra nội dung, định dạng tệp và cấu hình kênh.",400,r.status<500);
    if(!r.data || typeof r.data!=="object")throw fail("Nền tảng không trả dữ liệu xác nhận hợp lệ",502,!writeRequest);
    return r.data;
  }
  function authorization(c,secret) { return c.platform==="website" ? "Basic "+Buffer.from(secret.username+":"+secret.password).toString("base64") : "Bearer "+secret.token; }
  function secretFor(c) {const secret=vault.get(c.id);if(!secret || secret.binding!==connectionBinding(c))throw fail("Kênh chưa kết nối hoặc cấu hình đã đổi. Hãy kết nối lại.",409);return secret;}
  async function connect(id,body) {
    const c=channel(id);if(!c)throw fail("Kênh không tồn tại",404);if(connecting.has(id))throw fail("Kênh đang kiểm tra kết nối",409);connecting.add(id);
    try {
      let previous; if(!body.applicationPassword && !body.pageAccessToken) {try{previous=secretFor(c);}catch{}}
      let secret, data;
      if(c.platform==="website") {
        const password=cleanString(body.applicationPassword || previous?.password || "",512).replace(/\s/g,"");
        if(!c.username || !c.apiRoot)throw fail("Lưu tên đăng nhập và địa chỉ quản trị/API trước khi kết nối");
        secret={username:c.username,password,binding:connectionBinding(c)};
        data=await call(new URL("wp/v2/users/me?context=edit",c.apiRoot),{headers:{Authorization:authorization(c,secret)}});
        if(!data.id || data.capabilities?.publish_posts!==true)throw fail("Tài khoản WordPress chưa có quyền publish_posts. Dùng tài khoản được phép đăng bài.",403);
      } else {
        if(c.facebookKind!=="page" || !c.pageId)throw fail("Chọn Fanpage và nhập Page ID trước khi kết nối");
        secret={token:cleanString(body.pageAccessToken || previous?.token || "",8192),binding:connectionBinding(c)};
        data=await call(`https://graph.facebook.com/${c.graphVersion}/me?fields=id,name`,{headers:{Authorization:authorization(c,secret)}});
        if(String(data.id)!==c.pageId)throw fail("Token không thuộc đúng Fanpage đã chọn");
      }
      if(connectionBinding(channel(id)||{})!==secret.binding)throw fail("Cấu hình kênh vừa thay đổi. Kiểm tra rồi kết nối lại.",409);
      vault.put(id,secret);const meta=readConnections(dataDir);meta[id]={binding:secret.binding,status:"connected",name:String(data.name||c.name).slice(0,150),verifiedAt:clock()};write(path.join(dir,"channel-connections.json"),meta);
      return channel(id);
    } finally {connecting.delete(id);}
  }
  function disconnect(id) {
    if(posts.some(p=>p.channelId===id&&p.status==="posting") || connecting.has(id))throw fail("Kênh đang gửi bài/kiểm tra kết nối. Đợi hoàn tất rồi ngắt.",409);
    const meta=readConnections(dataDir);if(meta[id]) {vault.put(id,null);delete meta[id];write(path.join(dir,"channel-connections.json"),meta);}return channel(id);
  }
  function assertEditable(next) {
    for(const c of readChannels(dataDir).channels) { const replacement=next.find(n=>n.id===c.id);if((!replacement || connectionBinding(replacement)!==connectionBinding(c)) && (connecting.has(c.id) || posts.some(p=>p.channelId===c.id&&p.status==="posting")))throw fail("Kênh đang gửi bài/kiểm tra kết nối, chưa thể xoá hoặc đổi cấu hình.",409); }
  }
  function ingest(job,folder,listedFiles) {
    const manifest=path.join(folder,`dang-bai-luot-${job.attempts}.json`);if(!fs.existsSync(manifest))return [];
    const stat=fs.lstatSync(manifest);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1000000)throw fail("Tệp yêu cầu đăng không hợp lệ");
    const body=JSON.parse(fs.readFileSync(manifest,"utf8"));if(!Array.isArray(body.posts)||body.posts.length>5)throw fail("Tối đa 5 bài đăng mỗi lượt");
    const prepared=body.posts.map((entry,index)=>{
      const key=`${job.id}:${job.attempts}:${index}`,old=posts.find(p=>p.key===key);if(old)return old;
      const c=channel(entry.channelId);if(!c)throw fail("Kênh được yêu cầu đăng không tồn tại");
      const title=cleanString(entry.title||job.title,200),content=cleanString(entry.content,c.platform==="facebook"?60000:100000);
      const mode=permission(job.employeeId,c.id);if(!Array.isArray(entry.files||[])||(entry.files||[]).length>10)throw fail("Tối đa 10 tệp cho mỗi bài");
      const files=(entry.files||[]).map(name=>{const listed=listedFiles.find(f=>f.name===name),type=MIME[path.extname(String(name)).toLowerCase()];if(!listed||!type)throw fail("Tệp đăng không có trong sản phẩm hoặc định dạng chưa hỗ trợ");return {name,bytes:listed.bytes,type};});
      if(files.reduce((n,f)=>n+f.bytes,0)>100*1024*1024)throw fail("Tệp đăng mỗi bài tối đa 100 MB");
      if(c.platform==="facebook"&&(files.some(f=>f.type==="application/pdf")||(files.some(f=>f.type.startsWith("video/"))&&(files.length!==1))))throw fail("Fanpage nhận ảnh hoặc một video riêng; PDF chỉ đăng được trên website");
      const p={id:crypto.randomUUID(),key,jobId:job.id,attempt:job.attempts,employeeId:job.employeeId,channelId:c.id,channelBinding:connectionBinding(c),title,content,files,status:mode==="publish"?"queued":mode==="review"?"awaiting_review":"blocked",error:mode==="none"?"Nhân viên chưa được cấp quyền trên kênh này":"",createdAt:clock(),uploads:[]};
      const mediaDir=path.join(dir,"publication-media",p.id);fs.mkdirSync(mediaDir,{recursive:true});
      for(const [i,f] of files.entries()) {const source=fs.realpathSync(path.join(folder,f.name));if(!source.startsWith(fs.realpathSync(folder)+path.sep)||fs.lstatSync(path.join(folder,f.name)).isSymbolicLink())throw fail("Không được đăng tệp ngoài thư mục việc");fs.copyFileSync(source,path.join(mediaDir,String(i)));}
      return p;
    });
    for(const p of prepared)if(!posts.some(old=>old.id===p.id))posts.push(p);save();return prepared.map(publicPost);
  }
  function publicPost(p) {const {uploads,channelBinding,...visible}=p;return {...visible,employeeName:person(p.employeeId)?.name||"Nhân viên",channelName:channel(p.channelId)?.name||"Kênh đã xoá"};}
  function multipart(fields,filename,mime,bytes) {
    const boundary="Lifesport"+crypto.randomBytes(16).toString("hex"),parts=[];
    for(const [key,value] of Object.entries(fields))parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="source"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`),bytes,Buffer.from(`\r\n--${boundary}--\r\n`));return {body:Buffer.concat(parts),type:`multipart/form-data; boundary=${boundary}`};
  }
  const escape = (s)=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function deliver(p,c,secret) {
    const checkedCall = async (url, options, writing=false) => {
      if(writing) {const live=channel(p.channelId),mode=permission(p.employeeId,p.channelId);if(!jobAllowed(p.jobId) || !live || mode==="none" || (mode==="review"&&!p.approvedAt) || !live.canPublish || connectionBinding(live)!==p.channelBinding)throw fail("Quyền hoặc kết nối kênh vừa thay đổi. Đã dừng gửi bài.",403);}
      return call(url,options,writing);
    };
    const headers={Authorization:authorization(c,secret)},graph=`https://graph.facebook.com/${c.graphVersion}/`,bytes=(i)=>fs.readFileSync(path.join(dir,"publication-media",p.id,String(i)));
    if(c.platform==="website") {
      for(let i=p.uploads.length;i<p.files.length;i++) {const f=p.files[i],ext=path.extname(f.name).toLowerCase(),media=await checkedCall(new URL("wp/v2/media",c.apiRoot),{method:"POST",headers:{...headers,"Content-Type":f.type,"Content-Disposition":`attachment; filename="${p.id}-${i}${ext}"`},body:bytes(i)},true);if(!media.id||!validLink(media.source_url,c))throw fail("Website chưa xác nhận tệp đã tải lên",502,false);p.uploads.push({id:media.id,url:media.source_url,type:f.type});save();}
      let content=p.content.split(/\n\s*\n/).map(t=>"<p>"+escape(t).replace(/\n/g,"<br>")+"</p>").join("\n");
      for(const f of p.uploads)content+=f.type.startsWith("image/")?`<figure><img src="${escape(f.url)}" alt="${escape(p.title)}"></figure>`:f.type.startsWith("video/")?`<video controls src="${escape(f.url)}"></video>`:`<p><a href="${escape(f.url)}">Tài liệu đính kèm</a></p>`;
      const result=await checkedCall(new URL("wp/v2/posts",c.apiRoot),{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:Buffer.from(JSON.stringify({title:p.title,content,status:"publish",...(p.uploads.find(f=>f.type.startsWith("image/"))?{featured_media:p.uploads.find(f=>f.type.startsWith("image/")).id}:{})}))},true);
      if(!result.id||result.status!=="publish")throw fail("Website chưa xác nhận bài đã xuất bản",502,false);return {remoteId:String(result.id),url:validLink(result.link,c)||new URL("?p="+result.id,c.url).href,status:"published"};
    }
    if(p.files[0]?.type.startsWith("video/")) {
      const f=p.files[0],part=multipart({title:p.title,description:p.content,published:"true"},"video"+path.extname(f.name).toLowerCase(),f.type,bytes(0));
      const result=await checkedCall(graph+c.pageId+"/videos",{method:"POST",headers:{...headers,"Content-Type":part.type},body:part.body},true);if(!result.id)throw fail("Facebook chưa xác nhận video đã nhận",502,false);return {remoteId:String(result.id),status:"processing",error:"Video đã gửi, đang chờ Facebook xử lý và xác nhận xuất bản."};
    }
    for(let i=p.uploads.length;i<p.files.length;i++) {const f=p.files[i],part=multipart({published:"false"},"image"+path.extname(f.name).toLowerCase(),f.type,bytes(i));const result=await checkedCall(graph+c.pageId+"/photos",{method:"POST",headers:{...headers,"Content-Type":part.type},body:part.body},true);if(!result.id)throw fail("Facebook chưa xác nhận ảnh đã nhận",502,false);p.uploads.push({id:String(result.id)});save();}
    const form=new URLSearchParams({message:p.content});for(const [i,u] of p.uploads.entries())form.set(`attached_media[${i}]`,JSON.stringify({media_fbid:u.id}));
    const result=await checkedCall(graph+c.pageId+"/feed",{method:"POST",headers:{...headers,"Content-Type":"application/x-www-form-urlencoded"},body:Buffer.from(form.toString())},true);
    if(!result.id||!/^\d+(?:_\d+)?$/.test(String(result.id)))throw fail("Facebook chưa xác nhận bài đã đăng",502,false);
    return {remoteId:String(result.id),url:`https://www.facebook.com/${c.pageId}/posts/${String(result.id).split("_").pop()}`,status:"published"};
  }
  async function tick() {
    if(busy)return;const p=posts.find(p=>p.status==="queued");if(!p)return;busy=true;
    try {
      const mode=permission(p.employeeId,p.channelId),c=channel(p.channelId);
      if(!jobAllowed(p.jobId)||!c||mode==="none")throw fail("Kênh đã xoá, nhân viên tạm dừng hoặc quyền đăng đã bị thu hồi",403);
      if(mode==="review"&&!p.approvedAt){p.status="awaiting_review";save();return;}
      if(connectionBinding(c)!==p.channelBinding)throw fail("Địa chỉ/cấu hình kênh đã đổi. Chuẩn bị yêu cầu mới cho đúng kênh.",409);
      if(!c.canPublish)throw fail("Kênh chưa kết nối. Kiểm tra kết nối rồi thử lại.",409);
      const secret=secretFor(c);p.status="posting";p.error="";p.startedAt=clock();save();
      Object.assign(p,await deliver(p,c,secret),{finishedAt:clock()});save();
    } catch(e) {p.status=p.status==="posting" ? e.confirmed ? "failed" : "uncertain" : "blocked";p.error=e.status?e.message:"Không xử lý được yêu cầu đăng. Kiểm tra kết nối và trạng thái bài trên nền tảng.";save();}
    finally {busy=false;}
  }
  async function pollVideos() {
    if(busy)return;const p=posts.find(p=>p.status==="processing"&&(!p.checkedAt||clock()-p.checkedAt>60000));if(!p)return;busy=true;
    try {p.checkedAt=clock();const c=channel(p.channelId);if(!c||!c.canPublish){save();return;}const secret=secretFor(c),data=await call(`https://graph.facebook.com/${c.graphVersion}/${p.remoteId}?fields=published,permalink_url`,{headers:{Authorization:authorization(c,secret)}});if(data.published===true&&validLink(data.permalink_url,c)){p.status="published";p.url=data.permalink_url;p.error="";p.finishedAt=clock();}save();}catch{save();}finally{busy=false;}
  }
  function action(id,name) {
    const p=posts.find(p=>p.id===id);if(!p)throw fail("Không có yêu cầu đăng này",404);
    if(name==="cancel"&&["queued","awaiting_review","blocked","failed"].includes(p.status)){p.status="cancelled";save();return publicPost(p);}
    if(!["awaiting_review","blocked","failed"].includes(p.status))throw fail("Không thể gửi lại yêu cầu đã gửi, đang gửi hoặc chưa rõ kết quả. Kiểm tra nền tảng để tránh đăng trùng.",409);
    const mode=permission(p.employeeId,p.channelId);if(mode==="none"||!channel(p.channelId))throw fail("Nhân viên chưa có quyền trên kênh hoặc kênh đã xoá",403);
    if(name==="approve")p.approvedAt=clock();else if(name!=="retry")throw fail("Thao tác không hợp lệ");
    p.status=mode==="review"&&!p.approvedAt?"awaiting_review":"queued";p.error="";save();return publicPost(p);
  }
  return { connect,disconnect,assertEditable,ingest,tick,pollVideos,action,
    cancelForJob:(id)=>{let changed=false;for(const p of posts)if(p.jobId===id&&["queued","awaiting_review","blocked","failed"].includes(p.status)){p.status="cancelled";p.error="Công việc đã được xoá hoặc giao làm lại";changed=true;}if(changed)save();},
    active:()=>busy || connecting.size>0 || posts.some(p=>["queued","posting"].includes(p.status)),
    list:()=>posts.slice(-200).reverse().map(publicPost),
    forJob:(id)=>posts.filter(p=>p.jobId===id).map(p=>({id:p.id,title:p.title,channelId:p.channelId,channelName:channel(p.channelId)?.name||"Kênh đã xoá",status:p.status,url:p.url||null,error:p.error||""})),
    media(id,index){const p=posts.find(p=>p.id===id);if(!p||!p.files[index])throw fail("Không có tệp này",404);return {target:path.join(dir,"publication-media",id,String(index)),name:p.files[index].name};},
    start(){if(!timer)timer=setInterval(()=>{tick();pollVideos();},1000);},stop(){clearInterval(timer);timer=null;}
  };
}
module.exports={createPublisher};
