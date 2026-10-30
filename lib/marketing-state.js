"use strict";
// Nguồn duy nhất cho văn phòng: công việc marketing do ứng dụng quản lý.
// Không quét chat, nhật ký dự án lập trình, Docker hoặc sổ DEV trên máy.
function marketingState(view,cfg={}) {
 const now=view.runtime?.now||Date.now(),jobs=view.jobs.filter(j=>!j.deletedAt),byId=new Map(jobs.map(j=>[j.id,j]));
 const pending=new Set(["queued","scheduled"]),problem=new Set(["failed","blocked","interrupted","rejected"]);
 const agents=[{key:"ceo",name:cfg.ownerName||"Hải trưởng phòng",role:"Điều phối, đánh giá và định hướng",room:"ceo",platform:"human",status:"idle",flag:"",where:"ceo",lastText:"Điều hành Phòng marketing Lifesport",lastActive:now,sub:0}];
 for(const e of view.employees) {
  const assigned=jobs.filter(j=>j.employeeId===e.id).sort((a,b)=>b.createdAt-a.createdAt);
  const current=assigned.find(j=>j.status==="running")||assigned.find(j=>j.status==="queued")||assigned.find(j=>j.status==="scheduled")||assigned[0];
  const status=current?.status;
  agents.push({key:e.id,employeeId:e.id,name:e.name,role:e.role,room:e.room==="claude"?"claude":"codex",platform:"codex",where:e.room==="claude"?"claude":"codex",status:!e.enabled?"away":status==="running"?"active":"idle",flag:problem.has(status)?"blocked":pending.has(status)?"waiting":status==="review"?"review":"",lastActive:current?.finishedAt||current?.startedAt||current?.createdAt||now,lastText:current?(current.title+" · "+(current.error||current.progress||current.result||status)).slice(0,700):"Sẵn sàng nhận việc",jobId:current?.id||null,sub:0});
 }
 const events=[];
 for(const j of jobs){const parent=byId.get(j.parentJobId);events.push({t:j.createdAt,kind:parent?"msg":"ceo",from:parent?.employeeId||"ceo",to:j.employeeId,title:parent?"Bàn giao: "+j.title:"Giao việc: "+j.title});if(j.finishedAt)events.push({t:j.finishedAt,kind:"report",from:j.employeeId,to:"ceo",title:(problem.has(j.status)?"[CHẶN] ":"")+j.title,body:(j.error||j.result||j.progress||"").slice(0,700)});}
 const summary={total:jobs.length,running:jobs.filter(j=>j.status==="running").length,queued:jobs.filter(j=>pending.has(j.status)).length,review:jobs.filter(j=>j.status==="review").length,approved:jobs.filter(j=>j.status==="completed").length,attention:jobs.filter(j=>problem.has(j.status)||j.overdue).length};
 return {now,title:cfg.title||"Phòng marketing Lifesport",subtitle:"Nội dung · Thiết kế · Video · Website · Xuất bản",ownerName:cfg.ownerName||"Hải trưởng phòng",agents,events:events.sort((a,b)=>a.t-b.t).slice(-150),summary,asks:jobs.filter(j=>j.status==="review"||problem.has(j.status)),channels:view.channels.map(c=>({id:c.id,name:c.name,connected:c.canPublish})),published:view.jobs.flatMap(j=>j.publications||[]).filter(p=>p.status==="published").length};
}
module.exports={marketingState};
