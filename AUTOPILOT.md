# AUTOPILOT

File này có hiệu lực cao hơn mục "Quy trình làm việc" trong CLAUDE.md trong suốt lượt
chạy tự động. Không có ai trả lời câu hỏi. Mục tiêu: một bản Still Hours chơi được
trọn vẹn từ màn bắt đầu tới màn kết. Làm tốt nhất có thể.

## Luật

- Làm liên tục qua các bước, không dừng chờ chơi thử, không hỏi.
- Thiết kế đã chốt trong CLAUDE.md. Làm theo đó. Gặp chỗ chưa có thì tự quyết, ghi
  vào DECISIONS.md (quyết định gì, vì sao, phương án đã bỏ) rồi làm tiếp.
- Sau mỗi mốc: npm run build sạch, npm test xanh, commit (Conventional Commits), push
  lên origin/main. Commit nhỏ, thường xuyên.
- Cấm: force push, npm run deploy, wrangler deploy, sửa lịch sử git.
- Không bật npm run dev hay wrangler dev. Tự kiểm bằng test, mô phỏng, bot. Script
  kiểm tạm đặt ngoài src/ và không commit.
- Giữ quy ước kỹ thuật trong CLAUDE.md: nội dung là dữ liệu, TypeScript strict, đồng
  hồ âm thanh làm chủ nhịp, không thêm thư viện khi chưa cần. Khi sửa engine nhịp,
  phá code có chủ đích để chắc test còn bắt lỗi.
- Cập nhật "Trạng thái hiện tại" trong CLAUDE.md sau mỗi bước.

## Ưu tiên khi thiếu thời gian

1. Chơi được trọn vẹn từ đầu tới cuối, không kẹt, không crash.
2. Mỗi cư dân có cơ chế riêng đúng thiết kế.
3. Lời thoại thật, cảm giác, hình ảnh, âm thanh, font.
Một game xấu nhưng hoàn chỉnh tốt hơn một game đẹp nhưng dở dang. Làm khung chạy
được cho mọi cư dân trước, rồi mới làm sâu từng người.

## Chống lặp

- Một lỗi sửa tối đa 3 lần, mỗi lần một cách khác. Vẫn không được: quay về commit
  xanh gần nhất, chọn cách đơn giản hơn hoặc bỏ tính năng, ghi vào PLAYTEST.md mục
  "Lỗi đã biết", đi tiếp.
- Không viết lại phần đã chạy được chỉ để đẹp hơn.
- Đạt điều kiện xong của một mốc thì commit và sang mốc kế, không mở rộng thêm.
- Thấy mình làm lại cùng một việc lần thứ hai: dừng, ghi lý do vào DECISIONS.md,
  chuyển việc khác.

## Khi bị gián đoạn

Nếu phiên bị ngắt hoặc ngữ cảnh bị nén: đọc lại file này, mục "Nhật ký", và git log,
rồi làm tiếp từ mốc dở dang. Không làm lại mốc đã có trong nhật ký.

## Điểm dừng

Khi ưu tiên 1 và 2 xong và ưu tiên 3 đã có một lượt hoàn thiện: viết PLAYTEST.md,
commit, push, rồi DỪNG.

PLAYTEST.md gồm: cách chạy và phím; những gì đã làm theo từng bước; tóm tắt màn cô
bé; lỗi đã biết, chỗ chưa xong, chỗ không chắc; con số nên chỉnh (file + tên hằng);
cách nhảy thẳng tới từng cư dân.

## Kế hoạch từng bước

Quy ước chung cho mọi mốc:

- Thiết kế chi tiết nằm trong CLAUDE.md; mốc chỉ ghi việc, phạm vi và điều kiện xong. Tên mục CLAUDE.md ghi trong
  ngoặc kép.
- "Xong" luôn gồm: `npm run build` sạch, `npm test` xanh, một commit (message gợi ý ở cuối mốc), push, một dòng nhật ký.
  Dòng nhật ký của một mốc ghi hash của chính commit mốc đó, nên được thêm trong commit kế tiếp (hoặc một commit
  `docs: log <mốc>` nếu là mốc cuối). Không amend.
