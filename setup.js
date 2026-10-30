// Khởi tạo phòng marketing, không chèn luật vào dự án khác và không quét phiên AI.
"use strict";
const fs=require("fs"),path=require("path"),{DEFAULTS}=require("./lib/config");
const root=__dirname,file=path.join(root,"config.json");
if(!fs.existsSync(file)){
 const staff=[["dat-codex","Đạt Codex","Công cụ và tự động hoá hỗ trợ marketing","codex"],["nhan-editor","Nhân editor","Dựng và biên tập video","claude"],["manh-design","Mạnh design","Thiết kế hình ảnh","claude"],["nhi-design","Nhi design","Thiết kế hình ảnh","claude"],["trinh-content","Trinh content","Viết nội dung","claude"],["ninh-web","Ninh Web","Thiết kế và tối ưu website","codex"],["tro-ly-hai","Trợ lý anh Hải","Chuẩn bị và đăng bài theo quyền kênh","codex"]].map(([key,name,role,room])=>({key,name,role,room,roster:true}));
 fs.writeFileSync(file,JSON.stringify({...DEFAULTS,staff},null,2)+"\n",{mode:0o600});console.log("Đã tạo cấu hình phòng marketing.");
}
const cfg=require("./lib/config").loadConfig(root);fs.mkdirSync(path.join(cfg.dataDir,"control"),{recursive:true});
const rules=path.join(cfg.dataDir,"NOI-QUY.md");if(!fs.existsSync(rules))fs.copyFileSync(path.join(root,"mau/NOI-QUY.md"),rules);
console.log("Giữ nguyên cấu hình và dữ liệu đã có. Chạy npm start rồi mở http://localhost:"+cfg.port+". Quản lý nhân sự, prompt, kênh và lịch ngay trên web.");
