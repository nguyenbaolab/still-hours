# DECISIONS

Quyết định tự chốt trong lượt chạy tự động (AUTOPILOT.md). Mỗi mục: quyết định gì, vì sao, phương án đã bỏ.

## 3b.1

- **Chuỗi `hands` còn trong `src/`.** Điều kiện xong của mốc nói "không còn chuỗi `hands`", nhưng sự kiện `sweep` có
  trường `hands` (số kim quay) và `HandBullet` (kim đồng hồ), không liên quan trống giấy. Chỉ xóa loại đạn `hands`
  (`HandsEvent`, handler, `ClampBullet`/`clamps`, `withPaperHands`). Phương án bỏ: đổi tên trường `sweep.hands` cho
  grep sạch, vì sẽ đụng test và pattern thật mà không đem lại gì.
- **`eraseLength`, `eraserSpeed`, `erasedAlpha`, `eraserColor` và `tailSeconds`** xóa cùng `PAPER_FEEL`.
