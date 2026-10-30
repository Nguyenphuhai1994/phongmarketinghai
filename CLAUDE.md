# Dành cho agent AI

Nếu người dùng gửi link kho để cài phòng marketing AI, đọc và thực hiện HUONG-DAN-CHO-AGENT.md: tải mã, kiểm tra công cụ, khởi tạo, chạy, kiểm tra rồi bàn giao cách dùng.

Ứng dụng vận hành phòng marketing, không quét nhật ký các dự án lập trình khác. Giao diện ở public/; máy chủ ở server.js và lib/; công cụ ghi cấu hình, bộ nhớ và xuất bản ở tools/. Công việc/nhân sự lưu trong data/control/; nội quy ở data/NOI-QUY.md. Không sửa trực tiếp hàng đợi khi dịch vụ đang chạy. Không thêm thư viện ngoài khi không cần thiết.

Giữ nguyên dữ liệu, prompt và quyền hiện có. Không đưa config.json, data/, tài khoản Codex, mật khẩu, token hoặc khoá mã hoá lên GitHub. Không gửi dữ liệu ra ngoài ngoài luồng AI/xuất bản đã được người dùng giao và cấp quyền. Mã cũ trong archive/ chỉ để đối chiếu, không dùng để vận hành.
