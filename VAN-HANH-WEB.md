# Vận hành Phòng marketing Lifesport

Mở **http://localhost:7788/giaoviec.html** trên máy ở nhà.

## Bộ máy

Hải trưởng phòng điều phối và duyệt kết quả. Bảy hồ sơ nhân viên đã được tạo: Đạt Codex (Codex app và tool), Nhân editor (video), Mạnh design và Nhi design (ảnh), Trinh content (nội dung), Ninh Web (web), Trợ lý anh Hải (chuẩn bị và đăng bài theo quyền kênh).

Mỗi nhân viên dùng một phiên Codex CLI mới khi nhận công việc. Không cần tạo chat thủ công, không cần nhắn ở chat Codex để kích hoạt. Đây là các phiên xử lý do ứng dụng quản lý, không phải các chat sidebar được tạo trong Codex app. Mỗi lần chạy nhận vai trò, yêu cầu chung, ghi chú sửa và thư mục sản phẩm riêng. Không giữ toàn bộ hội thoại xuyên suốt. Những kinh nghiệm Hải chủ động lưu được chọn theo phạm vi và đưa vào lượt mới; yêu cầu riêng vẫn cần ghi đủ trong công việc.

## Điều hướng và quản lý trên web

Thanh điều hướng chung: **← Văn phòng**, **Bảng điều hành**, **Công việc**, **Nhân sự**, **Kênh đăng**, **Nội quy**, **Kinh nghiệm**, **Báo cáo**, **Sơ đồ đội**. Bảng điều hành và báo cáo đọc trực tiếp sổ công việc marketing, không dùng lượt DEV hoặc nhật ký các dự án khác.

- **Nhân sự** (`nhansu.html`): thêm người, sửa tên/chức danh, dán prompt nhiều dòng (tối đa 24.000 ký tự), tạm dừng nhận việc. Không cần sửa JSON hoặc khởi động lại dịch vụ. Bản prompt dài đã nhập trong `role` được chuyển nguyên văn sang trường prompt riêng. Sửa khi nhân viên đang làm chỉ có hiệu lực ở lượt tiếp theo. Có kiểm tra phiên bản để không ghi đè hồ sơ vừa được sửa ở tab khác.
- **Nội quy**: bấm **Sửa nội quy**, sửa Markdown rồi lưu. Hệ thống ghi qua `vp noiquy luu` và giữ bản cũ trong `data/control/rules-history/`. Khi có người sửa đồng thời, cần tải bản mới trước khi lưu. Mỗi lượt nhận việc đọc lại nội quy mới.

## Giao việc và đặt lịch

1. Nhập tên chiến dịch và yêu cầu. Ghi rõ phần việc từng người nếu có nhiều người cùng tham gia.
2. Chọn một hoặc nhiều nhân viên. Mỗi người nhận một phần việc riêng trong cùng chiến dịch.
3. Để trống giờ bắt đầu để xếp hàng chạy ngay, hoặc chọn giờ theo Việt Nam (UTC+7).
4. Hạn hoàn thành là hạn mục tiêu để báo trễ, không bảo đảm AI sẽ xong đúng giờ. Các việc được chạy lần lượt, một phiên cùng lúc. Thời gian chạy tối đa mặc định là 60 phút mỗi lượt, cấu hình `jobTimeoutMinutes`.
5. Bấm **Giao việc cho đội**. Việc tự chạy khi tới lịch và máy rảnh. Nếu máy ngủ hoặc tắt, việc quá lịch chạy khi máy và dịch vụ hoạt động trở lại. Máy cần bật, có Internet và tài khoản Codex còn sử dụng được.
6. Bấm **Xem chi tiết** để xem kết quả trực tiếp. Ảnh được hiện ngay, bài Markdown/văn bản đọc tại chỗ, video và âm thanh có trình phát; nút tải về vẫn có. Chọn từng tệp nếu có nhiều sản phẩm. HTML được xem trong khung cách ly không chạy mã; định dạng không hỗ trợ hoặc văn bản trên 2 MB vẫn cần tải về. Video hỗ trợ byte range để không phải tải toàn bộ trước khi phát.
7. Ở **Thao tác** trên thẻ công việc hoặc ngay trong chi tiết: **Từ chối** ghi lý do nhưng không tự chạy lại; **Yêu cầu làm lại** cho sửa tên, yêu cầu và ghi chú nhắc nhở trước khi đưa lại vào hàng chờ; **Chuyển cho người khác** chọn nhân viên và sửa yêu cầu/ghi chú, tự chép sản phẩm cho người nhận. Việc đã sinh bước sau cần xử lý ở bước cuối để không giao trùng. Bản kết quả và yêu cầu cũ được giữ trong lịch sử khi làm lại.
8. **Xoá công việc** chuyển vào **Thùng rác**, cùng các bước con. Các việc trong đó đang chạy/chờ sẽ dừng. Chọn Thùng rác trong bộ lọc và bấm **Khôi phục công việc** để lấy lại. Khôi phục giữ trạng thái huỷ của các việc đã dừng, không tự chạy lại ngoài ý muốn. Tệp sản phẩm vẫn được giữ.

