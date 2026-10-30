#!/usr/bin/env node
// Ghi sổ cấu hình phòng marketing. Công việc và bàn giao do ứng dụng quản lý.
"use strict";
const fs=require("fs"),path=require("path"),{loadConfig}=require("../lib/config");
const root=path.resolve(__dirname,".."),cfg=loadConfig(root),dataDir=process.env.VP_DATA?path.resolve(process.env.VP_DATA):cfg?.dataDir||path.join(root,"data");
const [kind,action]=process.argv.slice(2);
if(!kind||["giup","help","--help"].includes(kind))console.log("Phòng marketing Lifesport\nGiao việc, bàn giao, báo cáo, nhân sự và kinh nghiệm: dùng giao diện web.\nnode tools/vp.js noiquy xem|luu\nnode tools/vp.js kenh xem|luu\nLệnh luu nhận JSON kèm revision qua stdin. Không dùng sổ DEV, gói code hoặc hòm thư kỹ thuật.");
else {
 try {
  if(!["noiquy","kenh"].includes(kind))throw Object.assign(new Error("Lệnh điều phối cũ đã ngừng sử dụng. Dùng mục Công việc trên web."),{status:410});
  const service=require(kind==="noiquy"?"../lib/office-rules":"../lib/office-channels"),read=kind==="noiquy"?service.readRules:service.readChannels,save=kind==="noiquy"?service.saveRules:service.saveChannels;
  if(action==="xem")console.log(JSON.stringify(read(dataDir)));
  else if(action==="luu"){const input=fs.readFileSync(0,"utf8");if(Buffer.byteLength(input)>(kind==="noiquy"?512000:160000))throw Object.assign(new Error("Dữ liệu quá dài"),{status:413});console.log(JSON.stringify(save(dataDir,JSON.parse(input))));}
  else throw new Error("Dùng xem hoặc luu");
 }catch(e){console.log(JSON.stringify({error:e.message,status:e.status||400}));process.exitCode=1;}
}