- Mốc nào thêm con số cảm giác thì thêm nó vào đúng file `data/*-feel.ts` và vào bảng "Con số nên chỉnh" của CLAUDE.md
  trong cùng commit.
- Test mô phỏng pha né dùng đồng hồ âm thanh giả của `src/testing/sim.ts` (như `rhythm-sync.test.ts`), không cần trình
  duyệt. Một "bot" là hàm `(state) => input` đặt trong `src/testing/` (được commit, vì là test) hoặc trong file test.
- Khi một mốc làm `PLAYTEST_PATTERN`/`PLAYTEST_PHASE` trong `main.ts` không còn hợp lệ, sửa `main.ts` để vẫn chơi thử
  được thứ vừa làm, cho tới khi mốc 5.6 thay bằng `?jump=`.
- Thứ tự là bắt buộc: 3b → 3c → 4 → 5 → 6 → 7. Theo ưu tiên 1, sau mốc 5.5 game phải chơi được từ đầu tới cuối với
  trận tạm; bước 6 chỉ làm sâu.

### Bước 3b (vòng mới): "Nhặt bút" cho cư dân 4

**3b.1 Xóa trống giấy và tẩy.** Làm đúng danh sách "Xóa" ở mục cư dân 4. Chuyển `replaySeconds`, `crayonWidth`,
`crayonColor` vào `SKETCH_FEEL`; bốn số đung đưa vào `DISTRACTION_FEEL`. `replayPieces` không còn cờ `erased`.
`DodgePhase` không còn nhánh `paper`, `tail`, `eraser`, `gallery`; đạn `distraction` chạm thì chỉ biến mất (luật bút
ở 3b.2). `resident-4.ts` tạm thành pattern chỉ có `distraction` và đạn thường, không có `paper`.
- Xong khi: không còn chuỗi `paper`, `PAPER_FEEL`, `hands`, `erase`, `EraserPlay`, `StrokeTail`, `gallery`, `keepColumn`
  trong `src/` (kiểm bằng grep); `sketch.test.ts` còn test lấy mẫu, cắt đoạn khi nhấc bút và thứ tự tua lại;
  `distraction.test.ts` vẫn kiểm "không trừ máu" và "có cảnh báo khi `pull` > 0".
- Commit: `refactor: remove paper drum and eraser from resident 4 sketch`.

**3b.2 Bút, trang và đồng hồ của cô bé.** Thêm `finish` (`length`, `page`) và `pencil` vào `Pattern`, cùng luật trong
`validatePattern`. Thêm `DRAW_FEEL`. Viết `battle/page.ts` (logic thuần). Ghép vào `DodgePhase`: bút nằm và lóe, nhặt,
vẽ khi cầm, nét hiện mờ suốt lúc chơi, rơi bút khi chạm xao nhãng, đồng hồ của cô bé, câu tự nhủ, trang xong → lộ
tranh → `outcome = "won"`, và trang tự khép sau `DRAW_FEEL.maxLoops` vòng dù chưa vẽ đủ (mục cư dân 4, "Trang luôn khép
được"). Thêm `DodgePhase.outcome` (`playing` / `won` / `lost`; hết máu → `lost`, không còn
`resetHealth`). `finish: length` → `won` khi beat ≥ `lengthBeats`. Thêm `options` cho constructor
(`{ page?: PageState }`). Cue `pencilUp`, `pencilDrop`, `drawTick` (procedural, ngắn). Sprite `pencil`.
- Test (`battle/page.test.ts` và mở rộng `distraction.test.ts`, `pattern-runner.test.ts`):
  1. nhặt chỉ khi khoảng cách ≤ `pickupRadius`, và không nhặt lại trong `pickupDelaySeconds` sau khi rơi;
  2. `dropPoint` nằm phía đối diện đạn, cách đúng `dropDistance` khi không chạm mép, luôn trong khung cách mép
     ≥ `dropMargin`;
  3. `drawnBeats` chỉ tăng khi cầm bút **và** có di chuyển; đứng yên cầm bút không tăng; tăng theo beat nghe được (đặt
     `setPace` 0,5 thì cùng thời gian thật chỉ tăng một nửa);
  4. chạm xao nhãng khi không cầm bút: không rơi gì, đạn không bị tiêu thụ; khi cầm bút: bút rơi, `Sketch` nhấc, không
     trừ máu, số đoạn nét không giảm;
  5. `validatePattern`: `page` thiếu `pencil` → lỗi; `pencil` với `length` → lỗi; `length` với `loop: true` → lỗi;
     `page` với `loop: false` → lỗi;
  6. mô phỏng `DodgePhase` thật với bot "đi tới bút rồi đi vòng chữ nhật": `outcome` thành `won` trong ≤ 60 giây âm
     thanh giả; truyền cùng một `PageState` vào `DodgePhase` mới sau khi `lost` thì số đoạn nét và `drawnBeats` giữ
     nguyên;
  7. `finish: length`: mô phỏng bot đứng yên ở pattern fixture không có đạn → `won` đúng lúc beat ≥ `lengthBeats`;
  8. **không kẹt** (pattern fixture `page` chỉ có `distraction`, không có đạn trừ máu, `drawBeats` lớn hơn số beat của
     `maxLoops` vòng): (a) bot không bao giờ bấm phím → `outcome` thành `won` ngay sau khi beat đạt `maxLoops` ×
     `lengthBeats` cộng thời gian lộ tranh (sai lệch ≤ 1 tick), số đoạn nét là 0; (b) bot đi tới bút, cầm, rồi đứng yên
     → cũng `won` đúng mốc đó, `drawnBeats` gần 0; (c) bot vẽ đủ trước mốc → `won` sớm, không chờ tới mốc; (d) thua rồi
     dựng `DodgePhase` mới với cùng `PageState` → mốc đếm lại từ beat 0 của lần mới. Phá có chủ đích: tắt điều kiện
     `maxLoops` và chắc (a) vỡ vì hết thời gian mô phỏng mà vẫn `playing`.
