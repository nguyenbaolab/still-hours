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

## 5.5

- **Luồng cả game tách khỏi `main.ts` thành `GameFlow`** (`scenes/game-flow.ts`), nhận phụ thuộc qua `FlowDeps` (kho lưu, nơi dựng
  trận). Lý do: test chạy được Director thật với trận giả "thắng ngay". Bỏ: để luồng trong `main.ts` rồi test bằng trình duyệt
  (luật không cho test cần trình duyệt).
- **Cảnh kết của r1–r3 và boss ở mốc này** là về thị trấn với cư dân đã có màu và người thợ đứng yên
  `FLOW_FEEL.freedHoldSeconds` (2 giây, `TownInit.holdSeconds`); r4 vẫn dùng `VignetteScene` "pencil". Cảnh thật ở mốc 6.5.
- **Dữ liệu tạm r1–r3, boss:** hội thoại và câu ký ức dùng luôn bản đã chốt trong CLAUDE.md (rẻ, và khỏi viết hai lần);
  chỉ pha né và máy là tạm. Máy tạm tự dựng từ `placeholderMechanism` (3/3/4 bộ phận) vì `CLOCKWORK` có tầng 2 chỉ 2 bộ phận,
  trái luật 3–4 bộ phận mỗi tầng của `content.test.ts`.
- **`showHint` chỉ để cho cư dân 1** (đúng thiết kế); đã bỏ khỏi `ALARM_CLOCK`.
- **Lỗi tìm thấy nhờ test luồng:** `TitleScene` dựng lại sau màn kết (âm thanh đã mở khóa, không có bản lưu) sẽ tự vào ván mới
  ngay. Sửa: nếu `audio.ready` đã đúng lúc dựng thì phải đợi một phím thật.
- **Bản lưu ghi sau mỗi cư dân** gồm `drawing` (tranh r4, giản lược) từ lúc r4 xong trận; `finished: true` khi boss xong, nên
  "Tiếp tục" lúc đó vào thẳng màn kết. Thời gian chơi nối tiếp từ `playSeconds` của bản lưu.

## 5.6

- Nhảy cóc `town.<id>` đặt người thợ ngay phía đông cư dân giải thoát gần nhất (cùng `townSpawnFor` với Tiếp tục); `town.r1` và `town` đều ở tiệm.
- Thêm đích `title` (phím `0`, và `?jump=title`) ngoài hai đích CLAUDE.md liệt kê; hoa thường không phân biệt trong URL.
- Nhảy cóc chờ `audio.ready` (cần một phím) rồi cắt thẳng (`director.cut`, không mờ), để đồng hồ nhịp của cảnh đích không dựng trên đồng hồ âm thanh chưa có. `DEBUG.session` bật ngay lúc xin nhảy, nên màn bắt đầu cũng không đọc bản lưu.
- `r4.2d` (và `rX.Nd`): các tầng trước N coi như đã tháo (`Workbench.removed`); pha né lượt N dùng `startStep` chẵn tương tự.

## 6.1

- Vòng đệm và chốt cài (tầng 1), kim giờ và kim phút (tầng 2), bánh răng nhỏ (tầng 3) là bộ phận thêm cho đủ 3 bộ phận mỗi tầng như `content.test`; dùng sprite placeholder sẵn có (`cover`, `cog`, `clock-face`, `spring`, `balance`).
- Chuỗi `straight` mỗi beat; lượt 2 và 3 thêm một viên ở nửa beat sau mỗi 8 beat (trên/dưới xen kẽ) cho nhịp dồn hơn. Độ khó thật chỉ kiểm bằng bot ở 6.6 và bằng tay người chơi.
- Cảnh kết `phone` và cue `ring` dời sang 6.5 (cảnh ở thị trấn) và 7.2 (mọi cue), vì cảnh kết của r1–r3 và boss chỉ có chỗ ở thị trấn.

## 6.2

