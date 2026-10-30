# Cài Phòng marketing AI từ GitHub — hướng dẫn cho agent

Nếu người dùng gửi link kho này và yêu cầu cài văn phòng: thực hiện trọn luồng **tải mã → kiểm tra công cụ → khởi tạo → chạy → kiểm tra → bàn giao cách dùng**. Không chỉ trả lại một danh sách lệnh. Đây là ứng dụng vận hành phòng marketing bằng các phiên Codex CLI, gồm giao việc, sản phẩm, phối hợp, duyệt, xuất bản và kinh nghiệm.

## 1. Câu yêu cầu để người dùng gửi cho AI

Người dùng có thể sao chép nguyên đoạn này vào Codex hoặc một agent có quyền thao tác máy:

> Hãy cài Phòng marketing AI từ https://github.com/Nguyenphuhai1994/phongmarketinghai.git vào máy của tôi. Đọc HUONG-DAN-CHO-AGENT.md trong kho và làm theo. Hãy kiểm tra công cụ, tải mã, khởi tạo, chạy và kiểm tra giao diện; hướng dẫn tôi đăng nhập tài khoản cần thiết. Giữ nguyên dữ liệu nếu máy đã có bản cài, không đăng thử lên mạng xã hội hoặc website. Cuối cùng gửi tôi địa chỉ mở văn phòng và cách giao việc đầu tiên.

Agent cần có công cụ chạy lệnh và đọc/ghi tệp trên máy đích. Một cuộc chat chỉ trả lời văn bản hoặc agent chạy trên máy khác không tự cài phần mềm vào máy người dùng. Nếu chưa có agent, dùng cách cài tay ở mục 3.

## 2. Điều kiện và giới hạn cần nói rõ

- Máy có Node.js và npm. Ứng dụng yêu cầu Node.js từ 18 trở lên; dùng bản LTS còn được hỗ trợ và tương thích với Codex CLI đang cài.
- Có Git nếu dùng cách clone; có thể tải ZIP từ GitHub nếu không dùng Git.
- Có Codex CLI chạy được và đăng nhập bằng tài khoản của người cài. Cài Codex app không tự chứng minh lệnh `codex` đã có trong PATH.
- Có Internet khi chạy AI, tải thư viện hiển thị 3D hoặc đăng bài. Máy phải bật và không ngủ khi cần thực hiện lịch. Các lượt AI dùng tài khoản/hạn mức của người cài, không dùng tài khoản của người chia sẻ kho.
- **Bản đầy đủ hiện được triển khai trên macOS:** tự chạy dùng LaunchAgent; kho tài khoản kênh dùng macOS Keychain. Trên Windows/Linux, không cam kết chức năng kết nối/xuất bản hoạt động nguyên trạng: kho Keychain chưa hỗ trợ các hệ đó. Cần kiểm tra riêng việc chạy Codex và giao việc; không nhận đã cài đủ tính năng nếu chưa kiểm chứng.
- Xem PDF trực tiếp cần hai lệnh Poppler `pdfinfo`, `pdftoppm`. Thiếu chúng vẫn có thể tải PDF về; báo rõ giới hạn xem tại chỗ. Không bắt cài Poppler nếu người dùng chưa cần PDF.
- Chức danh Nhân editor/Nhi design không tự cài công cụ dựng video/tạo ảnh. Kiểm tra công cụ thực tế trước khi nhận làm được các loại sản phẩm đó.

## 3. Cài tay từ máy mới

### 3.1. Chuẩn bị