- Điều kiện xong thêm: không còn đường nào để pha né của một pattern `page` chạy mãi (test 8 xanh).
- Commit: `feat: pick-up-the-pencil drawing page for resident 4`.

**3b.3 Pattern ba lượt của cư dân 4.** Viết `R4_ROUNDS` theo bảng "Pattern dự kiến" ở mục cư dân 4.
- Test: cả ba lượt qua `validatePattern`; với từng lượt, `maxLoops` × độ dài vòng ≤ 70 giây trên tempo kịch bản;
  không có đạn hay xao nhãng nào xuất hiện trong bán kính 40 px quanh `pencil`
  trong 4 beat đầu mỗi vòng (kiểm vị trí sinh bằng handler thật); bot của 3b.2 hoàn thành từng lượt trong ≤ 60 giây.
- Cập nhật CLAUDE.md: bảng "Con số nên chỉnh" phần nét chì, "Định dạng pattern", "Trạng thái hiện tại".
- Commit: `feat: three drawing rounds for resident 4`.

### Bước 3c: tầng của pha tháo lắp

**3c.1 Tầng.** Làm phần "Tầng" của mục "Pha tháo lắp": `Part.stage`, kiểm máy mới, `Workbench.setStage`,
`stageComplete`, con trỏ bỏ qua bộ phận tầng sau, `DisassemblePhase(input, audio, mechanism, bench, stage)` với
`outcome` (`playing` / `done`), bỏ chữ "xong" và tự chơi lại. Chia tầng `CLOCKWORK`. `main.ts`: chơi thử tháo lần lượt
tầng 1 → 2 → 3 trên cùng một `Workbench`.
- Test (`mechanism.test.ts`): `blockedBy` trỏ tầng sau → lỗi; thiếu tầng ở giữa → lỗi; `core` không ở tầng cuối → lỗi;
  con trỏ không chọn được bộ phận tầng sau; `stageComplete` chỉ đúng khi tầng xong và câu ký ức đã đóng; tháo hết 3 tầng
  `CLOCKWORK` theo một thứ tự hợp lệ thì tầng 3 xong đúng lúc đóng câu của `core`.
- Commit: `feat: staged disassembly across battle rounds`.

### Bước 4: vertical slice cư dân 4