Thư mục sản phẩm của mỗi việc nằm ở `data/control/work/<mã việc>/`.

## Bàn giao tự động giữa nhân viên

Không cần Hải tạo lại việc hoặc duyệt giữa các bước. Có hai cách:

- **Chọn chuỗi cố định:** đổi “Cách phối hợp” sang “Bàn giao theo thứ tự, duyệt ở cuối”. Chọn bất kỳ nhân viên nào trong ô “Thêm bước”, thêm từ 2 đến 7 người. Mỗi bước có thể đổi người, bỏ bước hoặc dùng nút Lên/Xuống để sắp thứ tự. Chỉ người đầu tiên nhận việc lúc đầu; sau khi thành công, người tiếp theo tự nhận toàn bộ kết quả và tệp, rồi bắt đầu làm. Bước cuối trả kết quả cho Hải duyệt.
- **Để nhân viên tự giao:** giao cho Trinh, giữ bật “Cho phép nhân viên tự chuyển việc trong đội”, ghi “Trinh viết bài…, sau đó giao Nhi thiết kế ảnh dựa trên bài”. Trinh tạo yêu cầu bàn giao có người nhận, tên việc và brief; hệ thống kiểm tra rồi tự tạo việc cho Nhi. Người nhận cũng có thể bàn giao tiếp trong phạm vi chiến dịch.

Khi chọn nhiều người ở chế độ “Mỗi người nhận một phần việc”, mỗi người bắt đầu một việc riêng. Nếu muốn người sau phải chờ sản phẩm người trước, dùng chuỗi cố định hoặc chỉ giao cho người đầu và ghi rõ yêu cầu chuyển.

Màn tiến độ hiện “Đã chuyển đồng nghiệp” ở các bước trung gian, “Nhận từ…” ở việc con và đường dẫn xem bước tiếp theo trong chi tiết. Chỉ sản phẩm ở cuối nhánh mới chờ Hải duyệt. Tệp được **sao chép tại thời điểm bàn giao** vào `dau-vao/` của người nhận; sửa tệp gốc sau đó không làm thay đổi đầu vào đã chuyển.

Nhân viên dùng file `ban-giao-luot-N.json` trong thư mục việc, với `status: ready` và `transfers: [{employeeId, title, brief}]`. Nếu không chuyển ai thì dùng danh sách rỗng. Trong chuỗi cố định, danh sách luôn rỗng vì hệ thống đã biết người tiếp theo. Nếu thiếu công cụ hoặc chưa hoàn thành, ghi `status: blocked`, `reason` và danh sách rỗng: hệ thống dừng, không chuyển một sản phẩm chưa làm được. Thiếu/sai file bàn giao cũng hiện rõ lỗi và cho chạy lại.

Để tránh giao vòng lặp và chạy quá nhiều, giới hạn 6 lần chuyển theo mỗi nhánh, 5 người nhận mỗi lần, 20 việc mỗi chiến dịch, 200 tệp / 1 GB mỗi bàn giao. Không được tự giao cho chính mình. Lịch và quan hệ cha–con lưu nguyên tử cùng dữ liệu, không tự giao lại khi khởi động lại dịch vụ. Việc đã bàn giao không được chạy lại tại bước cha; sửa ở bước cuối hoặc tạo chuỗi mới để tránh thực hiện trùng. Bàn giao chỉ trong đội. Xuất bản ra kênh chỉ qua luồng đăng đã được giao và cấp quyền; không tự gửi ra ngoài hoặc thay đổi website đang vận hành.