- `backdrops.ts` và `drawBackdrop` đã có từ 5.3 nên mốc này chỉ nối vào khung né: cảnh nền vẽ trong khung, dưới nét và đạn, độ đậm tối đa `STILL_FEEL.backdropAlpha` 0,6 để đạn trắng còn đọc được.
- Đứng yên tính theo quãng bánh răng dịch cả tick (kể cả lực hút), không theo input riêng; có input di chuyển thì không bao giờ tính đứng yên, kể cả khi bị tường chặn.
- Túi an toàn của cư dân 2: `straight` chỉ ở làn ngoài 0,3–0,7 của cạnh nên đứng giữa khung không bị trúng; `aimed` mỗi 8 beat (lượt 3 hai viên) ép bước ra, nên không đứng yên mãi được.
- Bộ phận thêm cho đủ 3 bộ phận mỗi tầng của STOPWATCH: nắp lưng, núm vặn, kim giây, tấm đỡ, bánh răng (sprite placeholder).
- Cảnh kết `lookUp` dời sang 6.5 như `phone`.

## 6.3

- Mặt đồng hồ trễ: hàm thuần `lagClockHands` trong `battle/lag-clock.ts` (có test); trước beat 0 kim đứng ở 0. Cỡ, màu và một vòng 60 giây ở `LAG_CLOCK_FEEL`.
- `RESIDENT3_PATTERN` (pattern thử, `loop: true`) giữ lại vì `pace.test` và `pattern-runner.test` dùng nó; dữ liệu thật của r3 là `R3_ROUNDS` trong cùng file.
- Chữ mỗi 3 beat (bắt đầu beat 2), đạn thường mỗi 4 beat (bắt đầu beat 4), xen `straight` hai viên và `aimed`: thưa hơn chữ như thiết kế, và hai nguồn này lệch pha nên có lúc phải chọn giữa né chữ và né đạn.
- Bộ phận thêm cho đủ 3 bộ phận mỗi tầng của METRONOME: quả cân, cần lắc, núm lên dây, tấm đỡ, bánh răng (sprite placeholder).

## 6.4

- Khe cửa là hàm thuần theo beat nghe được (exitView), không đếm tick; Player.door do DodgePhase đặt mỗi tick trước khi bánh răng di chuyển.
- Ra khỏi khung: cả thân phải lọt trong khe mới lách ra được (khe tối thiểu 24 px, validatePattern kiểm); đã ra ngoài mép thì hai bên khe là tường; đi tối đa nửa thân + 12 px ngoài viền, tâm vượt viền ngoài là thắng.
- Khe đóng khi bánh răng đang ở ngoài mép: kẹp lại về trong khung ngay tick đó (không sát thương).
- Khe không bao giờ cùng cạnh với đạn bắn tới (test: không đạn nào có rom bằng cạnh khe) để lối ra không bị chắn thẳng cửa.
- Cảnh báo khe: đoạn viền ở khe nhấp nháy 1 beat trước khi mở (EXIT_WARN_BEATS); khe mở thì đoạn viền biến mất. Khe mở ngay từ beat 0 thì không có cảnh báo.
- Thắng bằng khe đi cùng nhánh dọn đạn như length (clearing rồi won).
- Lượt 2 của boss dùng still với cảnh 	ower (đã có sẵn trong ackdrops.ts); đạn xao nhãng không có bút nên chỉ hút.
- Bộ phận của TOWER_CLOCK: bu lông ×2, nắp che; kim giờ, kim phút, mặt số; quả nặng, bộ bánh răng, con lắc, bộ thoát (core). Sprite placeholder dùng chung.

## 6.5

- Cảnh kết của mọi cư dân là VignetteScene riêng (màn tối, hình khối + sprite), không dựng trong TownScene: cùng cách với cảnh pencil của Linh đã chốt ở bước 4.3, nên r1–r3 và boss không còn đứng yên `freedHoldSeconds` giây. Cảnh kết thật trong thị trấn (camera, đèn) để dành cho lần sau nếu chủ dự án muốn.
- Boss cũng có cảnh leave ngắn (đặt đồng hồ xuống, bước ra cửa) trước khi sang màn kết.
- Dải trời của r2: dải cao 12 px ở mép trên màn hình (không theo camera), vì dãy mái nhà phủ kín hàng 0 nên không có ô trời thật.
- Tiếng chim: một cue ird (ba tiếng hót) mỗi 6–12 giây, ngẫu nhiên không cần tái lập (andom truyền vào để test cố định). Chỉ phát trong TownScene (màn kết dùng chung TownScene nên cũng nghe chim).
- Tranh trên tường nhà Linh: khung 64×28 px ở cột 45–46, hàng 0–1; vẽ từ SaveData.drawing thu vào khung giữ tỉ lệ; không có nét thì tờ giấy trắng.
- Thêm sprite placeholder 2-up và oss; cue ing, hum, ird, chime làm luôn ở đây vì cảnh cần chúng (7.2 chỉ còn kiểm và lớp nền).
- Lỗi mã hóa: `Add-Content` của Windows PowerShell ghi ANSI làm hỏng UTF-8 (đã gặp ở fixtures.ts). Dùng `AppendAllText` với UTF8 không BOM; đã quét toàn bộ src và các file md: không còn file sai.