Cài Node.js từ [trang chính thức Node.js](https://nodejs.org/), và Git nếu dùng clone. Mở Terminal rồi kiểm tra:

```sh
node --version
npm --version
git --version
```

Nếu chưa có Codex CLI, có thể cài qua npm:

```sh
npm install -g @openai/codex@latest
codex --version
```

Lệnh npm được nêu trong [hướng dẫn chính thức của OpenAI](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex#quickstart-using-goals). Chạy `codex` rồi hoàn thành đăng nhập theo [hướng dẫn Codex CLI](https://learn.chatgpt.com/docs/codex/cli). Người dùng tự nhập thông tin đăng nhập và xác thực; agent không yêu cầu gửi mật khẩu, token hoặc chép thông tin tài khoản vào chat.

### 3.2. Lấy mã

Trong thư mục người dùng chọn để đặt văn phòng:

```sh
git clone https://github.com/Nguyenphuhai1994/phongmarketinghai.git
cd van-phong-marketing
```

Nếu tải ZIP: mở trang kho GitHub → **Code → Download ZIP**, giải nén, rồi mở Terminal trong thư mục có `package.json`, `server.js`, `setup.js`. Nếu kho riêng tư, người nhận cần được chủ kho cấp quyền và đăng nhập GitHub bằng tài khoản của họ.

Không clone đè hoặc xoá thư mục đã có. Với bản cài cũ, đọc mục 7 trước khi cập nhật.

### 3.3. Khởi tạo và chạy

```sh
npm run setup
npm test
npm start
```

Ứng dụng dùng thư viện Node.js có sẵn, không cần chạy `npm install` trong kho. Lệnh cài Codex ở trên là cài công cụ thực thi riêng.

Mở [http://localhost:7788/](http://localhost:7788/). Giữ Terminal chạy; dừng bằng Ctrl+C khi không cần nữa. Nếu cổng 7788 đã có dịch vụ khác, không tự dừng dịch vụ đó: dùng một cổng trống trong `config.json`, khởi chạy rồi báo đúng địa chỉ mới.

`npm run setup` tạo `config.json`, thư mục dữ liệu và nội quy marketing nếu chưa có. Lúc server khởi động, bảy hồ sơ nhân viên cơ bản được tạo. Thiết lập chi tiết trên web theo mục 5.

## 4. Quy trình agent thực hiện khi được nhờ cài

1. Đọc README.md và VAN-HANH-WEB.md. Xác định hệ điều hành, thư mục đích và bản cài/dịch vụ có sẵn. Kiểm tra phiên bản Node.js, npm, Git và Codex; không in thông tin xác thực.
2. Tải đúng kho được người dùng chia sẻ. Không lấy bản trong `archive/` để chạy. Nếu thư mục đích đã có dữ liệu, giữ nguyên và xác định phiên bản trước khi cập nhật.
3. Chuẩn bị công cụ còn thiếu theo nguồn chính thức. Nếu bị giới hạn quyền hoặc cần người dùng đăng nhập, nói rõ bước cần họ thực hiện rồi tiếp tục phần có thể làm. Không dùng chế độ bỏ sandbox để né lỗi.
4. Chạy `npm run setup`, kiểm tra cấu hình và `npm test`. Không sao chép dữ liệu hoặc tài khoản của chủ kho vào máy mới.
5. Khởi chạy server bằng tiến trình lâu dài phù hợp môi trường. Không chỉ chạy trong một công cụ sẽ tự giết tiến trình khi kết thúc phiên rồi nhận đã cài xong. Kiểm tra tiến trình còn sống và trang trả lời sau khi khởi chạy.
6. Thực hiện các kiểm tra ở mục 6. Nếu có trình duyệt, mở trang thực tế. Nếu không có, kiểm tra HTTP và ghi rõ chưa xác minh giao diện bằng trình duyệt.
7. Chỉ cài tự chạy khi người dùng muốn; dùng mục 8 trên macOS. Không tự gắn domain, mở cổng ra Internet hoặc kết nối tài khoản kênh của người khác.
8. Báo kết quả bằng tiếng Việt: thư mục đã cài, địa chỉ mở, cách chạy/dừng, công cụ đã kiểm, giới hạn còn lại và việc đầu tiên người dùng cần thiết lập. Không báo “đã vận hành đủ” khi mới chỉ mở được trang.

## 5. Thiết lập lần đầu trên web

1. **Tên phòng / người điều phối:** sửa `title`, `subtitle`, `ownerName` trong `config.json` nếu muốn cá nhân hoá tên mặc định Lifesport/Hải; nạp lại server khi không có việc đang chạy.
2. **Nhân sự:** đã có Đạt Codex, Nhân editor, Mạnh design, Nhi design, Trinh content, Ninh Web và Trợ lý Hải ở mức hồ sơ cơ bản. Sửa tên, chuyên môn và prompt chi tiết, thêm người hoặc tạm dừng theo đội thực tế. Bản clone không mang theo prompt riêng đã nhập trên máy của chủ kho.
3. **Nội quy:** đọc và chỉnh nguyên tắc marketing cho thương hiệu của người cài.
4. **Kinh nghiệm:** ban đầu chưa có bộ nhớ cá nhân. Lưu hướng dẫn hoặc chọn Nhớ cho lần sau khi góp ý; không coi toàn bộ hội thoại cũ là đã được chuyển sang máy mới.
5. **Kênh đăng:** tự thêm kênh của mình, kết nối WordPress bằng mật khẩu ứng dụng hoặc Fanpage bằng token phù hợp theo giao diện; sau đó cấp quyền cho nhân viên theo từng kênh. Mặc định chưa có tài khoản, kênh kết nối hoặc quyền xuất bản từ máy của chủ kho.
6. **Công việc đầu tiên:** giao yêu cầu ngắn, chưa xuất bản, ví dụ “Trinh viết 3 caption ngắn cho sản phẩm theo tài liệu đính kèm; chỉ trả bản nháp”. Xem kết quả và góp ý trước khi thử chuỗi Trinh → Nhi → trợ lý đăng bài.

Quyền đăng và tài khoản là hai phần riêng: phân công phụ trách nội dung không tự cấp quyền; `review` soạn chờ duyệt, `publish` cho phép hệ thống đăng trực tiếp đúng nhiệm vụ và kênh đã giao.

## 6. Kiểm tra sau cài

- Server trả HTTP thành công tại `/`, `/board.html`, `/giaoviec.html`, `/nhansu.html`, `/kenh-dang.html`, `/noiquy.html`, `/kinhnghiem.html`, `/2d.html`.
- Trên chính máy vừa cài, `/api/office` trả danh sách nhân viên và trạng thái hàng đợi; `/state` có một nhân vật cho mỗi nhân viên và một người điều phối. Nếu chọn cổng khác, dùng đúng cổng trong mọi URL.
- Bảng điều hành hiển thị công việc marketing. Một máy mới chưa có việc phải có số liệu rỗng/0, không hiện chiến dịch hoặc bài đã đăng của người khác.
- Giao một việc thử ngắn không xuất bản để xác minh Codex thực sự chạy và có kết quả; dùng dữ liệu thử, không đăng bài thật để “test”. Nếu chưa đăng nhập, hết hạn mức hoặc mô hình quá tải, báo lỗi cụ thể và hướng dẫn chạy lại sau khi xử lý.
- Nếu muốn kiểm tra bàn giao, dùng chuỗi hai người với tệp đầu ra đơn giản. Chỉ nói đã kiểm tra chuỗi sau khi người nhận thật sự nhận được tệp.
- Các tính năng ảnh/video/PDF/kênh đăng được ghi riêng là đã kiểm hay chưa có công cụ/tài khoản để kiểm. Không suy ra “có giao diện” nghĩa là “tất cả tích hợp đã hoạt động”.

Không chạy `test/marketing-smoke.js` trên bản cài mới rồi kết luận thất bại chỉ vì bài đăng chưa có; đó là kiểm tra cấu hình hiện có trên máy phát triển với cổng mặc định. Các kiểm thử tự động chung chạy bằng `npm test`.

## 7. Nếu máy đã có bản cài

- Không ghi đè `config.json`, `data/`, hồ sơ/prompt, kinh nghiệm, sản phẩm và tài khoản đã kết nối. Không chép dữ liệu từ kho khác lên chúng.
- Kiểm tra thay đổi cục bộ trước khi lấy mã mới. Không dùng `git reset --hard`, không xoá thư mục để xử lý xung đột. Sao lưu dữ liệu và cấu hình vào nơi riêng của chủ máy trước khi cập nhật.
- Chờ công việc/bài đăng đang chạy kết thúc. Nếu có dịch vụ, nạp lại bằng cách phù hợp; không chạy thêm server thứ hai dùng cùng thư mục dữ liệu.
- Trên macOS với dịch vụ của kho: `node scripts/reload-office.js` kiểm tra việc đang chạy, giữ dữ liệu rồi nạp lại. Nếu chưa cài dịch vụ, không dùng lệnh này thay cho `npm start`.

## 8. Tự chạy khi đăng nhập macOS và truy cập từ xa

Sau khi chạy tay thành công, có thể dừng bản Terminal rồi cài tự chạy:

```sh
npm run service:install
```

Lệnh này chỉ hỗ trợ macOS. Đường dẫn thư mục phải ổn định, ổ chứa phải được gắn khi chạy. Không mở đồng thời `npm start` và dịch vụ. Xem cách nạp/gỡ dịch vụ trong VAN-HANH-WEB.md.

Truy cập từ xa là bước riêng: đặt mật khẩu văn phòng trên máy nhà trước, rồi cấu hình domain HTTPS/reverse proxy theo VAN-HANH-WEB.md. Không mở trực tiếp cổng 7788 ra Internet. Người chỉ dùng trong máy không cần domain.

## 9. Chia sẻ mã GitHub và dữ liệu riêng

- Cần đẩy phiên bản mã và tài liệu mới lên kho GitHub trước khi gửi link; thay đổi chỉ nằm trên máy chủ kho thì người clone chưa nhận được.
- `config.json`, `data/`, tài khoản đăng nhập Codex và khoá Keychain là dữ liệu riêng của từng máy. Không đưa chúng lên GitHub hoặc kèm trong ZIP chia sẻ công khai. `.gitignore` giúp tránh thêm nhầm file mới, nhưng không tự bỏ theo dõi file từng được commit.
- Bản clone tạo văn phòng mới, không sao chép công việc, prompt riêng, tài khoản, mật khẩu, token, quyền đăng hoặc kinh nghiệm từ máy Hải. Tên phòng và các chức danh cơ bản có trong mã mẫu.
- Nếu chủ máy muốn chuyển nguyên văn phòng sang máy khác, đó là quy trình sao lưu/khôi phục riêng: ngoài thư mục dữ liệu còn phải xử lý khoá mã hoá tài khoản. Không hứa chép mỗi `channel-vault.json` là đăng bài được.
- Không chèn luật hòm thư, lượt lập trình hoặc gói code vào dự án khác. Nhân viên nhận nhiệm vụ, nội quy và kinh nghiệm từ ứng dụng.
