# VLT Mega & Power

Ứng dụng nghiên cứu cá nhân cho Mega 6/45 và Power 6/55. Không phải ứng dụng chính thức của Vietlott, không mua vé và không cam kết lợi thế trúng thưởng. Logo do chủ ứng dụng cung cấp để nhận diện sản phẩm; không hàm ý được Vietlott bảo trợ.

GitHub Pages phục vụ giao diện; GitHub Actions đọc kết quả Vietlott qua HTTPS, kiểm tra từng kỳ, lưu snapshot bất biến theo SHA-256. Không dùng Supabase, không token nhúng trong giao diện. Nhật ký cá nhân ở trình duyệt, không gửi lên repo.

Lịch cập nhật: 18:47 và 19:17 giờ Việt Nam, thứ Ba đến Chủ nhật. Lịch GitHub có thể trễ; ứng dụng luôn hiển thị cutoff và giữ bản tốt gần nhất khi nguồn lỗi. Snapshot lấy qua raw.githubusercontent.com để không phụ thuộc Pages rebuild sau commit của GITHUB_TOKEN.

Sau lần mở online thành công, giao diện được cache để dùng offline nếu trình duyệt hỗ trợ service worker. iPhone có thể dùng Safari → Chia sẻ → Thêm vào màn hình chính; cache và thao tác trên iPhone cần xác minh thiết bị thực tế.

Hai nút chọn số đang chạy lại lịch sử. Phát hành tiến cứu vẫn khóa; hash và giờ máy không chứng minh dự đoán trước giờ quay. PRNG xorshift32 không tương đương NumPy PILOT-01.

Actions chỉ dùng standard ubuntu-24.04 trên repo public, không upload artifact/cache và không dùng runner trả phí. Repo logs đặt retention 7 ngày. Việc cập nhật kết quả công khai tách khỏi kho điều phối VLT private và các cổng production của hệ thống đó.