Các nhân viên ảnh/video dùng công cụ thực tế có sẵn trong phiên Codex CLI. Việc tạo hồ sơ không tự cài máy quay, trình dựng hay dịch vụ tạo ảnh. Nếu thiếu công cụ hoặc quyền, nhân viên phải nêu rõ phần chưa làm được, có thể bàn giao kịch bản/brief thay vì nhận đã tạo ảnh/video. Máy tính không tự quay video ngoài đời.

## Tự chạy trên macOS

`npm run service:install` cài LaunchAgent `vn.lifesport.marketing-office`: văn phòng tự chạy khi người dùng đăng nhập và tự khởi động lại nếu tiến trình lỗi. Không chạy thêm `npm start` khi dịch vụ đang hoạt động. Ổ DATA cần được gắn đúng đường dẫn.

Khởi động lại:

```sh
launchctl kickstart -k gui/$(id -u)/vn.lifesport.marketing-office
```

Gỡ chế độ tự chạy, giữ nguyên dữ liệu: `npm run service:remove`.

Nếu không dùng dịch vụ, chạy `npm start`. `server.log` chứa lỗi khởi động. Việc đang chạy khi dịch vụ dừng sẽ chuyển thành **Đã gián đoạn**; không tự chạy lại nhằm tránh thực hiện trùng. Kiểm tra sản phẩm trước khi bấm chạy lại.

## Gắn domain sau

1. Ngay trên máy nhà, ở cuối màn Giao việc, đặt mật khẩu từ 12 ký tự. Mật khẩu được băm scrypt, không ghi dạng rõ. Chỉ máy nhà được đổi mật khẩu. Truy cập từ xa bị chặn cho đến khi đặt mật khẩu.
2. Cấu hình domain HTTPS của anh qua reverse proxy/tunnel về `http://127.0.0.1:7788`. Giữ host mặc định `127.0.0.1`; không cần mở cổng ra Internet. Reverse proxy phải giữ Host gốc và gửi `X-Forwarded-For`, `X-Forwarded-Proto: https`. Nếu dùng Cloudflare Tunnel, các header Cloudflare cũng được nhận biết là truy cập từ xa.
3. Từ xa mở `https://<domain>/giaoviec.html`, đăng nhập rồi giao việc như tại máy. Cookie HttpOnly, SameSite=Strict; phiên đăng nhập hết hạn sau 12 giờ hoặc khi máy chủ khởi động lại. Không nhúng mật khẩu vào URL.
4. Domain và tunnel chưa được cài trong thay đổi này, theo yêu cầu của Hải.

## Dữ liệu và quyền

Danh sách nhân viên, lịch, yêu cầu và kết quả lưu riêng trong `data/control/jobs.json`; sản phẩm ở `data/control/work/`; mật khẩu băm ở `data/control/access.json`. Toàn bộ `data/` đã được Git bỏ qua. Nên sao lưu thư mục này. Nhật ký Claude/Codex có sẵn không bị sửa.

Lệnh Codex dùng `exec --json --sandbox workspace-write` và `approval_policy="never"`, không dùng chế độ bỏ sandbox. Không có cửa sổ duyệt quyền trong phiên tự động: việc cần quyền ngoài sandbox phải báo thiếu quyền. Tài khoản đăng nhập Codex của máy được dùng cho các lượt xử lý và tính vào hạn mức tài khoản. Mỗi công việc được gửi tới dịch vụ AI thông qua Codex; đây là chức năng mới ngoài phần đọc nhật ký tại chỗ của bản gốc.

Chạy kiểm tra phần hàng đợi và đăng nhập: `npm test`.


## Quyền nhân viên và đính kèm

`config.json` có `workerNetworkAccess: true` cho phép các phiên nhân viên mới truy cập mạng trong sandbox `workspace-write`. Không cấp quyền sửa tuỳ ý toàn bộ máy. Quyền mạng không tự cài công cụ trình duyệt, tạo ảnh hay video; nhân viên cần kiểm tra công cụ sẵn có. Phiên đã chạy phải kết thúc rồi giao lại để nhận cấu hình mới.