**4.1 Dữ liệu cư dân và trận.** `data/residents/types.ts` (`ResidentData`), `data/flow-feel.ts` (`FLOW_FEEL`).
`scenes/battle-scene.ts`: chạy 3 lượt (pha né → mờ → pha tháo tầng n → mờ → …), giữ `Workbench`, `PageState`, đọc
`outcome`. Thua: màn bánh răng nứt rồi lành, không chữ (mục "Thua"), rồi dựng lại đúng pha né đó. Sprite
`gear-cracked`, cue `mend`. Tạm thời chưa có
hội thoại: vào thẳng lượt 1, xong tầng 3 thì hiện "hết" (sẽ thay ở 4.3).
- Test (`scenes/battle-scene.test.ts`, đồng hồ giả, thay pha thật bằng pha giả có `outcome` điều khiển được): thứ tự
  né1 → tháo1 → né2 → tháo2 → né3 → tháo3 → `finished`; `lost` ở né2 → dựng lại né2 (không quay về né1, không chạy lại
  tháo1); với lượt có `pencil`, `PageState` truyền vào pha né mới là cùng một đối tượng.
- Commit: `feat: battle scene with three rounds and retry on loss`.

**4.2 Hội thoại.** `data/dialogues.ts`, `scenes/dialogue-box.ts`, `Renderer.measureText`, `DIALOGUE_FEEL`, cue `blip`.
Đúng mục "Hội thoại".
- Test (`scenes/dialogue-box.test.ts`, đo chữ bằng hàm giả mỗi ký tự 10 px): ngắt dòng theo từ không vượt bề rộng;
  Z khi đang chạy hiện hết dòng; Z khi đã hết sang dòng sau; Z ở dòng cuối thì `done`; giữ X thì tốc độ ×8 và tự sang
  dòng; dấu phẩy/chấm có dừng. `data/dialogues.test.ts`: mọi dòng không rỗng, ≤ 110 ký tự, người nói có thật.
- Commit: `feat: dialogue box with typewriter and fast-forward`.

**4.3 Cư dân 4 hoàn chỉnh.** `data/mechanisms/alarm-clock.ts` (3 tầng, 4 câu ký ức ở mục cư dân 4),
`data/residents/r4.ts`, hội thoại `r4Open`, `r4Close`, `r4Idle`. `BattleScene` chạy hội thoại khép trận trước khi
`finished`. Cảnh kết "pencil" làm thành một cảnh nhỏ tạm (`scenes/vignette.ts`: bàn học, tranh của người chơi thu vào
khung 160×64, bút nhấc lên) vì thị trấn chưa có. `main.ts`: hội thoại mở → trận r4 → cảnh kết → lặp lại.
- Test: `validateMechanism(ALARM_CLOCK)` sạch, đúng 3 tầng; `content.test.ts` (mới, `src/data/`): mọi `ResidentData`
  trong danh sách có 3 lượt hợp lệ, máy hợp lệ có 3 tầng, mọi `DialogueId` tồn tại. Hàm thu tranh vào khung giữ tỉ lệ và
  nằm trong khung.
- Cập nhật "Trạng thái hiện tại".
- Commit: `feat: resident 4 vertical slice with dialogue and ending vignette`.

### Bước 5: khung game trọn vẹn

**5.1 Director và màn bắt đầu.** `scenes/director.ts`: giữ cảnh hiện tại, chuyển cảnh có mờ `FLOW_FEEL.fadeSeconds`,
cờ debug chung (F1), đếm `playSeconds` theo tick. `scenes/title.ts` thay `press-start.ts` (mục "Màn bắt đầu"); menu
Tiếp tục / Bắt đầu lại chỉ hiện khi có bản lưu (bản lưu thật có ở 5.2; tạm dùng giao diện `SaveStore` rỗng).
- Test: chuyển cảnh gọi `update` của cảnh mới chỉ sau khi mờ xong; `playSeconds` tăng đúng 1 sau 60 tick; menu lên/xuống
  vòng đúng, "Bắt đầu lại" cần xác nhận.
- Commit: `feat: scene director and title menu`.

**5.2 Lưu tiến trình.** `core/save.ts` đúng mục "Lưu tiến trình", lưu cài đặt `muted`, móc `pagehide`/`visibilitychange`
trong `main.ts`.
- Test (`core/save.test.ts`, `Storage` giả): ghi rồi đọc ra y hệt; JSON hỏng / sai version / thiếu trường → `null`;
  `Storage` ném lỗi → không ném ra ngoài; phiên debug không ghi; giản lược tranh ≤ 3000 số và giữ điểm đầu, cuối, dấu
  nhấc bút.
