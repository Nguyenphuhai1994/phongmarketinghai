"use strict";
(() => {
  if (window.top !== window) return;
  const page = location.pathname.split("/").pop() || "index.html";
  document.body.classList.add("office-shell");
  document.body.classList.add("office-" + page.replace(/\.html$/, ""));
  if (page === "index.html") document.body.classList.add("office-3d");
  const nav = document.createElement("nav"); nav.className = "office-nav"; nav.setAttribute("aria-label", "Điều hướng văn phòng");
  const back = document.createElement("a"); back.href = "./"; back.className = "office-home"; back.textContent = "← Văn phòng"; nav.append(back);
  for (const [file, name] of [["board.html", "Bảng điều hành"], ["giaoviec.html", "Công việc"], ["nhansu.html", "Nhân sự"], ["kenh-dang.html", "Kênh đăng"], ["noiquy.html", "Nội quy"], ["kinhnghiem.html", "Kinh nghiệm"]]) {
    const a = document.createElement("a"); a.href = file; a.textContent = name; if (page === file) a.setAttribute("aria-current", "page"); nav.append(a);
  }
  for(const [file,name] of [["giaoviec.html?report=1#job-report","Báo cáo"],["2d.html","Sơ đồ đội"]]) {const a=document.createElement("a");a.href=file;a.textContent=name;nav.append(a);}
  document.body.prepend(nav);
  const measure = () => document.documentElement.style.setProperty("--office-nav-height", nav.offsetHeight + "px");
  new ResizeObserver(measure).observe(nav); measure();
})();
