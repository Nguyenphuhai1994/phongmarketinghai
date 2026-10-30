# Phòng marketing AI Lifesport

Ứng dụng giúp Hải trưởng phòng giao mục tiêu, điều phối nhân viên AI, nhận sản phẩm và quản lý xuất bản. Đội làm nội dung, hình ảnh, video, website và công cụ hỗ trợ marketing. Văn phòng 3D là góc nhìn hoạt động của đội; dữ liệu công việc trên web là nguồn điều hành.

## Vận hành

Mở **http://localhost:7788/**. Các mục chính:

- **Bảng điều hành:** việc đang làm, chờ duyệt, vướng mắc, đội ngũ, chiến dịch và kênh đăng.
- **Công việc:** giao yêu cầu và tài liệu, đặt lịch, chọn chuỗi bàn giao, xem sản phẩm, góp ý, làm lại, chuyển người, duyệt hoặc xoá/khôi phục.
- **Nhân sự:** thêm/sửa người, prompt chuyên môn và quyền đăng trên từng kênh.
- **Kênh đăng:** kết nối WordPress/Fanpage, quản lý yêu cầu và xác nhận bài đã xuất bản.
- **Nội quy:** nguyên tắc chung của phòng marketing, có thể chỉnh ngay trên web.
- **Kinh nghiệm:** lưu sở thích, bài học và mẫu đã duyệt theo phạm vi, có thể sửa, tạm ngừng, xoá/khôi phục.
- **Báo cáo:** tổng hợp công việc theo ngày/tuần/tháng hoặc khoảng tuỳ chọn, nhân viên và trạng thái. Không dùng lượt chạy AI hoặc số lệnh để tự xếp hạng chất lượng marketing.
- **Sơ đồ đội:** thành viên và nhiệm vụ lấy từ hồ sơ thực tế.

Hải giao việc → nhân viên phụ trách thực hiện → bàn giao kết quả và tệp cho đồng nghiệp → hoàn thiện, duyệt / đăng theo quyền kênh. Có thể dùng chuỗi cố định hoặc cho nhân viên tự giao phần việc trong chiến dịch.

Mỗi lượt tạo một phiên Codex CLI theo vai trò, nội quy và kinh nghiệm phù hợp. Hiện xử lý một việc cùng lúc. Máy cần bật, có Internet và tài khoản Codex còn sử dụng được. Chức danh không tự cung cấp công cụ tạo ảnh/video. Không cần tạo các chat riêng để kích hoạt nhân viên.

## Cài từ GitHub trên máy khác

Có thể gửi link kho cho một agent có quyền thao tác máy, kèm câu yêu cầu:

> Hãy cài Phòng marketing AI từ https://github.com/Nguyenphuhai1994/phongmarketinghai vào máy của tôi. Đọc HUONG-DAN-CHO-AGENT.md và làm theo: tải mã, kiểm tra công cụ, khởi tạo, chạy, kiểm tra rồi hướng dẫn tôi sử dụng. Giữ nguyên dữ liệu nếu đã có bản cài; không đăng thử bài lên kênh thật.

Hướng dẫn đầy đủ cho cả agent và người tự cài: **[HUONG-DAN-CHO-AGENT.md](HUONG-DAN-CHO-AGENT.md)**.

Cài tay sau khi chuẩn bị Node.js/npm, Git và Codex CLI đã đăng nhập:

```sh
git clone https://github.com/Nguyenphuhai1994/phongmarketinghai.git
cd phongmarketinghai
npm run setup
npm test
npm start
```

Mở [http://localhost:7788/](http://localhost:7788/). Có thể dùng **Code → Download ZIP** trên GitHub thay cho clone. Không cần chạy `npm install` trong kho; Codex CLI là công cụ cài riêng. Hướng dẫn chi tiết có lệnh cài Codex và đăng nhập theo tài liệu OpenAI.

Máy mới tạo bảy hồ sơ nhân viên cơ bản; người cài tự đặt prompt, thương hiệu, nội quy, kinh nghiệm và kết nối kênh của mình. Dữ liệu/tài khoản của Hải không nằm trong bản clone. Hiện tính năng tự chạy và kho kết nối xuất bản dùng macOS; Windows/Linux cần kiểm tra và bổ sung phần tương ứng trước khi cam kết đủ chức năng.

Nếu máy đã cài dịch vụ tự chạy thì dùng dịch vụ đó, không mở thêm server. Trên macOS, `npm run service:install` cài chế độ chạy khi đăng nhập; `node scripts/reload-office.js` nạp bản mới khi không có công việc/bài đăng đang chạy.

Cần đẩy phiên bản mới lên GitHub trước khi chia sẻ để người nhận có mã và hướng dẫn này. Không đưa `config.json`, `data/` hoặc thông tin đăng nhập lên kho.

Hướng dẫn vận hành sau cài: [VAN-HANH-WEB.md](VAN-HANH-WEB.md).

## Dữ liệu và tài khoản

Công việc, nhân sự và quyền lưu tại `data/control/jobs.json`; sản phẩm tại `data/control/work/`; nội quy tại `data/NOI-QUY.md`; kinh nghiệm tại `data/control/memories.json`. Thông tin kết nối kênh được mã hoá và không đưa vào prompt nhân viên. Sao lưu thư mục dữ liệu và khoá mã hoá theo hướng dẫn vận hành.

Nội dung công việc được gửi qua Codex tới dịch vụ AI. Khi xuất bản, hệ thống gửi bài và tư liệu tới đúng kênh được giao và cấp quyền. Không quét nhật ký các dự án lập trình hoặc đọc chat ngoài công việc của văn phòng.

Gắn domain qua HTTPS về máy nhà sau khi đặt mật khẩu truy cập từ xa. Khi có quyền `publish`, nhân viên chỉ được yêu cầu đăng công việc được giao lên đúng kênh; quyền `review` đưa vào hàng chờ duyệt.

## Kiểm tra

```sh
npm test
```

Quy trình DEV, gói code, hòm thư kỹ thuật và bảng chấm điểm lập trình của bản cũ đã ngừng sử dụng. Mã trước chuyển đổi được giữ ngoài thư mục phục vụ web tại `archive/programming-20261030/`; sổ cũ không được dùng làm nguồn điều hành. Công việc, sản phẩm, prompt, kết nối và quyền hiện có được giữ nguyên.