Trang Giao việc nhận tối đa 20 tệp/lần, 250 MB/tệp và tổng 1 GB. Tệp tải theo luồng vào `data/control/uploads/`, chỉ metadata được lưu trong sổ. Bản sao tài liệu nằm trong `dinh-kem/` ở thư mục từng việc; bàn giao tự động giữ bản sao trong `dau-vao/`. Không tự chạy hoặc giải nén tệp tải lên. Hệ thống hỗ trợ xem trực tiếp ảnh, video trình duyệt hỗ trợ, audio, PDF và văn bản; định dạng khác tải về để mở bằng ứng dụng tương ứng.

Có thể đính kèm khi giao mới, làm lại, từ chối, chuyển nhân viên và lưu ghi chú ở chi tiết việc. Ghi chú mới không được chèn vào phiên đang chạy; dùng Yêu cầu làm lại để nhân viên xử lý bổ sung.

Văn phòng 3D dùng tông Garden Studio xanh ngọc/kem/gỗ sáng. Phòng quản lý và phòng kiểm tra cũ được đổi thành Phòng ăn & nghỉ và Phòng tập Pickleball. Các nhân vật sinh hoạt trang trí không tạo nhân sự hoặc công việc trong sổ.

PDF được hiển thị từng trang bằng công cụ Poppler (`pdfinfo`, `pdftoppm`) đã có trên máy; không tải tài liệu lên dịch vụ chuyển đổi bên ngoài. Nếu chuyển máy, cần có hai lệnh đó trong PATH của dịch vụ. Bộ nhớ đệm ảnh trang giới hạn 40 MB, mỗi lần dựng trang giới hạn 20 giây.


## Kênh đăng và tài khoản

Trang `/kenh-dang.html` khai báo tên, đường dẫn, loại kênh, nhân viên phụ trách và lưu ý nội dung. Sổ `data/control/channels.json` được ghi qua `node tools/vp.js kenh luu` (JSON stdin, kèm revision); `kenh xem` để đọc. Bản cũ được giữ trong `control/channels-history/`. Danh sách mới được đưa vào prompt ở lượt làm việc tiếp theo, không cần sửa prompt từng người.

Đã khai báo Fanpage Facebook `https://www.facebook.com/profile.php?id=61586960995230` và website WordPress `https://lifesport.vn/`. Hai kênh cần nhập thông tin ứng dụng để kết nối; không có mã đăng nhập thật được đưa vào mã nguồn hoặc prompt.

### Kết nối và phân quyền

- **WordPress:** URL công khai, URL quản trị, REST API root (mặc định `wp-json/`), tên đăng nhập và mật khẩu ứng dụng. Kiểm tra kết nối dùng GET `wp/v2/users/me?context=edit`, yêu cầu quyền `publish_posts`; bài có tệp còn cần quyền upload. Không dùng mật khẩu tài khoản chính.
- **Fanpage:** Page ID và Page Access Token có quyền quản lý bài của đúng trang. Phiên bản Graph API cấu hình theo ứng dụng Meta (mặc định `v25.0`, có thể sửa). Kiểm tra ID/tên trang bằng GET; API quyết định quyền đăng thực tế khi gửi. Không hỗ trợ đăng trang cá nhân bằng Pages API.
- Nhập/đổi/xoá mã kết nối trực tiếp từ localhost trên máy nhà. Mã được AES-256-GCM trong `data/control/channel-vault.json`; khoá trong macOS Keychain theo thư mục dữ liệu. API và prompt chỉ trả trạng thái, không trả bí mật. Sao lưu dữ liệu cần giữ cả khoá Keychain để giải mã sau khi khôi phục.
- Mỗi nhân viên có `channelPermissions` theo ID kênh: `none` (không đăng), `review` (soạn chờ Hải duyệt), `publish` (đăng trực tiếp theo nhiệm vụ được giao). Trong mục Nhân sự có thể đặt khi thêm hoặc sửa hồ sơ. Người phụ trách nội dung không tự được quyền đăng trực tiếp. Hồ sơ cũ chưa có quyền được chuyển sang `review` đối với kênh người đó đang phụ trách; các kênh khác không có quyền.
- Sửa thông tin và xoá kênh ngay trên web. Xoá/ngắt kết nối ở văn phòng không xoá bài trên nền tảng và không thu hồi mã bên nền tảng. Đổi đích kết nối đòi hỏi kết nối lại, không dùng mã cũ gửi sang tên miền khác.

### Nhân viên gửi bài

