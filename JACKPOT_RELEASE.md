# VLT App v2.1.0 — Jackpot · 28/11/2026

Phê duyệt: https://github.com/nem09999/vlt-mega-power-coordination/issues/1#issuecomment-7234053901

Ứng dụng hiện hữu: https://nem09999.github.io/vlt-app/

## Phạm vi

Bổ sung kết quả kỳ gần nhất trên hai thẻ hiện hữu: Mega sáu số; Power sáu số chính và số đặc biệt riêng. Chỉ hiển thị Jackpot / Jackpot 1 / Jackpot 2, số bộ số/vé trúng, giá trị nguồn công bố, nguồn và ngày kiểm tra. Không suy số người từ số vé; không tự suy giá trị mỗi vé từ tổng thưởng. Không thay đổi thuật toán, dữ liệu lịch sử, snapshot, bộ số đã khóa, nhật ký, chức năng import/export hay đánh giá một tháng.

Dữ liệu đọc trực tiếp qua HTTPS Vietlott ngày 28/11/2026, trước giờ quay:

| Sản phẩm / kỳ | Bộ số | Giải | Số vé/bộ số trúng | Giá trị nguồn công bố (đồng) |
|---|---|---|---:|---:|
| Mega 01594 · 27/11 | 05 23 27 35 38 45 | Jackpot | 0 | 24.014.533.000 |
| Power 01429 · 26/11 | 14 18 24 28 34 55 + 32 | Jackpot 1 | 0 | 51.820.878.000 |
| Power 01429 · 26/11 | như trên | Jackpot 2 | 1 | 3.992.642.500 |

Adapter đọc đúng hàng Jackpot của bảng chính thức; thiếu/sai schema/nguồn xung đột thì giữ bản tốt và cảnh báo. Khi chưa có bản tốt, hiện “Chưa xác minh”; null không biến thành 0. Mạng lỗi/offline/nguồn cũ được gắn ngày nguồn, không tuyên bố dữ liệu cũ là kỳ hiện tại. Giá trị tổng quỹ và mỗi vé chỉ xuất hiện khi có trường được xác minh riêng; nguồn hiện tại chưa phân định nên giữ null.

## Cập nhật / tin cậy

`scripts/collect-online.cjs` thu thêm Jackpot thông qua `lib/jackpot.cjs`, ghi trường `jackpots` của source-status hiện hữu. Dùng lịch và runner công khai sẵn có; không thêm workflow/dịch vụ/host/gói phí. Giao diện đọc raw GitHub để cập nhật độc lập Pages rebuild. Bản giao nhúng bản tốt ban đầu cho offline và giữ cache tốt trên trình duyệt. SHA-256 nguồn chứng minh bytes được thu, không phải chữ ký số Vietlott; trình duyệt không chứng thực được dữ liệu localStorage bị chỉnh thủ công. Lỗi 403/timeout có thể tái diễn; ứng dụng giữ bản tốt kèm cảnh báo, không cam kết mọi kỳ sẽ lấy được nguồn.

## Kiểm thử

- `node --test tests/jackpot.test.cjs`: parser official fixtures, thiếu/âm/nhân đôi, zero/multiwinner, nguồn lỗi và xung đột, mã thuật toán cũ không đổi.
- `node tests/jackpot-browser.cjs`: Playwright + Chromium (`CHROMIUM_PATH` để chọn executable), desktop/mobile 390/320 px, sáu/bảy số, downloads JSON/CSV, import, nhật ký, nút chạy Mega/Power, offline, missing, stale và source conflict. Cần Node và Playwright có sẵn; không tự cài dependency khi chạy tests.
- Kiểm thử mobile là viewport Chromium; chưa xác nhận Safari iPhone hoặc Windows ARM64 bằng thiết bị thật.

## Phục hồi

Baseline: `568103677f8a6b137fb0e9abf4ec76c66d36ed8d`. ZIP bàn giao giữ bản backup baseline và manifest SHA-256. Khi cần rollback, chỉ hoàn nguyên các đường dẫn thay đổi của bản Jackpot bằng commit mới, giữ mọi snapshot/lock/data commit phát sinh sau đó; không force-push hay reset toàn bộ main. Sau rollback kiểm tra Pages theo hash và dữ liệu raw. Cache service worker phiên bản mới chỉ xoá các cache shell VLT cũ; không xoá localStorage/nhật ký.

Bản bổ sung giao diện không tự mở các gate G9-B/G-EXEC của hồ sơ runtime CCB riêng và không phải nghiệm thu độc lập toàn dự án VLT-ROOT.