- Commit: `feat: localStorage save with corruption-safe parsing`.

**5.3 Thị trấn.** `data/town.ts` (bản đồ 64 × 11 đúng mục "Thị trấn"), `scenes/town.ts`: đi lại, va chạm ô, camera,
tương tác Z, cổng theo `freed`, cư dân xám/có màu, tờ giấy ở tiệm, chỗ ngắm cảnh (cảnh nền tạm là vài dải màu), cửa
tháp. `TOWN_FEEL`. Sprite placeholder: `keeper` (4 hướng), một sprite mỗi cư dân (xám và có màu do bảng màu).
- Test: `town.test.ts`: mọi hàng dài 64, đúng 11 hàng, ký tự có trong `legend`; điểm xuất phát, mọi cư dân, chỗ ngắm cảnh
  và cửa tháp đều tới được từ tiệm bằng BFS khi mọi cổng mở; khi `freed` rỗng thì BFS từ tiệm **không** tới được cư dân 2;
  sau mỗi lần giải thoát thì tới được đúng cư dân kế tiếp; va chạm không cho đi xuyên ô cứng khi đi chéo; tương tác chọn
  đối tượng gần nhất theo hướng nhìn.
- Commit: `feat: walkable town with gates, interactions and scenic spots`.

**5.4 Màn mở đầu và màn kết.** `scenes/intro.ts` (lời dẫn `introOpening`, tích tắc dừng), tờ giấy `shopNote`,
`scenes/ending.ts` (camera trôi, thời gian chơi, "Vẫn chưa muộn.", công trạng, xóa bản lưu, về màn bắt đầu).
Hàm thuần `formatPlayTime(seconds)`.
- Test: `formatPlayTime(1361)` = "22 phút 41 giây", `formatPlayTime(3780)` = "1 giờ 3 phút", `formatPlayTime(59)` =
  "0 phút 59 giây"; màn kết không cho bỏ qua dòng thời gian trước 4 giây; xong màn kết thì bản lưu bị xóa.
- Commit: `feat: intro cutscene and ending with total play time`.

**5.5 Nối trọn vòng chơi với trận tạm.** `data/residents/r1.ts`, `r2.ts`, `r3.ts`, `boss.ts` dạng tạm: mỗi người 3 lượt
`finish: length` dùng lại `TEST_PATTERN`/`RESIDENT3_PATTERN` (rút còn ~20 beat, `loop: false`), máy tạm (chép
`CLOCKWORK` đổi id, chia 3 tầng), hội thoại tạm một dòng. Nối Title → Intro → Town → (hội thoại mở → Battle → cảnh kết
→ lưu → Town) × 5 → Ending → Title. Cảnh kết ở thị trấn: tư thế mới của cư dân + 2 giây đứng yên (vignette thật làm ở
bước 6). Tranh r4 lưu vào `SaveData.drawing`.
- Test (`flow.test.ts`, chạy Director thật với cảnh trận giả "thắng ngay"): từ Title đi hết tới Ending rồi về Title,
  `freed` tăng đúng thứ tự, bản lưu được ghi sau mỗi cư dân và bị xóa ở cuối; "Tiếp tục" sau khi giải thoát r2 đặt người
  chơi ngay đông của r2 và cổng r1, r2 đã mở; `content.test.ts` phủ cả 5 cư dân.
- Từ mốc này game phải chơi được từ đầu tới cuối. Cập nhật "Trạng thái hiện tại".
- Commit: `feat: full playthrough loop with placeholder battles`.

**5.6 Nhảy cóc.** `core/debug-jump.ts` (`parseJump`, phím số khi lớp debug bật), `DEBUG_JUMP_KEYS`, `debugSession`,
dòng "DEBUG · không lưu". Xóa `PLAYTEST_PATTERN`, `PLAYTEST_PHASE`.
- Test: `parseJump` cho mọi dạng trong mục "Phím debug và nhảy cóc" (cả giá trị lạ → `null`); nhảy tới `r3` thì `freed`
  là r1, r2 và không ghi localStorage.
