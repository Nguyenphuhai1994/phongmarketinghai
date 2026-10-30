// Cấu hình Phòng marketing Lifesport. Không theo dõi nhật ký dự án khác.
"use strict";
const fs=require("fs"),path=require("path");
const DEFAULTS={title:"Phòng marketing Lifesport",subtitle:"Nội dung · Thiết kế · Video · Website · Xuất bản",ownerName:"Hải trưởng phòng",port:7788,host:"127.0.0.1",dataDir:"data",staff:[],accessKey:"",workerNetworkAccess:true,jobTimeoutMinutes:60};
function loadConfig(root){const file=path.join(root,"config.json");if(!fs.existsSync(file))return null;const user=JSON.parse(fs.readFileSync(file,"utf8").replace(/^﻿/,""));return {...DEFAULTS,...user,dataDir:path.resolve(root,user.dataDir||"data")};}
module.exports={loadConfig,DEFAULTS};
