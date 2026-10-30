"use strict";
window.MemoryChoice = {
  mount(formId,prefix) {
    const form=document.getElementById(formId),box=document.createElement("fieldset");box.className="learning-choice";
    box.innerHTML=`<legend>Ghi nhớ góp ý</legend><label for="${prefix}-learn">Áp dụng góp ý này</label><select id="${prefix}-learn"><option value="once">Chỉ sửa việc này</option><option value="remember">Nhớ cho lần sau</option></select><div id="${prefix}-learning-fields" hidden><label for="${prefix}-scope">Phạm vi ghi nhớ</label><select id="${prefix}-scope"><option value="employee">Riêng nhân viên nhận góp ý</option><option value="team">Cả phòng</option><option value="campaign">Chỉ chiến dịch này</option></select><label for="${prefix}-keywords">Chỉ áp dụng khi có từ khoá (không bắt buộc)</label><input id="${prefix}-keywords" maxlength="300" placeholder="Ví dụ: Facebook, khai trương"><p class="muted">Nội dung ghi chú sẽ được lưu nguyên văn. Chỉ ghi quy tắc muốn dùng lâu dài; không ghi mật khẩu, token hoặc thông tin tài khoản. Nhiều từ khoá cách nhau bằng dấu phẩy; trống nghĩa là mọi việc trong phạm vi.</p></div>`;
    form.querySelector(".attachment-box").before(box);
    document.getElementById(prefix+"-learn").onchange=()=>{document.getElementById(prefix+"-learning-fields").hidden=document.getElementById(prefix+"-learn").value!=="remember";};
  },
  reset(prefix) {document.getElementById(prefix+"-learn").value="once";document.getElementById(prefix+"-scope").value="employee";document.getElementById(prefix+"-keywords").value="";document.getElementById(prefix+"-learning-fields").hidden=true;},
  values(prefix) {return {remember:document.getElementById(prefix+"-learn").value==="remember",memoryScope:document.getElementById(prefix+"-scope").value,memoryKeywords:document.getElementById(prefix+"-keywords").value};}
};