- Commit: `feat: debug jumps to any resident, round or scene`.

### Bước 6: cư dân 1, 2, 3 và boss

Làm theo thứ tự 6.1 → 6.4; mỗi mốc thay dữ liệu tạm của một người bằng thiết kế ở mục "Nhân vật".

**6.1 Cư dân 1.** `resident-1.ts` (3 lượt, tempo tăng dần), `pocket-watch.ts` (`rhythmic: false`, không `unscrew`),
hội thoại, câu ký ức, vignette "phone" (cue `ring`).
- Test: 3 lượt hợp lệ; BPM cuối lượt 3 là 176 (đọc từ `TempoMap` sau khi chạy hết sự kiện `tempo`); độ dài lượt trên
  tempo kịch bản 22–32 giây; máy hợp lệ, không có `unscrew`, `rhythmic` là `false`.
- Commit: `feat: resident 1 rush-hour ticks and pocket watch`.

**6.2 Cư dân 2 và đứng yên.** `battle/stillness.ts` (`Stillness`), `STILL_FEEL`, trường `still`, `data/backdrops.ts`
(hoàng hôn, mây, đàn chim, và tháp nhìn ra thị trấn cho boss; cũng dùng cho chỗ ngắm cảnh), vẽ cảnh nền trong khung sau
đạn, `resident-2.ts`, `stopwatch.ts`, vignette "lookUp".
- Test (`stillness.test.ts`): đứng yên < `stillSeconds` không đổi hệ số; đủ thì `setPace` 0,75 từ beat nguyên kế; di
  chuyển thì về 1 từ beat nguyên kế; bị lực hút kéo > 0,5 px thì không tính đứng yên; `validatePattern` từ chối `still`
  đi cùng `word`; mô phỏng bot đứng yên mãi ở một pattern không đạn: độ dài thật ≤ 1,34 lần kịch bản. Phá có chủ đích:
  đổi `setPace` sang beat hiện tại (không nguyên) và chắc một test vỡ.
- Commit: `feat: resident 2 stillness slows the world`.

**6.3 Cư dân 3 hoàn chỉnh.** `PACE_FEEL.floor` = 0,7; câu thật trong `words.ts`; trường `lagClock` và mặt đồng hồ trễ;
`resident-3.ts` 3 lượt có đạn thường; `metronome.ts`; vignette "hum" (cue `hum`). Cập nhật `pace.test.ts` cho sàn mới.
- Test: ôm mọi câu trong mô phỏng thì lượt dài ≤ 1,43 lần kịch bản (+ một beat); lượt có đạn trừ máu; góc kim sáng tụt
  sau kim mờ đúng bằng `time − scriptTimeAtBeat(beat)` quy ra độ; `words.test.ts` mọi câu 2–5 chữ.
- Commit: `feat: resident 3 lag clock, real phrases and lower pace floor`.

**6.4 Boss.** `finish: exit` (khe cửa, nhấp nháy trước 1 beat, `Player` không bị kẹp trong khe, đẩy vào khi khe đóng),
`loopsSeen` giữ qua lần thua trong `BattleScene`, `boss.ts` 3 lượt, `tower-clock.ts` (`core` là `escapement`), vignette
"leave" nối vào màn kết.
- Test: khe đóng thì không ra được; khe mở thì bot đi thẳng ra cạnh đó → `won`; khe đóng lúc đang đứng trong khe thì bị
  đẩy về trong khung; `widths`/`openBeats` theo `loopsSeen` và kẹp ở phần tử cuối; thua không đặt lại `loopsSeen`; bot
  ngồi yên giữa khung rồi đi ra khi khe mở hẳn → `won` trước hết vòng 4.
- Commit: `feat: boss loop with an exit that widens each loop`.

**6.5 Thị trấn sống lại.** `TOWN_AMBIENCE` (đèn cửa sổ, trời, chim, tranh trên tường nhà Linh từ `SaveData.drawing`),
câu `idle` của cư dân đã giải thoát, cảnh kết thật của từng cư dân ở thị trấn (~10 giây).
- Test: lớp nào bật đúng theo `freed`; tranh trên tường dựng được từ dữ liệu đã giản lược (cặp -1, -1 tách nét).
- Commit: `feat: town ambience grows as residents are freed`.

