# VLT Mega & Power

Ứng dụng nghiên cứu cá nhân cho Mega 6/45 và Power 6/55. Không phải ứng dụng chính thức của Vietlott, không mua vé và không cam kết lợi thế trúng thưởng. Logo do chủ ứng dụng cung cấp để nhận diện sản phẩm; không hàm ý được Vietlott bảo trợ.

GitHub Pages phục vụ giao diện; GitHub Actions ưu tiên đọc Vietlott qua HTTPS. Khi nguồn này không truy cập được, collector dùng Xổ Số Minh Ngọc đã được chủ ứng dụng cho phép, đối chiếu các kỳ trùng, kiểm tra kỳ nối và từ chối xung đột. Bản ghi mới chỉ từ Minh Ngọc được ghi rõ SECONDARY_SOURCE_PENDING_OFFICIAL, không coi là đã xác minh nguồn Vietlott. Snapshot bất biến theo SHA-256. Không dùng Supabase, không token nhúng trong giao diện. Nhật ký cá nhân ở trình duyệt, không gửi lên repo.

Lịch cập nhật: 18:47 và 19:17 giờ Việt Nam, thứ Ba đến Chủ nhật. Lịch GitHub có thể trễ; ứng dụng luôn hiển thị cutoff và giữ bản tốt gần nhất khi nguồn lỗi. Snapshot lấy qua raw.githubusercontent.com để không phụ thuộc Pages rebuild sau commit của GITHUB_TOKEN.

Sau lần mở online thành công, giao diện được cache để dùng offline nếu trình duyệt hỗ trợ service worker. iPhone có thể dùng Safari → Chia sẻ → Thêm vào màn hình chính; cache và thao tác trên iPhone cần xác minh thiết bị thực tế.

Hai nút Chạy thử Mega/Power vẫn chạy lại lịch sử với xorshift32. Mục Bộ số đã khóa cho kỳ tiếp theo dùng bộ máy NumPy 2.3.5 kế thừa quy tắc PILOT-01, seed73100; đã tái lập đúng hash bộ số gốc của cả hai sản phẩm. Mỗi kỳ có một bản JSON và CSV create-only trên GitHub, dùng toàn bộ lịch sử trước kỳ mục tiêu. Bản mới chỉ được tạo khi snapshot không có kỳ chờ đối chiếu Vietlott và có lượt kiểm tra nguồn thành công trong 12 giờ. Hạn khóa17:45 giờ Việt Nam; không tự nhảy qua kỳ còn thiếu kết quả.

Lượt khóa nghiên cứu được cấu hình9:17 và16:17 giờ Việt Nam thứ Ba đến Chủ nhật, cùng nhóm ghi tuần tự với lượt cập nhật dữ liệu. Giao diện kiểm tra hash và trạng thái GitHub thành công, thời gian hoàn tất trước hạn rồi mới hiển thị đã lưu trước hạn. Đây là bằng chứng theo dịch vụ GitHub, không phải chứng thực thời gian độc lập; chủ repo vẫn có quyền quản trị lịch sử. Lịch kỳ mục tiêu là lịch định kỳ Vietlott, ngoại lệ cần xác nhận riêng. Không có cam kết tăng xác suất trúng. JSON/CSV khóa được lưu công khai để đối chiếu; nhật ký chạy thử cá nhân vẫn ở trình duyệt.

Actions chỉ dùng standard ubuntu-24.04 trên repo public, không upload artifact/cache và không dùng runner trả phí. Repo logs đặt retention 7 ngày. Việc cập nhật kết quả công khai tách khỏi kho điều phối VLT private và các cổng production của hệ thống đó.
