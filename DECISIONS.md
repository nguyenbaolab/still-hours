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

## 3b.3

- **`spacing` của `straight` trong bảng "Pattern dự kiến"** ghi 24 và 32 như px, nhưng định dạng pattern tính theo tỉ lệ
  độ dài cạnh. Ở cạnh dọc (160 px) là 0,15 và 0,2. Hàng đạn đặt `at` sao cho cả hàng nằm giữa cạnh (ví dụ `at` 0,35
  với 3 viên cách 0,15) thay vì bắt đầu đúng ở `at` 0,5 như bảng, để hàng đạn không lệch hẳn về một nửa khung.
- **Lượt 2 và 3** bảng chỉ cho khung; danh sách sự kiện cụ thể tự viết theo quy tắc ghi kèm (6 xao nhãng, đạn thường
  mỗi 2 beat từ beat 4, thêm `aimed` ở beat 15 và 31 cho lượt 2; một `sweep` ở beat 16 cho lượt 3).
- **Test bot hoàn thành ≤ 60 giây** giữ máu đầy: nó đo thời gian trang khép khi bot vẽ liên tục, không đo sống sót
  (bot đi vòng chữ nhật không né). Sống sót được kiểm ở mốc 6.6 bằng bot né đạn.
- **`main.ts` chơi thử pha né:** thắng thì `closeRound()` rồi sang lượt kế cùng trang, thua thì dựng lại pha với
  cùng trang. Tạm cho tới khi có `BattleScene` ở mốc 4.1.

## 4–5.3

- **Vị trí cư dân trong thị trấn** nằm ở `data/town.ts` (`TOWN_NPCS`: ô, cột cổng, sprite xám và có màu), không ở
  `ResidentData.town` như bản thiết kế: thị trấn dựng trước khi r1–r3 và boss có `ResidentData` (mốc 5.5, bước 6), mà test
  BFS cần đủ bốn cư dân từ đầu. `TownMap` không có `npcs`/`gates`: cổng suy ra từ `TOWN_NPCS` + `TOWN_GATE_ROWS`.
- **Cổng chắn kín:** hàng 8–9 (vỉa hè) ở cột cổng đặt cây (`T`) để không đi vòng qua cổng đóng. Hàng 0–2 là tường, riêng
  quảng trường mở lên nhưng cụt (cột 43 là tường).
- **Sprite người thợ** 8×12 dữ liệu × `scale` 3 (24×36 px), không phải 16×24 × 2 như bản thiết kế (32×48): 24 px vừa với
  hitbox chân 20×12 và ô 32 px; hai kích cỡ đều là placeholder, bước 7.3 thay.
- **Đối tượng tương tác đều là ô cứng** (cư dân, biển, bàn, lan can, ghế, cửa): người thợ đứng cạnh và nhìn vào, nên
  khoảng cách tâm–tâm luôn ≤ 26 px, nằm trong `interactRange` 28.
- **Biển trong thị trấn** (`officeSign`, `noticeBoard`, `towerSign`) là chữ tự viết, ngắn, trung tính, ghi bằng người nói
  `note`; thiết kế chỉ nói "biển" mà chưa có lời.
- **Cư dân chưa giải thoát xám** là bản xám tính từ bảng màu của sprite có màu (`greyscaleSprite`), đăng ký thêm lúc khởi động.
- **`Director` giữ F1 và M** cho mọi cảnh; các cảnh không còn tự xử lý, và nhãn "tắt tiếng" do Director vẽ.
- **Màn bắt đầu** coi âm thanh sẵn sàng (`audio.ready`) là đã nhấn phím: không có API "phím nào cũng được".

## 5.4

- **Tích tắc của cảnh mở** dùng `BeatClock` + `TickScheduler` như pha né (đồng hồ âm thanh vẫn là chủ), 60 BPM. Khi sang
  dòng 2 gọi `dropPending()` rồi ngừng cập nhật bộ hẹn: tiếng đã hẹn mà chưa phát bị hủy, nên "dừng hẳn" là thật. Kim giây
  đứng ở chỗ nó dừng. Bỏ: tắt âm lượng (vẫn có thể rò một tiếng đã hẹn).
- **Màn kết vẽ thị trấn bằng `TownScene.drawWorld(renderer, camX, null)`**, tách khỏi `render`, thay vì chép mã vẽ hay
  thêm cờ "ẩn người thợ" vào `TownScene`. Màn kết dựng một `TownScene` với mọi cư dân đã giải thoát chỉ để vẽ.
- **Lớp tích tắc chồng dần** theo vị trí tâm camera đi ngang: cửa tháp (ngay từ đầu), rồi r4, r3, r2, r1, nhịp
  60/66/72/80/88 để các lớp lệch pha nhau. Các lớp **chạy tiếp tới hết thẻ thời gian và công trạng**: "thế giới đã chạy
  lại" là ý của dòng cuối. Chỉ dừng (hủy tiếng đã hẹn) khi màn kết xong. Bỏ: cắt tiếng khi mờ đen (mất sức nặng của câu cuối).
- **"Việc nhỏ" của cư dân ở màn kết** (điện thoại và sóng chuông, ô trời xanh, nốt nhạc, cây bút chì) vẽ bằng hình khối
  placeholder ngay trong `EndingScene`; thay bằng sprite ở bước 7.
- **Thẻ thời gian:** `confirmAfterSeconds` (4 giây) tính từ lúc dòng thời gian hiện, nên "Vẫn chưa muộn." (hiện ở giây 2)
  luôn nằm trên màn ít nhất 2 giây trước khi qua được. Công trạng có `creditsGuardSeconds` 1 giây chống lỡ tay (thiết kế
  chỉ nói "confirm bỏ qua").
- **`EndingScene.countsPlayTime = false`**, thời gian chơi được chốt lúc dựng cảnh (`director.playSeconds`), để con số trên
  màn không nhích trong lúc đọc.
- **Công trạng** chỉ ghi điều đang đúng (âm thanh WebAudio, hình bằng mã); dòng font VT323 và giấy phép OFL thêm ở mốc 7.1.
- **Câu "Vẫn chưa muộn."** nằm ở `ENDING_LINE` (`data/credits.ts`); test kiểm nó không lặp trong hội thoại hay công trạng.
- **Bản lưu được tạo khi xong cảnh mở đầu** (`seenIntro: true`), nên "Tiếp tục" sau đó vào thẳng thị trấn. Nạp `freed` từ bản
  lưu và đứng cạnh cư dân vừa giải thoát là việc của mốc 5.5.
- **`PLAYTEST_PHASE = "ending"`** không xóa bản lưu thật (truyền `clear` rỗng).