## 6.6

- Bot né đạn (`testing/dodger.ts`) chỉ thử 8 hướng bàn phím + đứng yên, vì input là bàn phím: bản đầu thử 16 hướng nên hướng dự đoán lệch hướng thật và bot kẹt. Mục tiêu (nhặt bút, ra khe) chỉ phá thế hòa, không lấn nguy hiểm; mục tiêu ra khe đặt xa (300 px ngoài khung) để mô phỏng không đi quá.
- Kết quả (một lần chạy, không ngẫu nhiên): bot thắng mọi lượt của mọi cư dân, 0 lần thua; không lượt nào quá 3 lần thua. Tháo hết ba tầng của cả 5 máy: mỗi tầng 2–6 giây (người thật chậm hơn nhiều).
- Lượt thắng của bot dài nhất so với kịch bản: r2 lượt 3 (49 giây so với 36), tức 1,37 lần (còn trong 2 lần). Cư dân 4: bot né kỹ nên chỉ vẽ 11–28 beat mỗi lượt và trang khép bằng `DRAW_FEEL.maxLoops` (~60–66 giây); người chơi thật cứ đi liên tục thì xong sớm hơn nhiều. Trang vẫn luôn khép được, đúng thiết kế.
- Đối chứng: bánh răng đứng yên giữa khung thua ở mọi lượt của r1, r4 và boss lượt 1–2. Đứng yên THẮNG ở r2 lượt 3 (đàn chim) và r3 lượt 2; ở r2 là ý thiết kế (túi an toàn), ở r3 lượt 2 là chỗ không chắc: đạn thường thưa nên đứng yên giữa khung gần như không mất máu. Chưa sửa vì không bất khả thi, chỉ nhẹ; ghi vào PLAYTEST.md. Boss lượt 3 đứng yên không xong (khe mở nhưng phải bước ra), đúng thiết kế.
- `spacing` của đạn `straight` là tỉ lệ 0..1 của cạnh (không phải px); `validatePattern` đã kiểm, nên giá trị 0,3 ở lượt 3 boss là đúng.

## 7.1

- Tải VT323 từ `google/fonts` (`ofl/vt323`): `VT323-Regular.ttf` 153.116 byte và `OFL.txt`; tự host trong `public/assets/fonts/`, kèm giấy phép như OFL đòi.
- Kiểm `cmap` bằng script Node tạm (`tmp/cmap.mjs`, `tmp` vào `.gitignore`): 159 ký tự khác nhau xuất hiện trong chuỗi của `src/data`, `src/scenes`, `src/battle`, `src/core`, **0 ký tự thiếu**; dòng mẫu hoa/thường dấu tiếng Việt cũng đủ. Chưa nhìn bằng mắt xem dấu chồng (ẳ, ỡ) có dính ở cỡ 20 không: để chủ dự án xem (PLAYTEST.md); dự phòng GNU Unifont như đã ghi.
- Dung lượng `dist/`: 127.303 byte trước, 285.245 byte sau (phần tăng là 153.116 byte font và 4.367 byte giấy phép; mã không đổi đáng kể).
- `WORD_FEEL.advanceEm` 0,6 → 0,4 (advance thật của VT323, 400/1000 em), giữ nguyên nguyên tắc hitbox bằng 70% khung chữ vẽ ra. Hệ quả: khung chữ hẹp hơn khoảng một phần ba so với trước, nên chữ ở cư dân 3 dễ né hơn một chút; nếu muốn như cũ, tăng `WORD_FEEL.fontSize` hoặc `hitboxScale`. Ghi vào PLAYTEST.md.
- Cỡ chữ: giữ 16 (gợi ý phím, debug, chữ của đạn), 20 (hội thoại), 24, 32–48 (tiêu đề). Chữ debug của pha tháo từ 12 lên 16 vì 16 là cỡ nhỏ nhất của VT323.
- `main.ts` chờ `document.fonts.load` (tối đa 3 giây) rồi mới `startLoop`; `font-display: block` và `<link rel=preload>` để font về sớm.