Nhân viên không nhận token; sau khi làm xong tạo `dang-bai-luot-N.json` đúng số lượt với `posts: [{channelId, title, content, files: ["banner.png"]}]`. Nội dung văn bản thuần; máy chủ chuyển sang HTML đã escape cho WordPress. Chỉ gửi khi nhiệm vụ của Hải yêu cầu đăng. Mỗi lượt tối đa 5 bài, mỗi bài tối đa 10 tệp/100 MB. WordPress nhận ảnh/video/PDF; Facebook nhận chữ, ảnh hoặc một video riêng.

Máy chủ lấy người gửi từ công việc thật, không tin employeeId trong tệp. Kiểm tra quyền, trạng thái nhân viên, kênh, kết nối và việc còn hiệu lực trước khi gửi; kiểm tra lại trước từng lần ghi lên nền tảng. Bài review xuất hiện cuối mục Kênh đăng để Hải xem nội dung rồi **Duyệt & đăng**. Bài publish tự chạy khi tới lượt. Kết quả có trong Kênh đăng và chi tiết công việc, với link bài từ phản hồi nền tảng. Video Facebook ở trạng thái đang xử lý cho đến khi nền tảng xác nhận đã xuất bản.

Sổ đăng ở `data/control/publications.json`, bản sao tệp ở `control/publication-media/`. Không tự gửi trùng cùng yêu cầu/lượt. Mất xác nhận hoặc dừng máy giữa lúc POST sẽ chuyển sang **Chưa rõ kết quả** và không tự thử lại; phải kiểm tra bài trên nền tảng trước khi giao yêu cầu mới. Thu hồi quyền, tạm dừng nhân viên hoặc xoá kênh chặn các yêu cầu chưa gửi; yêu cầu đang được nền tảng xử lý không bị xoá từ xa. Làm lại/xoá việc huỷ các bài chưa gửi của lượt cũ.


## Bộ lọc, báo cáo và xoá nhiều công việc

Trong Giao việc, phần Tiến độ & kết quả có bộ lọc trạng thái, nhân viên, hôm nay/hôm qua, 7/30 ngày qua, tuần này/tuần trước, tháng này/tháng trước và khoảng ngày tuỳ chọn. Chọn loại ngày để lọc theo ngày giao, bắt đầu, kết thúc, hạn hoặc ngày duyệt. Mốc ngày theo giờ Việt Nam; ngày kết thúc được tính trọn ngày. Các việc không có loại ngày đang lọc không được tính khi đặt khoảng ngày.

Bấm **Xem báo cáo** để xem tổng số việc, số đã trả kết quả, chờ duyệt, cần xử lý và bảng theo nhân viên. Báo cáo và các số tổng quan đầu trang áp dụng bộ lọc hiện tại; dùng trạng thái mới nhất, không tái dựng trạng thái quá khứ. “Đã trả kết quả” gồm review/completed/handed_off. Thống kê đúng/trễ hạn chỉ tính việc đã trả kết quả có cả dueAt và finishedAt. Không tính thùng rác và không tự suy ra KPI.

Tích từng việc hoặc **Chọn tất cả kết quả đang lọc**, rồi **Xoá N việc đã chọn**. Đổi bộ lọc sẽ bỏ chọn; cập nhật tự động chỉ giữ việc còn hiển thị. Xoá nhiều dùng `POST /api/office/jobs/bulk-delete` với ids và expectedAffectedIds; kiểm tra mọi mã, so sánh chuỗi bàn giao tại thời điểm xác nhận rồi lưu một lần. Nếu chuỗi đổi, trả 409 để chủ kiểm tra lại. Tối đa 5.000 việc chọn/lần.

Việc được chuyển vào thùng rác cùng các bước con; hộp thoại báo số bước ngoài lựa chọn. Các việc đang chạy bị dừng, bài chưa gửi bị huỷ; tệp vẫn giữ lại. Mỗi nhóm cha/con có mã xoá riêng, nên khôi phục một nhóm không khôi phục các nhóm độc lập khác trong cùng lần xoá. Khôi phục không tự chạy lại việc đã huỷ. Giao diện thùng rác không có xoá vĩnh viễn hàng loạt.

### Bộ nhớ kinh nghiệm có kiểm soát

