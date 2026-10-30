"use strict";
const assert=require('node:assert/strict');
(async()=>{
 const base='http://localhost:7790';async function api(route,body,expected){const r=await fetch(base+route,{headers:{'Content-Type':'application/json','x-office-request':'1'},...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)})});const data=await r.json();if(expected)assert.equal(r.status,expected,JSON.stringify(data));else assert(r.ok,JSON.stringify(data));return data;}
 let channels=await api('/api/office/channels');assert.equal(channels.channels.length,2);
 await api('/api/office/channels/web-test/connect',{applicationPassword:'TEST_ONLY'});
 await api('/api/office/channels/fb-test/connect',{pageAccessToken:'TEST_ONLY'});
 channels=await api('/api/office/channels');assert(channels.channels.every(c=>c.canPublish));assert(!JSON.stringify(channels).includes('TEST_ONLY'));
 let state=await api('/api/office'),e=state.employees.find(e=>e.id==='trinh');
 await api('/api/office/employees/trinh',{...e,channelPermissions:{'unknown':'publish'}},400);
 const {employee}=await api('/api/office/employees/trinh',{...e,channelPermissions:{'web-test':'review','fb-test':'publish'}});assert.equal(employee.channelPermissions['fb-test'],'publish');
 const posts=await api('/api/office/publications');const post=posts.posts.find(p=>p.status==='awaiting_review');assert(post);
 await api(`/api/office/publications/${post.id}/approve`,{});
 let receipt;for(let i=0;i<30;i++){receipt=(await api('/api/office/publications')).posts.find(p=>p.id===post.id);if(receipt.status==='published')break;await new Promise(r=>setTimeout(r,100));}assert.equal(receipt.status,'published');assert.equal(receipt.url,'https://site.example/post/123');
 await api(`/api/office/publications/${post.id}/retry`,{},409);
 const remote=await fetch(base+'/api/office/channels/web-test/connect',{method:'POST',headers:{'Content-Type':'application/json','x-office-request':'1','x-forwarded-for':'203.0.113.1'},body:JSON.stringify({applicationPassword:'TEST_ONLY'})});assert.equal(remote.status,401);
 console.log(JSON.stringify({ok:true,checks:['kết nối API giả','không lộ mã','quyền từng kênh','duyệt rồi đăng','nhận link bài','chống gửi trùng','chặn kết nối tài khoản từ xa']}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
