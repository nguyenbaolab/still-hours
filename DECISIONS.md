# DECISIONS

Quyết định tự chốt trong lượt chạy tự động (AUTOPILOT.md). Mỗi mục: quyết định gì, vì sao, phương án đã bỏ.

## 3b.1

- **Chuỗi `hands` còn trong `src/`.** Điều kiện xong của mốc nói "không còn chuỗi `hands`", nhưng sự kiện `sweep` có
  trường `hands` (số kim quay) và `HandBullet` (kim đồng hồ), không liên quan trống giấy. Chỉ xóa loại đạn `hands`
  (`HandsEvent`, handler, `ClampBullet`/`clamps`, `withPaperHands`). Phương án bỏ: đổi tên trường `sweep.hands` cho
  grep sạch, vì sẽ đụng test và pattern thật mà không đem lại gì.
- **`eraseLength`, `eraserSpeed`, `erasedAlpha`, `eraserColor` và `tailSeconds`** xóa cùng `PAPER_FEEL`.

## 3b.2

- **`finish` bỏ trống.** Pattern không khai `finish`: `loop: false` coi như `length`; `loop: true` chạy mãi (không bao giờ
  `won`). Lý do: `SYNC_FIXTURE`, `TEST_PATTERN` và test đồng bộ nhịp (180 giây) cần pha chạy vô hạn. `validatePattern`
  chỉ cấm `length` + `loop: true` khi `finish` được khai rõ. Phương án bỏ: bắt mọi pattern phải khai `finish`.
- **`outcome` ở pha `length`.** `won` đặt ngay khi beat ≥ `lengthBeats`; pha vẫn `update`/`render` được để đạn còn lại
  mờ đi trong `FLOW_FEEL.clearSeconds` (không trừ máu, không tích tắc). `BattleScene` được phép giữ pha thêm cho tới hết
  mờ. Ở pha `page`, `won` chỉ đặt sau màn lộ tranh (đó là nội dung của pha).
- **Lực hút không làm kim cô bé chạy.** "Bánh răng đã dịch ≥ 0,5 px trong tick" chỉ tính quãng bánh răng tự đi (input),
  không tính lực hút. Lý do: hai đạn xao nhãng cùng hút cho 0,8 px/tick, vượt ngưỡng, nên cầm bút đứng yên vẫn bị kéo
  kim chạy, trái với "đứng yên thì kim đứng". (Cư dân 2 dùng quy tắc khác: lực hút làm mất "đứng yên", theo mục cư dân 2.)
- **`Pattern.idleLines`.** Câu tự nhủ của cư dân 4 là dữ liệu của pattern (`idleLines`), `R4_IDLE_LINES` xuất từ
  `resident-4.ts`. Phương án bỏ: cứng trong `dodge-phase.ts` (trái quy ước "nội dung là dữ liệu").
- **`consumeDistractions(hitbox, active)`.** Thêm tham số `active` (false = đạn bay xuyên qua) và `grabX/grabY` (tâm
  viên đầu tiên bị lấy, để tính `dropPoint`).
- **`PageState.closeRound()`** do `BattleScene` gọi sau khi một lượt `won`; `DodgePhase` không tự gọi, để thua không động tới.
- **Nét lúc chơi** vẽ vào canvas phụ (`battle/ink-layer.ts`, tạo lười) rồi vẽ một lần với `liveInkAlpha`, để các đoạn
  chồng nhau không đậm lên từng chỗ. Test chạy trong Node không có DOM thì không bao giờ gọi tới.
- **Test đồng bộ nhịp** giữ máu đầy mỗi tick, vì pha giờ thua khi hết máu (trước đây tự hồi máu).