- Mở **Kinh nghiệm** trên thanh điều hướng để thêm, sửa, tạm ngừng, xoá hoặc khôi phục hướng dẫn. Có ba loại: sở thích của Hải, kinh nghiệm chuyên môn, mẫu đã duyệt; phạm vi cả phòng, riêng nhân viên hoặc một chiến dịch. Từ khoá (cách nhau bằng dấu phẩy) khớp tên/yêu cầu công việc, không phân biệt hoa thường; trống là mọi việc trong phạm vi.
- Khi ghi chú, từ chối, giao làm lại hoặc chuyển việc: mặc định **Chỉ sửa việc này**. Chọn **Nhớ cho lần sau** để lưu nguyên văn ghi chú; khi chuyển người, kinh nghiệm riêng áp dụng cho người nhận. Nội dung đính kèm không tự trở thành quy tắc. Không ghi mật khẩu/token vào bộ nhớ.
- Khi **Duyệt kết quả**, có thể chọn **Lưu kết quả này làm mẫu tốt cho lần sau**, ghi rõ ngữ cảnh phù hợp. Hoặc chọn một công việc đã duyệt từ trang Kinh nghiệm. Hệ thống lưu báo cáo (tối đa 16.000 ký tự), tối đa 12 tệp / 20 MB, bỏ qua thư mục đầu vào và tệp điều phối/đăng bài. Bản sao giữ nguyên khi việc gốc được sửa. Trang Kinh nghiệm cho xem báo cáo và mở tệp mẫu trực tiếp.
- Mỗi lượt mới chọn tối đa 20 mục đang bật phù hợp nhân viên/chiến dịch và từ khoá, ưu tiên cập nhật mới, giới hạn 36.000 ký tự dữ liệu lựa chọn (đoạn báo cáo mẫu đưa vào prompt tối đa 4.000 ký tự/mẫu). Bộ nhớ dài sẽ không được đưa hết vào một lượt. Tệp mẫu có đường dẫn nội bộ để nhân viên đọc bằng công cụ sẵn có.
- Yêu cầu công việc hiện tại được ưu tiên khi khác sở thích cũ; nội quy và quyền kênh vẫn được kiểm tra riêng. Hướng dẫn tự kiểm tra số lượng, định dạng, dữ kiện và tệp sản phẩm được thêm vào mọi lượt, nhưng không phải bộ chấm chất lượng tự động và không bảo đảm AI hết sai sót.
- Không tự rút quy tắc từ mọi lần duyệt/từ chối, không huấn luyện lại mô hình, không đổi prompt hoặc quyền tài khoản. Bộ nhớ có hiệu lực từ lượt mới, không cập nhật phiên đang chạy. Tối đa 500 mục chưa xoá. Có kiểm tra phiên bản để tránh ghi đè khi mở nhiều trang. Khôi phục để ở trạng thái tạm ngừng, cần xem lại và bật áp dụng.
- Dữ liệu lưu cục bộ tại `data/control/memories.json`, bản sao tại `data/control/memory-assets/`; thao tác ghi được thực hiện bởi `tools/office-memory.js`. Không có thư viện mới hoặc dịch vụ bộ nhớ bên ngoài.


### Chuyển hoàn toàn sang phòng marketing

Bảng điều hành dùng công việc, chiến dịch, nhân sự và xuất bản thực tế; không chấm điểm chất lượng marketing từ token hoặc số lệnh. Các trang sổ kỹ thuật cũ chuyển về Công việc/Báo cáo. API hòm thư kỹ thuật, đọc sổ cũ và hiệu suất lập trình trả HTTP 410. Máy chủ không đọc nhật ký Codex/Claude bên ngoài các công việc do ứng dụng quản lý, không quét Docker hoặc hàng chờ DEV. Nhân vật 3D có định danh nhân viên ổn định theo hồ sơ.

Phòng DEV và tủ máy đã được thay bằng Studio video. Các chức năng sinh hoạt và pickleball giữ trong văn phòng. Đạt Codex và Ninh Web tiếp tục hỗ trợ chuyên môn kỹ thuật trong nhiệm vụ marketing.

Mã cũ nằm ngoài thư mục phục vụ web trong `archive/programming-20261030/`. Sổ cũ còn trên đĩa để đối chiếu, không đưa vào prompt hoặc giao diện điều hành. Nội quy cũ được sao lưu trước khi thay. Không xoá công việc, sản phẩm, hồ sơ/prompt, kinh nghiệm, quyền hoặc kết nối hiện có.
