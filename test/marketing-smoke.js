"use strict";
// Chỉ đọc văn phòng đang chạy. Không tạo việc hoặc gọi kênh xuất bản.
const assert=require("node:assert/strict");
(async()=>{
 const base="http://127.0.0.1:7788",get=async p=>{const r=await fetch(base+p,{signal:AbortSignal.timeout(5000)});assert.equal(r.status,200,p);return r.json();};
 const [office,state,rules]=await Promise.all([get('/api/office'),get('/state'),get('/api/office/rules')]);
 assert.equal(state.agents.length,office.employees.length+1);assert.equal(new Set(state.agents.map(a=>a.key)).size,state.agents.length);
 assert.equal(state.summary.total,office.jobs.filter(j=>!j.deletedAt).length);assert.equal(state.dev,undefined);assert.equal(state.money,undefined);assert.ok(rules.content.startsWith('# Nội quy Phòng marketing Lifesport'));
 for(const p of ['/perf','/perf-events','/docs','/hopthu','/tongquan','/chat/pin']){const r=await fetch(base+p);assert.equal(r.status,410,p);}
 const stream=await fetch(base+'/events',{signal:AbortSignal.timeout(5000)}),reader=stream.body.getReader(),first=await reader.read();assert.ok(new TextDecoder().decode(first.value).startsWith('data: '));await reader.cancel();
 for(const p of ['/board.html','/noiquy.html','/giaoviec.html','/nhansu.html','/kinhnghiem.html','/kenh-dang.html','/2d.html']){const r=await fetch(base+p);assert.equal(r.status,200,p);}
 console.log(JSON.stringify({ok:true,employees:office.employees.length,jobs:office.jobs.length,activeJobs:state.summary.total,published:state.published,channels:office.channels.map(c=>({name:c.name,connected:c.canPublish})),oldTechnicalRoutes:410,liveEvents:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