**6.6 Kiểm trọn vòng.** `src/testing/playthrough.test.ts`: chạy mọi lượt né của mọi cư dân bằng bot né đạn có nhìn
cảnh báo (cùng kiểu bot đã dùng ở bước 2, đặt trong `src/testing/`) cộng hành vi riêng (nhặt bút cho r4, đi ra khe cho
boss), và mọi tầng của mọi máy bằng bot tháo đúng nhịp. Kiểm: mọi lượt kết thúc (`won`) trong ≤ 2 lần độ dài kịch bản;
mọi máy tháo hết; không pool nào `dropped` > 0. Bot thua thì ghi số lần, không coi là lỗi, nhưng số lần thua mỗi lượt
> 3 thì ghi vào PLAYTEST.md "Chỗ không chắc".
- Commit: `test: full playthrough simulation with bots`.

### Bước 7: hoàn thiện

**7.1 Font VT323.** Tải file và giấy phép theo mục "Hình ảnh và âm thanh", `@font-face`, `FONT_FAMILY`, chờ font trước
khi vẽ, `CREDITS.md`, dòng mẫu debug 16/20/24/32. Script tạm đọc `cmap` (Node thuần, ngoài `src/`) xác nhận đủ ký tự.
Chỉnh lại cỡ chữ hộp thoại, gợi ý, tiêu đề theo mục đó.
- Xong khi: script báo 0 ký tự thiếu (ghi kết quả vào DECISIONS.md); build còn nhỏ (ghi dung lượng `dist/` trước/sau vào
  DECISIONS.md); `dialogue-box.test.ts` vẫn xanh.
- Commit: `feat: self-hosted VT323 font with full Vietnamese coverage`.

**7.2 Âm thanh.** Cue `ring`, `hum`, `bird`, `chime`, `pencilUp`, `pencilDrop`, `drawTick`, `blip` (nếu chưa có), nền
thị trấn (gió + tích xa 40 BPM), tích mỗi giây ở màn bắt đầu, các lớp tích tắc ở màn kết. Đều qua `playCue` hoặc một
lớp nền tắt/bật được bằng M.
- Test: Node không có WebAudio, nên dựng một `AudioContext` giả tối thiểu trong `src/testing/` (ghi lại node được tạo và
  lịch `start`/`stop`); `playCue` với mọi `CueName` chạy không ném lỗi và mọi nguồn đều có `stop` sau `start`; tắt tiếng
  thì gain của nền về 0. Nghe bằng tai để chủ dự án làm (ghi vào PLAYTEST.md).
- Commit: `feat: procedural cues and town ambience`.

**7.3 Hình ảnh.** Sprite placeholder cho người thợ, 5 cư dân (tư thế đông cứng và tư thế kết), bút chì, cửa tháp, các
bộ phận máy mới; ô thị trấn có màu riêng; cảnh nền `Backdrop` đẹp hơn dải màu; vignette có hình. Vẫn là dữ liệu
`definePixels`.
- Xong khi: mọi id sprite được tham chiếu trong `src/data/` đều có trong `SPRITES` (test mới trong `content.test.ts`).
- Commit: `feat: placeholder art pass for town, residents and parts`.

**7.4 PLAYTEST.md và dừng.** Viết PLAYTEST.md theo mục "Điểm dừng" (kèm danh sách "Chỗ không chắc" gom từ DECISIONS.md và
6.6), cập nhật "Trạng thái hiện tại" trong CLAUDE.md, commit, push, DỪNG.
- Commit: `docs: playtest guide after autopilot run`.

## Nhật ký

Sau mỗi commit, thêm một dòng: mốc, hash commit, ghi chú ngắn.

- 3b.1 — 4798045 — xóa trống giấy, tẩy, đuôi nét, cặp kim; SKETCH_FEEL/DISTRACTION_FEEL gộp lại.
- 3b.2 — 7fe0c8e — bút, trang, đồng hồ cô bé, finish/pencil, outcome; trang luôn khép được (maxLoops).
- 3b.3 — 84c0a22 — R4_ROUNDS (ba lượt), test chỗ đặt bút, bot vẽ xong ≤ 60 giây; main chơi thử vòng ba lượt.
