"use strict";
const $ = id => document.getElementById(id);
const node = (tag,value,cls) => {const e=document.createElement(tag);if(value!==undefined)e.textContent=value;if(cls)e.className=cls;return e;};
const statuses={not_connected:"Chưa kết nối",connected:"Đã kết nối",needs_reconnect:"Cần kết nối lại",awaiting_review:"Chờ Hải duyệt",queued:"Chờ gửi",posting:"Đang gửi",published:"Đã đăng",processing:"Video đang xử lý",blocked:"Bị chặn",failed:"Nền tảng từ chối",uncertain:"Chưa rõ kết quả · kiểm tra kênh",cancelled:"Đã huỷ"};
let revision,employees=[],savedChannels=[],dirty=false,busy=false,isLocal=false,confirmCallback;
async function api(url,body){const r=await fetch(url,{headers:{"Content-Type":"application/json","x-office-request":"1"},cache:"no-store",...(body===undefined?{}:{method:"POST",body:JSON.stringify(body)})});const data=await r.json();if(!r.ok)throw new Error(data.error||"Không kết nối được máy chủ");return data;}
function notice(text,error=false){$("channels-message").className=error?"error":"success";$("channels-message").textContent=text;}
function setBusy(value){busy=value;$("channel-form").querySelectorAll("button,input,select,textarea").forEach(e=>e.disabled=value);$("add-channel").disabled=value; if(!value&&!isLocal)document.querySelectorAll(".channel-connection input[type=password],.channel-connection .connect-button,.channel-connection .disconnect-button").forEach(e=>e.disabled=true);}
function confirmAction(title,message,callback){confirmCallback=callback;$("channel-confirm-title").textContent=title;$("channel-confirm-message").textContent=message;$("channel-confirm-error").textContent="";$("channel-confirm").showModal();}
$("channel-confirm-close").onclick=()=>$("channel-confirm").close();
$("channel-confirm-save").onclick=async()=>{const button=$("channel-confirm-save");button.disabled=true;try{await confirmCallback();$("channel-confirm").close();}catch(e){$("channel-confirm-error").textContent=e.message;}finally{button.disabled=false;}};
function cardValues(card){return Object.fromEntries([["id",card.dataset.channelId],...[...card.querySelectorAll("[data-field]")].map(f=>[f.dataset.field,f.value])]);}
function values(){return [...document.querySelectorAll(".channel-card")].map(cardValues);}
function computeDirty(){dirty=[...document.querySelectorAll(".channel-card")].some(c=>!c.dataset.channelId||JSON.stringify(cardValues(c))!==c.dataset.savedForm);}
function applyStatus(card,c){card.querySelector(".channel-status").textContent=statuses[c.connectionStatus]||"Chưa kết nối";card.querySelector(".connection-note").textContent=c.canPublish?`Đã xác thực: ${c.connectedName||c.name}. Quyền gửi bài còn được kiểm tra theo nhân viên và nền tảng.`:"Chưa có kết nối hợp lệ. Lưu thông tin kênh, sau đó nhập mã ứng dụng/token và kiểm tra kết nối.";card.querySelector(".disconnect-button").hidden=c.connectionStatus==="not_connected";}
async function save(){
  if(!$("channel-form").reportValidity())throw new Error("Điền tên và đường dẫn cho các kênh trước khi lưu");
  const result=await api("/api/office/channels",{revision,channels:values()});revision=result.revision;savedChannels=result.channels;
  document.querySelectorAll(".channel-card").forEach((card,i)=>{const c=result.channels[i];card.dataset.channelId=c.id;card.querySelector("h2").textContent=c.name;for(const f of card.querySelectorAll("[data-field]"))if(c[f.dataset.field]!==undefined&&c[f.dataset.field]!==null)f.value=c[f.dataset.field];applyStatus(card,c);card.dataset.savedForm=JSON.stringify(cardValues(card));});dirty=false;return result;
}
function card(channel={}){
  const article=node("article",undefined,"panel channel-card");article.dataset.channelId=channel.id||"";
  const head=node("div",undefined,"job-top");head.append(node("h2",channel.name||"Kênh mới"),node("span",statuses[channel.connectionStatus]||"Chưa kết nối","channel-status"));article.append(head);
  function field(name,label,type,value,parent=article,options){const id="channel-"+crypto.randomUUID(),caption=node("label",label),input=node(type);caption.htmlFor=id;input.id=id;input.dataset.field=name;
    if(options)for(const [v,t]of options){const option=node("option",t);option.value=v;input.append(option);}
    else if(type==="input"){input.type=["url","adminUrl","apiRoot"].includes(name)?"url":"text";input.required=["name","url"].includes(name);input.maxLength=name==="name"?100:1000;}
    else{input.rows=4;input.maxLength=4000;}input.value=value||"";parent.append(caption,input);return input;}
  field("name","Tên kênh","input",channel.name);
  const platform=field("platform","Nền tảng","select",channel.platform||"facebook",article,[["facebook","Facebook Fanpage"],["website","Website WordPress"]]);
  const url=field("url","Đường dẫn công khai","input",channel.url);
  const options=[["","Chưa phân công"],...employees.map(e=>[e.id,e.name])];if(channel.employeeId&&!employees.some(e=>e.id===channel.employeeId))options.push([channel.employeeId,"Nhân viên không còn trong đội"]);
  field("employeeId","Nhân viên phụ trách nội dung","select",channel.employeeId,article,options);
  field("purpose","Nội dung và lưu ý cho kênh này","textarea",channel.purpose);
  const connection=node("details",undefined,"channel-connection");connection.open=!channel.canPublish;connection.append(node("summary","Kết nối tài khoản"));article.append(connection);
  const wp=node("div"),fb=node("div");connection.append(wp,fb);
  const admin=field("adminUrl","Đường dẫn quản trị","input",channel.adminUrl,wp);admin.placeholder="https://tenmien.vn/wp-admin/";
  const apiRoot=field("apiRoot","Đường dẫn REST API (để trống dùng wp-json/)","input",channel.apiRoot,wp);apiRoot.placeholder="https://tenmien.vn/wp-json/";
  const username=field("username","Tên đăng nhập WordPress","input",channel.username,wp);username.autocomplete="off";
  function secret(label,parent){const id="secret-"+crypto.randomUUID(),caption=node("label",label),input=node("input");caption.htmlFor=id;input.id=id;input.type="password";input.autocomplete="new-password";input.maxLength=8192;input.placeholder=channel.canPublish?"Đã lưu mã hoá · để trống để giữ mã cũ":"Chỉ nhập ở đây, không ghi vào prompt";parent.append(caption,input);return input;}
  const password=secret("Mật khẩu ứng dụng WordPress",wp);
  const pageId=field("pageId","Page ID (mã số Fanpage)","input",channel.pageId||(()=>{try{return new URL(channel.url).searchParams.get("id")||"";}catch{return "";}})(),fb);pageId.inputMode="numeric";
  field("graphVersion","Phiên bản Graph API của ứng dụng Meta","input",channel.graphVersion||"v25.0",fb);
  field("facebookKind","Loại tài khoản","select",channel.facebookKind||"page",fb,[["page","Fanpage"],["profile","Trang cá nhân · không hỗ trợ đăng qua Pages API"],["unknown","Chưa xác định"]]);
  const token=secret("Page Access Token (không dùng mật khẩu Facebook)",fb);
  fb.append(node("p","Token của đúng Fanpage, cần pages_manage_posts và pages_read_engagement. API quyết định quyền đăng thực tế.","muted"));
  const note=node("p","","muted connection-note");connection.append(note);
  const actions=node("div",undefined,"actions"),connect=node("button","Lưu & kiểm tra kết nối","secondary connect-button"),disconnect=node("button","Ngắt kết nối","secondary disconnect-button");connect.type=disconnect.type="button";actions.append(connect,disconnect);connection.append(actions);
  connect.onclick=async()=>{if(busy||!$("channel-form").reportValidity())return;setBusy(true);try{await save();const result=await api(`/api/office/channels/${article.dataset.channelId}/connect`,{applicationPassword:password.value,pageAccessToken:token.value});password.value=token.value="";applyStatus(article,result.channel);notice("Đã kết nối "+result.channel.name+". Vào Nhân sự để chọn quyền đăng cho từng người.");}catch(e){notice(e.message,true);}finally{setBusy(false);}};
  disconnect.onclick=()=>confirmAction("Ngắt kết nối kênh", "Văn phòng sẽ không gửi thêm bài qua kết nối này. Bài đã đăng được giữ nguyên.",async()=>{const result=await api(`/api/office/channels/${article.dataset.channelId}/disconnect`,{});password.value=token.value="";applyStatus(article,result.channel);notice("Đã ngắt kết nối.");});
  const change=()=>{const website=platform.value==="website";wp.hidden=!website;fb.hidden=website;};platform.onchange=change;change();
  const defaults=()=>{try{const base=new URL(url.value);if(!base.pathname.endsWith("/"))base.pathname+="/";if(platform.value==="website"){if(!admin.value)admin.value=new URL("wp-admin/",base).href;if(!apiRoot.value)apiRoot.value=new URL("wp-json/",base).href;}else if(!pageId.value)pageId.value=base.searchParams.get("id")||"";}catch{}};url.onchange=defaults;
  const deleteButton=node("button","Xoá kênh","secondary danger");deleteButton.type="button";deleteButton.onclick=()=>confirmAction("Xoá kênh",`Gỡ “${article.querySelector('h2').textContent}” khỏi văn phòng và xoá kết nối đã lưu? Bài trên Facebook/website được giữ nguyên.`,async()=>{
    const id=article.dataset.channelId;if(id){const result=await api("/api/office/channels",{revision,channels:savedChannels.filter(c=>c.id!==id)});revision=result.revision;savedChannels=result.channels;}
    article.remove();computeDirty();notice("Đã xoá kênh khỏi văn phòng.");
  });article.append(deleteButton);
  article.append(node("p","Chọn quyền của từng nhân viên tại Nhân sự. Việc phân công phụ trách nội dung không tự cấp quyền đăng.","muted"));applyStatus(article,channel);
  if(!isLocal)connection.append(node("p","Kết nối tài khoản cần mở trang này trực tiếp trên máy nhà.","muted"));if(channel.id)article.dataset.savedForm=JSON.stringify(cardValues(article));return article;
}
async function load(){setBusy(true);try{const[data,state]=await Promise.all([api("/api/office/channels"),api("/api/office")]);employees=state.employees;isLocal=state.local;revision=data.revision;savedChannels=data.channels;$("channels-list").replaceChildren(...data.channels.map(card));dirty=false;$("channels-message").textContent="";}catch(e){notice(e.message,true);}finally{setBusy(false);$("save-channels").disabled=!revision;}}
$("add-channel").onclick=()=>{if(!revision||busy)return;if(document.querySelectorAll(".channel-card").length>=20){notice("Tối đa 20 kênh",true);return;}const c=card();$("channels-list").append(c);c.querySelector('input').focus();dirty=true;};
$("channel-form").addEventListener("input",()=>{dirty=true;});
$("reload-channels").onclick=()=>{if(!dirty)load();else confirmAction("Tải lại danh sách","Bỏ thay đổi chưa lưu và tải danh sách mới?",load);};
$("channel-form").onsubmit=async(event)=>{event.preventDefault();if(busy)return;setBusy(true);try{await save();notice("Đã lưu kênh. Kết nối tài khoản rồi cấp quyền cho nhân viên để bắt đầu đăng.");}catch(e){notice(e.message,true);}finally{setBusy(false);}};
async function publications(){try{const {posts}=await api("/api/office/publications");$("publications-list").replaceChildren(...posts.map(p=>{
  const card=node("article",undefined,"panel publication-card"),head=node("div",undefined,"job-top");head.append(node("h3",p.title),node("span",statuses[p.status]||p.status,"channel-status"));card.append(head,node("p",p.employeeName+" → "+p.channelName,"muted"));
  const details=node("details");details.append(node("summary","Xem nội dung bài"),node("pre",p.content));for(const [i,f]of p.files.entries()){const a=node("a",f.name);a.href=`/api/office/publications/${p.id}/media/${i}`;a.target="_blank";a.rel="noopener";details.append(a);}card.append(details);
  if(p.error)card.append(node("p",p.error,p.status==="processing"?"muted":"error"));
  if(p.url){const a=node("a","Mở bài đã đăng ↗","text-button");a.href=p.url;a.target="_blank";a.rel="noopener noreferrer";card.append(a);}
  const actions=node("div",undefined,"actions");
  for(const [action,label]of p.status==="awaiting_review"?[["approve","Duyệt & đăng"],["cancel","Huỷ yêu cầu"]]:["blocked","failed"].includes(p.status)?[["retry","Thử lại"],["cancel","Huỷ yêu cầu"]]:p.status==="queued"?[["cancel","Huỷ yêu cầu"]]:[]){const b=node("button",label,"secondary");b.type="button";b.onclick=()=>confirmAction(label,action==="approve"?`Đăng công khai bài “${p.title}” lên ${p.channelName}?`:label+" yêu cầu này?",async()=>{await api(`/api/office/publications/${p.id}/${action}`,{});await publications();});actions.append(b);}card.append(actions);return card;
  }));if(!posts.length)$("publications-list").append(node("p","Chưa có yêu cầu đăng bài.","muted"));}catch(e){$("publications-message").textContent=e.message;}}
$("refresh-publications").onclick=publications;
window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue="";}});
load();publications();setInterval(()=>{if(!document.hidden&&!$("channel-confirm").open)publications();},5000);
