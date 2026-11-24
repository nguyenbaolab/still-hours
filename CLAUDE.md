# Still Hours

Game web 2D lấy cảm hứng từ Undertale. Tên folder và tên Cloudflare Worker: `still-hours`.

> File này là nguồn sự thật về thiết kế và quy ước của dự án. Khi làm việc, hãy đọc kỹ các mục
> "Quy trình làm việc", "Trạng thái hiện tại", "Thứ tự phát triển", "Thông điệp và nguyên tắc kể chuyện"
> và "Quy ước code" trước khi thêm bất cứ nội dung hay tính năng nào.

## Trạng thái hiện tại

*(Cập nhật mục này mỗi khi xong một bước. Chi tiết kỹ thuật nằm ở các mục bên dưới.)*

- **Đã xong, đã commit và push lên `origin/main`:**
  - Bước (1): di chuyển, va chạm, máu.
  - Bước (2): đạn theo beat + tiếng tích tắc procedural (đồng hồ nhịp lấy từ đồng hồ âm thanh, pattern dạng dữ liệu,
    cảnh báo công bằng, pool). Có bộ test Vitest (`npm test`) cho đồng bộ nhịp và quy tắc cảnh báo.
  - Bước (2b): độ phân giải logic 640×360. Mọi số pixel nhân đôi; sprite placeholder `scale` 2. Cảm giác chơi
    (thời gian đi hết khung, thời gian đạn bay qua khung, độ khó né sát) giữ nguyên.
  - Bước (3a): lời tiêu cực của cư dân 3 trong pha né đạn. Hệ số nhịp là lớp chung (`TempoMap.setPace`); đạn
    `word` không trừ máu. `main.ts` chọn pattern chơi thử qua hằng `PLAYTEST_PATTERN`.
  - Bước (3b): "Nhặt bút" cho cư dân 4 (mốc 3b.1–3b.3 của AUTOPILOT): trống giấy và tẩy đã xóa; bút, trang vẽ, đồng hồ
    của cô bé, `finish` (`length`, `page`), `DodgePhase.outcome`, ba lượt `R4_ROUNDS`. Hết máu thì `outcome` là `lost`
    (màn thua có ở mốc 4.1). `main.ts` chơi thử `R4_ROUNDS` khi `PLAYTEST_PHASE` là `"dodge"`.
  - Bước (3c): pha tháo lắp dùng chung, cỗ máy thử `CLOCKWORK` (commit `1a057f3`), rồi tầng (mốc 3c.1): `Part.stage`,
    `Workbench.setStage` / `stageComplete`, `DisassemblePhase(input, audio, mechanism, bench, stage)` với `outcome`
    (`playing` / `done`), `CLOCKWORK` chia 3 tầng. `PLAYTEST_PHASE` trong `main.ts` chọn `"battle"`, `"dodge"` hoặc
    `"disassemble"`.
- **Phiên thiết kế 2026-11-24 (chỉ tài liệu, không code):** thiết kế lại cư dân 4 thành **"Nhặt bút"** (mục cư dân 4),
  chốt mọi quyết định còn mở (cấu trúc trận, thua, màn bắt đầu/mở đầu/kết, thị trấn, hội thoại, cư dân 1–3 và boss,
  lưu tiến trình, font VT323, phím nhảy cóc), và tạo `AUTOPILOT.md` với kế hoạch từng mốc.
  - Bước 4.1: `ResidentData` (`data/residents/types.ts`), `FLOW_FEEL`, `scenes/battle-scene.ts` (`BattleScene`: 3 lượt,
    mờ đen giữa pha, màn thua không chữ rồi dựng lại đúng pha né, sprite `gear-cracked`, cue `mend`). Tháo xong tầng 3 thì
    tạm hiện "hết". `PLAYTEST_PHASE` mặc định là `"battle"` (cư dân 4 với máy tạm `CLOCKWORK`).
  - Bước 4.2: hội thoại. `data/dialogues.ts` (mọi đoạn thoại của game, `SPEAKERS`), `scenes/dialogue-box.ts`
    (`DialogueBox`, `wrapText`, `pauseAfter`), `Renderer.measureText`, `DIALOGUE_FEEL` (trong `flow-feel.ts`), cue `blip`
    (`playCue(cue, hz?)`).
  - Bước 4.3: cư dân 4 hoàn chỉnh. `data/mechanisms/alarm-clock.ts` (3 tầng, 4 câu ký ức), `data/residents/r4.ts` +
    `residents/index.ts` (`RESIDENTS`), `BattleScene` đọc hội thoại khép trận, `scenes/vignette.ts` (cảnh kết "pencil":
    tranh của người chơi thu vào khung 160×64, Linh cầm bút lên), `scenes/dialogue-scene.ts`, `core/drawing.ts`
    (`strokesFromSegments`, `fitStrokes`), `data/content.test.ts`. `main.ts` chạy: hội thoại mở → trận r4 → cảnh kết → lặp.
  - Bước 5.1: `scenes/director.ts` (`Director`: chuyển cảnh có mờ, cờ debug chung `core/debug.ts`, tắt/bật tiếng, đếm
    `playSeconds`), `scenes/title.ts` (`TitleScene` thay `press-start.ts`; menu Tiếp tục / Bắt đầu lại khi có bản lưu).
    Các cảnh không còn tự xử lý F1 và M.
  - Bước 5.2: `core/save.ts` (`parseSave`, `serializeSave`, `SaveStore`, giản lược tranh), cài đặt `muted`, móc `pagehide`.
  - Bước 5.3: `data/town.ts` (bản đồ 64 × 11, `TOWN_NPCS`, chỗ ngắm cảnh, biển, cổng), `scenes/town.ts` (`TownScene`:
    đi lại, va chạm ô, camera, tương tác, cổng, chỗ ngắm cảnh), `scenes/backdrop.ts`. `TownScene.drawWorld` vẽ thế giới
    với camera cho trước (màn kết dùng).
  - Bước 5.4: `core/format.ts` (`formatPlayTime`), `scenes/intro.ts` (`IntroScene`: tích tắc dừng hẳn ở dòng 2, im lặng
    rồi hiện chữ), `scenes/ending.ts` (`EndingScene`: camera trôi, tích tắc chồng lớp, thẻ thời gian, "Vẫn chưa muộn.",
    công trạng, xóa bản lưu), `data/credits.ts`, `INTRO_FEEL` / `ENDING_FEEL`. `main.ts`: "Bắt đầu" mới → cảnh mở đầu →
    thị trấn (ghi `seenIntro`); `PLAYTEST_PHASE = "ending"` để xem màn kết (không xóa bản lưu thật).
- **Bước tiếp theo:** mốc 5.5 trong `AUTOPILOT.md` (vòng chơi trọn vẹn với dữ liệu tạm cho r1–r3 và boss).
- **Vấn đề còn mở:**
  1. **Dọn tiến trình nền trên Windows.** Dừng một tác vụ nền (`npm run dev`, `npx wrangler dev`) bằng công cụ dừng
     tác vụ chỉ tắt lớp vỏ: `node`, `vite`, `workerd.exe` con vẫn sống và giữ cổng (5173, 5199, 8787); nếu chỉ kill
     con thì `wrangler dev` tự khởi động lại `workerd`. Cách dọn: tìm chủ cổng bằng `Get-NetTCPConnection -State Listen
     -LocalPort <cổng>`, kiểm tra dòng lệnh có `still-hours` (không đụng tiến trình khác, ví dụ MCP server), rồi
     `taskkill /PID <pid> /T /F` trên tiến trình trên cùng của cây, và kiểm lại cổng đã trống. Trước khi bật server nền,
     kiểm cổng trống và dùng `--strictPort` để xung đột báo lỗi rõ thay vì chạy nhầm server cũ.

## Quy trình làm việc (cho mọi trợ lý AI: Claude Code, Cursor...)

- Mỗi cuộc chat làm đúng một bước trong "Thứ tự phát triển".
- Làm xong thì KHÔNG commit, KHÔNG push. Dừng lại để chủ dự án chơi thử.
- Chỉ commit khi chủ dự án nói đã ưng, theo Conventional Commits. Không bao giờ force push. Không bao giờ deploy:
  cả `npm run deploy` lẫn `wrangler deploy`.
- Không tự bật `npm run dev`, `npx wrangler dev` hay tiến trình nền nào; chủ dự án tự chạy trong terminal của họ.
- Được tự chạy: `npm run build`, `npm test`.
- Gặp quyết định thiết kế chưa có trong file này: hỏi, không tự chốt.
- **Ngoại lệ:** trong lượt chạy tự động theo `AUTOPILOT.md`, file đó có hiệu lực cao hơn mục này (làm liên tục,
  commit và push sau mỗi mốc, tự quyết và ghi vào `DECISIONS.md`).
- Kết thúc mỗi bước: build sạch, `npm test` xanh, hướng dẫn chạy thử, danh sách con số nên chỉnh (file + tên hằng),
  cập nhật "Trạng thái hiện tại".
- Trả lời chủ dự án bằng tiếng Việt.

## Bối cảnh

Người chơi là **thợ sửa đồng hồ cuối cùng** trong một thị trấn mà thời gian ngừng chảy. Mỗi "kẻ thù" là một
cư dân bị kẹt trong một khoảnh khắc đau buồn. Thay vì đánh, người chơi **mở máy móc của họ ra**.

Mỗi trận xen kẽ hai pha:

- **Pha né đạn**: đạn xuất hiện theo nhịp tích tắc.
- **Pha tháo lắp**: tháo đúng bộ phận theo thứ tự để lộ mảnh ký ức.

## Thời lượng và nhịp độ

- Tổng thời gian chơi khoảng **20–25 phút**; người chơi chậm (đọc kỹ, thua nhiều) khoảng **30 phút**.
- Phân bổ dự kiến:
  - Mở đầu ~2 phút.
  - 4 cư dân + 1 boss, mỗi trận ~2,5–3 phút (chi tiết ở "Cấu trúc một trận").
  - Đi lại trong thị trấn và hội thoại giữa các trận ~1–2 phút mỗi lần.
  - Kết thúc ~2 phút.
- Thị trấn là một khu nhỏ có thể đi lại, có những chỗ để dừng lại ngắm cảnh. Những khoảng lặng này là một
  phần của thông điệp, **không phải đoạn đệm**.
- Tôn trọng thời gian người chơi:
  - Thua thì **chơi lại ngay từ đầu pha vừa thua**, không bắt chơi lại cả trận.
  - Hội thoại có thể **tua nhanh**.
  - Không cày cuốc, không câu giờ.
- **Tự động lưu tiến trình sau mỗi cư dân** (localStorage), để người chơi dừng giữa chừng và quay lại được.

## Cấu trúc một trận

*(Chốt ở phiên thiết kế 2026-11-24. Áp dụng cho mọi cư dân và boss.)*

- **Một trận = 3 lượt.** Mỗi lượt là một pha né rồi một pha tháo: né 1 → tháo tầng 1 → né 2 → tháo tầng 2 → né 3 →
  tháo tầng 3 (tầng 3 chứa `core`). Tháo xong `core` và đọc xong câu ký ức của nó thì trận kết thúc.
- **Trình tự đầy đủ:** hội thoại mở trận (ở thị trấn, cạnh cư dân) → 3 lượt → hội thoại khép trận (trong cảnh trận,
  nền tối) → cảnh kết của cư dân (ở thị trấn, ~10 giây, không bắt buộc có chữ) → tự động lưu → người chơi đi tiếp.
- **Độ dài mục tiêu:** mỗi pha né 25–30 giây trên tempo kịch bản, mỗi pha tháo 3–4 bộ phận (~15 giây), hội thoại mở +
  khép ≤ 30 giây đọc thường. Cộng lại ~2,5 phút một trận. Tổng game: mở đầu 2 + 5 trận × 2,5 + đi lại 4 × 1,5 + kết 2
  ≈ 22,5 phút; người chậm ~30 phút.
- **Pha né kết thúc thế nào** (`Pattern.finish`, mục "Định dạng pattern"):
  - `length` (mặc định, cư dân 1, 2, 3): `loop: false`, xong khi beat nghe được ≥ `lengthBeats`. Đạn còn lại mờ đi
    trong `FLOW_FEEL.clearSeconds` và không trừ máu. Tác giả pattern để trống 2 beat cuối.
  - `page` (cư dân 4): `loop: true`, xong khi đã vẽ đủ `drawBeats` beat, hoặc khi hết `DRAW_FEEL.maxLoops` vòng
    pattern dù chưa vẽ đủ (xem cư dân 4, "Trang luôn khép được").
  - `exit` (boss): `loop: true`, xong khi bánh răng bước ra khỏi khung qua khe cửa (xem boss).
- **Máu:** đầy lại ở đầu mỗi pha né. Máu tối đa giữ `PLAYER_FEEL.maxHp` (20).
- **Chuyển cảnh:** mờ đen `FLOW_FEEL.fadeSeconds` (0,4 giây) giữa mọi cảnh và giữa các pha. Đồng hồ nhịp của pha mới
  dựng sau khi mờ xong (dạo đầu `leadInSeconds` như hiện nay). Không có tiếng tích tắc trong lúc mờ.
- **Pha tháo theo tầng:** xem mục "Pha tháo lắp", phần "Tầng".

### Thua

- Chỉ thua được ở pha né, khi máu về 0. Pha tháo không thua được.
- **Màn thua không có chữ.** Khung và đạn dừng hình, bánh răng nứt (sprite `gear-cracked`). Mọi thứ trừ bánh răng mờ
  về đen trong `FLOW_FEEL.fadeSeconds`. Bánh răng nứt nằm yên giữa màn tối, không tiếng, trong
  `FLOW_FEEL.loseHoldSeconds` (1,2 giây). Rồi vết nứt khép lại (đổi sprite về `gear`) cùng cue `mend` (một tiếng cạch
  nhỏ, rồi một tiếng tích), và pha né mờ vào lại. Confirm bỏ qua phần giữ. Không có lựa chọn, không có "thoát".
- **Vì sao không dùng chữ** (chốt 2026-11-24, thay bản trước dùng "Chưa muộn."): câu "Vẫn chưa muộn." chỉ được xuất hiện
  **một lần** trong cả game, ở màn kết. Nếu màn thua nói gần cùng câu, người chơi đọc nó hàng chục lần và câu cuối thành
  câu quen tai, mất sức nặng. Ý "bắt đầu lại được" ở màn thua đi bằng hành động: người thợ tự sửa bánh răng của mình
  (cơ chế mang thông điệp, không lời). Phương án bỏ: một câu khác như "Lại nào." (vẫn là chữ, vẫn mòn khi lặp, dễ
  nghe thành lời động viên); cắt thẳng về beat 0 không có gì (mất một nhịp thở sau khi thua, người chơi không kịp
  hiểu chuyện gì xảy ra).
- Rồi **chơi lại đúng pha né vừa thua, từ beat 0**, máu đầy, cùng pattern. Không chơi lại pha tháo trước đó, không
  chơi lại lượt trước. Số lần thua không được đếm hay hiện ở đâu.
- Ngoại lệ của cư dân 4: tranh (mọi nét) và số beat đã vẽ của lượt hiện tại **giữ nguyên** khi thua; bút về chỗ
  đặt ban đầu, chưa cầm. Lý do: mọi nét đều được tính, kể cả nét vẽ trước khi ngã.
- Ngoại lệ của boss: thua là "vòng lặp quay lại từ đầu", cùng màn bánh răng nứt rồi lành; số vòng đã qua (dùng để mở rộng khe
  cửa) **không** đặt lại.
- Code: `DodgePhase.outcome` là `"playing" | "won" | "lost"`. `BattleScene` đọc và quyết định; pha không tự dựng lại
  chính nó.

### Màn bắt đầu

- `TitleScene` (thay `PressStartScene`, giữ cách chờ `audio.ready`): bánh răng, chữ "Still Hours", dòng nhấp nháy
  "Nhấn phím bất kỳ để bắt đầu". Phím đầu tiên mở khóa âm thanh.
- Sau đó: không có bản lưu → vào thẳng màn mở đầu. Có bản lưu → menu hai dòng **"Tiếp tục"** / **"Bắt đầu lại"**
  (lên/xuống, confirm). "Bắt đầu lại" hỏi thêm một dòng "Xóa tiến trình cũ? Z: có · X: không".
- Dòng gợi ý phím ở dưới (giữ như hiện nay): di chuyển, Shift, Z, X giữ để tua chữ, M, F1.

### Màn mở đầu (~2 phút)

1. **Cảnh mở (≈40 giây, `IntroScene`)**: nền đen, vài hình placeholder đơn giản (mặt đồng hồ, mái nhà). Tiếng tích tắc
   chạy rồi dừng hẳn ở dòng 2. Hội thoại dẫn chuyện (`DIALOGUES.introOpening`), người dẫn không tên:
   - "Thị trấn có một trăm hai mươi bảy chiếc đồng hồ."
   - "Một buổi chiều, tất cả cùng dừng ở bốn giờ mười bảy phút."
   - "Người ta vẫn đứng đó. Giữa câu nói. Giữa bước chân."
   - "Chỉ còn một người thợ sửa đồng hồ."
2. **Tiệm đồng hồ (≈60–80 giây, trong `TownScene`)**: người chơi bắt đầu trong tiệm ở đầu tây thị trấn. Trên bàn có tờ
   giấy (đọc bằng Z): "Đồng hồ nào cũng mở ra được." Đây là lần duy nhất dạy cách tương tác; không có hướng dẫn chữ
   khác. Đi ra cửa, đi tới cư dân 1.
3. Xong cảnh mở thì lưu `seenIntro: true`. Lần sau "Tiếp tục" không chiếu lại.

### Màn kết (~2 phút, `EndingScene`)

1. Sau hội thoại khép trận của boss: camera thị trấn tự trôi chậm từ tháp đồng hồ về phía tây (~40 giây, không điều
   khiển). Tiếng tích tắc trở lại, lớp chồng lớp khi đi ngang từng cư dân. Mỗi cư dân đang làm việc nhỏ của cảnh kết
   riêng (gọi điện, ngẩng nhìn trời, ngân nga, cầm bút). Không chữ.
2. Mờ đen. Giữa màn, cỡ 24: tổng thời gian chơi, dạng **"22 phút 41 giây"** (từ 60 phút trở lên: "1 giờ 3 phút").
   2 giây sau, dòng dưới, cỡ 20: **"Vẫn chưa muộn."** Giữ tới khi người chơi bấm confirm (ít nhất 4 giây).
3. Danh sách công trạng ngắn (tên game, font và giấy phép theo `CREDITS.md`), tự cuộn ~20 giây, confirm bỏ qua.
4. Xóa bản lưu, về `TitleScene`.
- Thời gian chơi: cộng số tick của mọi cảnh (1/60 giây mỗi tick), kể cả lúc đọc hội thoại và lúc ngắm cảnh; không tính
  lúc tab ẩn (vòng lặp dừng). Lưu trong `SaveData.playSeconds`.

## Nhân vật

*(Chốt ở phiên thiết kế 2026-11-24. Câu thoại và câu ký ức dưới đây là bản nháp đã chốt để dùng; chủ dự án có thể sửa
chữ sau mà không đổi cơ chế. Câu ký ức ≤ 40 ký tự, câu thoại ≤ 2 dòng hộp thoại.)*

Thứ tự gặp trong thị trấn cố định: 1 → 2 → 3 → 4 → boss (lý do ở mục "Thị trấn"). Mỗi cư dân có id dữ liệu `r1`…`r4`,
boss là `boss`. Dữ liệu của mỗi người nằm ở `src/data/residents/<id>.ts` (kiểu `ResidentData`, mục "Dữ liệu cư dân").

### 1. Bác Hòa, người lỡ hẹn với gia đình (`r1`)

- **Khoảnh khắc bị kẹt:** đứng trước cửa cơ quan lúc bảy giờ tối, cặp trong tay, điện thoại sáng màn hình: "Thêm
  một tiếng nữa thôi."
- **Pha né: tích tắc dồn dập.** BPM cao và tăng dần trong lượt (sự kiện `tempo`), đạn `straight` thành chuỗi theo từng
  beat xen hai bên, `aimed` 3 viên mỗi 4 beat, lượt 3 thêm `sweep`. Không có cơ chế riêng nào khác: cái khó là nhịp
  dồn. `finish: length`.
  - Lượt 1: 120 → 144 BPM trong 32 beat đầu, dài 60 beat (~27 giây).
  - Lượt 2: 132 → 160 BPM, 64 beat.
  - Lượt 3: 144 → 176 BPM, 68 beat, có 2 `sweep` (kim đồng hồ quay `degreesPerBeat` 30).
- **Pha tháo: đồng hồ quả quýt (`POCKET_WATCH`), chậm và êm.** `rhythmic: false`, `bpm` 60. Phần lớn là `lift` và
  `unhook`; không có `unscrew` (đỡ phải bấm nhiều). Tầng 1: nắp sau, vòng đệm. Tầng 2: mặt số, kim. Tầng 3: dây cót,
  bánh lắc (`core`).
- **Mảnh ký ức:** "Mâm cơm để phần, đã nguội." · "Ba cuộc gọi nhỡ. Con gái." · "Bánh sinh nhật chưa cắt." · core:
  "Con hỏi: mai ba có về không?"
- **Kết:** bác bấm số. Tiếng chuông chờ đổ (cue `ring`, procedural, 3 hồi). Mờ trước khi biết có ai nghe máy.
- Hội thoại mở: "Thêm một tiếng nữa thôi. Rồi về." Khép: "...Mấy giờ rồi nhỉ."

### 2. Chú Minh, người cả đời chưa ngẩng đầu nhìn quanh (`r2`)

- **Khoảnh khắc bị kẹt:** người đưa thư cúi đầu đi vội trên cầu, mắt dán xuống đồng hồ đeo tay.
- **Pha né: đứng yên thì thế giới hiện ra.** Pattern đặt `still` (mục "Định dạng pattern").
  - "Đứng yên" = không có input di chuyển và bánh răng không bị kéo quá 0,5 px trong tick, liên tục
    `STILL_FEEL.stillSeconds` (1,0 giây nghe được).
  - Khi đủ: `setPace(beat nguyên kế tiếp, STILL_FEEL.pace)` với `pace` 0,75; cảnh nền (dữ liệu `Backdrop`: bầu trời,
    mây, cánh chim, vẽ bằng hình khối) hiện dần sau đạn trong `STILL_FEEL.fadeInSeconds` (1,0 giây).
  - Di chuyển lại: `setPace(beat nguyên kế tiếp, 1)`, cảnh nền tắt trong `STILL_FEEL.fadeOutSeconds` (0,3 giây).
  - Ràng buộc: trận dài nhất 1 / 0,75 ≈ 1,33 lần kịch bản. Pattern có `aimed` mỗi 8 beat, nên không đứng yên mãi được.
    Pattern có `still` không được có đạn `word` (hai nguồn cùng gọi `setPace`); `validatePattern` từ chối.
  - Lớp chung, đặt ở `battle/stillness.ts` (lớp `Stillness`, cùng kiểu với `Pace`). Boss dùng lại.
  - `finish: length`. Ba lượt, 100 BPM, 52 / 56 / 60 beat. Cảnh nền mỗi lượt một hình: hoàng hôn, mây, đàn chim.
- **Pha tháo: đồng hồ bấm giờ (`STOPWATCH`).** `rhythmic: true`, `bpm` 96. Có `unscrew`.
- **Mảnh ký ức:** "Con diều mắc trên dây điện." · "Mùa hoa sữa, năm nào cũng vội." · "Con mèo chờ ở bậc cửa." · core:
  "Bầu trời hôm ấy rất xanh."
- **Kết:** chú dừng lại, ngẩng đầu (sprite đổi sang `r2-up`). Ô trời phía trên chỗ chú có màu.
- Hội thoại mở: "Trễ rồi, trễ rồi." Khép: "Ở đây... có cây phượng này từ bao giờ?"

### 3. Chị Vân, người bị lời người khác ám ảnh (`r3`)

- **Khoảnh khắc bị kẹt:** ngồi một mình trên ghế đá ở quảng trường, cạnh bảng tin dán kín giấy. Từng là người hát.
- **Pha né: lời tiêu cực làm chậm nhịp** (đã có từ bước 3a). Lời **không trừ máu**; cái giá là thời gian.
- **Chốt các điểm còn mở:**
  - **Sàn nhịp đổi từ 0,8 thành 0,7** (`PACE_FEEL.floor`). Lý do: 100 → 80 BPM nghe ra chậm nhưng chưa ra "kéo lê";
    70 BPM thì rõ. Ràng buộc mới: ôm hết mọi câu thì lượt dài tối đa 1 / 0,7 ≈ 1,43 lần kịch bản (lượt 26 giây
    thành ~37 giây); ôm khoảng một nửa thì ≤ ~1,2 lần vì hồi ở mỗi câu đi qua. `drop` 0,1 và `recover` 0,1 giữ nguyên.
  - **Không còn chỉ toàn chữ:** mỗi lượt có thêm đạn thường trừ máu (`straight`, `aimed`) khoảng mỗi 4 beat, thưa hơn
    chữ, đặt sao cho né đạn đôi khi buộc phải chọn giữa né chữ và né đạn.
  - **Có mặt đồng hồ trễ:** một mặt đồng hồ nhỏ (bán kính 14 px) ngay ngoài góc phải trên của khung. Kim mờ chỉ giờ
    thật đã trôi (`clock.time`), kim sáng chỉ giờ kịch bản của beat đang nghe (`tempo.scriptTimeAtBeat(beat)`). Một
    vòng = 60 giây. Ôm câu thì kim sáng tụt lại sau kim mờ. Không chữ, không số. Bật bằng `Pattern.lagClock: true`.
- `finish: length`. Ba lượt, 100 BPM, 48 / 52 / 56 beat (kịch bản).
- **Pha tháo: máy đếm nhịp (`METRONOME`).** `rhythmic: true`, `bpm` 88.
- **Mảnh ký ức:** "Sân khấu trường, tràng vỗ tay đầu tiên." · "Cây đàn trên nóc tủ." · "Bài hát viết dở." · core:
  "Giọng mình. Lâu rồi không nghe."
- **Kết:** chị ngân nga khẽ: cue `hum` (4 nốt sin mềm, procedural). Không chữ.
- Hội thoại mở: "Họ nói đúng mà." Khép: "Mình hát... dở lắm. Nhưng mình thích hát."
- Câu của đạn chữ (thay câu tạm trong `data/words.ts`, 2–5 chữ): "hát gì mà hát", "ai thèm nghe", "lo học đi",
  "mơ mộng hão", "để người khác lo", "biết thân biết phận", "chẳng ra gì", "phí thời gian".

### 4. Linh, cô bé yêu vẽ (`r4`)

- **Khoảnh khắc bị kẹt:** ngồi ở bàn học cạnh cửa sổ, sách chuyên ngành mở, tập vẽ gập lại, điện thoại sáng. Yêu vẽ
  nhưng chưa thành, giờ học trái ngành, thấy mình chưa làm được gì, rồi để thời gian trôi vào việc khác.
- **Thông điệp phải giữ:** *Cứ vẽ đi. Đừng quan tâm xấu hay đẹp. Quan trọng là cầm bút lên và làm.*

#### Cơ chế đã chọn: "Nhặt bút"

Khung né là một tờ giấy. Một cây bút chì nằm trên giấy. Bánh răng chạm vào bút thì cầm bút; từ lúc đó **mọi bước
đi đều để lại nét chì**, không có hình mẫu, không chấm điểm. Chạm vào thứ xao nhãng thì **đánh rơi bút**: bút văng ra
một quãng, phải đi nhặt lại. Một mặt đồng hồ nhỏ của cô bé **chỉ chạy khi đang vẽ**. Đủ một vòng thì trang xong.

1. **Bút nằm yên.** Đầu mỗi lượt, bút nằm ở `Pattern.pencil` (tỉ lệ 0..1 của khung), bánh răng ở giữa khung, chưa cầm.
   Bút lóe sáng mỗi `DRAW_FEEL.glintEveryBeats` beat (4) để người chơi để ý. Không có chữ hướng dẫn. Không tự cầm.
2. **Cầm bút.** Tâm bánh răng cách tâm bút ≤ `DRAW_FEEL.pickupRadius` (14 px) thì cầm (cue `pencilUp`). Sau khi rơi,
   phải chờ `DRAW_FEEL.pickupDelaySeconds` (0,3 giây) mới nhặt lại được, để không nhặt ngay tại chỗ va.
3. **Vẽ.** Khi cầm bút, `Sketch.sample(x, y, slow)` mỗi tick như bản vòng 1: đứng yên không sinh đoạn, Shift cho nét
   đậm và mịn (`SKETCH_FEEL.slowWidth`, `slowSampleDistance`). Nét lưu là đường thật trong toạ độ màn hình. Mọi nét
   hiện suốt lúc chơi, màu chì `SKETCH_FEEL.color` với độ đậm `DRAW_FEEL.liveInkAlpha` (0,45), vẽ dưới đạn. Tối đa
   `DRAW_FEEL.maxSegments` (6000) đoạn; quá thì thôi ghi nét nhưng vẫn tính tiến độ.
4. **Đồng hồ của cô bé.** Mặt đồng hồ bán kính 14 px ngay ngoài góc phải trên của khung. Mỗi tick, nếu đang cầm bút
   **và** bánh răng đã dịch ít nhất 0,5 px trong tick, cộng `beat − beatTickTrước` (beat nghe được) vào `drawnBeats`.
   Kim chỉ `drawnBeats / drawBeats` × 360°. Mỗi lần qua một beat nguyên đã vẽ thì kim nhích (cue `drawTick`, rất nhỏ).
   Thế giới vẫn tích tắc đều; chỉ kim của cô bé đứng khi không vẽ. Đó là chỗ người chơi *thấy* thời gian trôi qua
   khi không làm.
5. **Xao nhãng.** Đạn `distraction` giữ lực hút `DISTRACTION_FEEL.pull` (24 px/giây) và kiểu treo đung đưa (`hang`).
   Chỉ khi **đang cầm bút** thì chạm mới có tác dụng: bút rơi (cue `pencilDrop`), `Sketch.lift()`, bút văng
   `DRAW_FEEL.dropDistance` (56 px) theo hướng từ tâm đạn về tâm bánh răng, kẹp trong khung cách mép
   `DRAW_FEEL.dropMargin` (20 px), đạn biến mất. Không cầm bút thì đạn bay xuyên qua (vẫn hút). **Không trừ máu, không
   tẩy nét.**
6. **Đạn thường** (`straight`, `aimed`, `burst`, `sweep`) trừ máu như mọi pha né. Bị trúng không làm rơi bút: đau
   không làm cô dừng, xao nhãng mới làm.
7. **Câu tự nhủ.** Nếu sau một vòng pattern trọn vẹn mà chưa từng cầm bút trong lượt, hiện một câu nhỏ (cỡ 16, màu
   `#8a7f68`) ngay trên khung trong 3 giây, lấy lần lượt từ `R4_IDLE_LINES`: "Mai vẽ cũng được." · "Giờ vẽ thì muộn
   rồi." · "Vẽ cũng chẳng đẹp." Đó là giọng trì hoãn của cô, không phải lời khuyên. Không lặp quá 3 câu mỗi lượt.
8. **Trang xong.** `drawnBeats ≥ finish.drawBeats` → pha thắng: thôi sinh đạn, hủy tiếng đã hẹn, khung và đạn mờ đi
   (`veil`, như hiện nay), **tua lại nét của lượt này** theo đúng thứ tự vẽ bằng nét sáp (`SKETCH_FEEL.crayonWidth`,
   `crayonColor`) trong `SKETCH_FEEL.replaySeconds` (2,8 giây), nét các lượt trước hiện sẵn bằng sáp, rồi giữ tranh
   `SKETCH_FEEL.revealSeconds` (3,5 giây). Không viền, không điểm, không lời nhận xét. Rồi `outcome = "won"`.
   **Trang luôn khép được (không có trạng thái kẹt).** Nếu beat nghe được của lần chơi này đạt
   `DRAW_FEEL.maxLoops` × `lengthBeats` (mặc định 3 vòng, ~58 giây ở 100 BPM, ~53 giây ở 108 BPM) mà `drawnBeats` vẫn
   chưa đủ, trang vẫn khép y như khi xong: cùng màn lộ tranh, cùng `outcome = "won"`, sang pha tháo. Áp dụng cho mọi
   trường hợp: không bao giờ nhặt bút, cầm bút mà đứng yên, hay vẽ quá ít. Đồng hồ của cô bé dừng ở chỗ kim đang chỉ,
   không nhảy cho đủ vòng. Màn lộ tranh chiếu đúng những gì có: chưa có nét nào thì chỉ là tờ giấy trắng giữ trong
   `revealSeconds`, không chữ, không nhận xét. Lý do: thời gian vẫn trôi khi không làm, và trang trắng là chính cái giá
   đó, nói bằng hình chứ không bằng phạt hay lời. 3 vòng dài hơn hẳn một lượt vẽ bình thường (~26 giây) nên không ai có
   lợi khi đứng chờ. Đếm từ beat 0 của lần chơi hiện tại: thua rồi chơi lại thì đếm lại từ đầu (tranh và `drawnBeats`
   vẫn giữ như mục "Thua").
9. **Một tờ giấy cho cả trận.** Ba lượt vẽ tiếp trên cùng một trang (`PageState`, do `BattleScene` giữ). Thua giữ
   nguyên trang (mục "Thua").
10. **Kết.** Hội thoại khép trận xong, cảnh kết ở bàn học: tờ giấy trên bàn hiện **chính tranh người chơi vừa vẽ**
    (thu nhỏ vào khung 160×64), cô bé cầm cây bút chì lên (sprite `r4-pencil`, nhấc bút lên 6 px trong 0,5 giây). Không
    chữ. Tranh được giản lược và lưu vào `SaveData.drawing`; sau đó treo trên tường nhà cô trong thị trấn.
    Người chơi không vẽ nét nào cả trận: tờ giấy trên bàn trắng, cô bé vẫn cầm bút lên như thường, `drawing` lưu mảng
    rỗng, trên tường treo một tờ giấy trắng. Kết thúc mở vẫn đúng: cô cầm bút, chưa vẽ gì cũng được.

**Vì sao cơ chế này truyền đúng thông điệp**

- *Cứ vẽ đi:* thứ duy nhất làm trang đầy là thời gian thật sự cầm bút và đi. Vẽ gì cũng được, nguệch ngoạc cũng được.
- *Đừng quan tâm xấu hay đẹp:* không có hình mẫu, không có vùng "đúng", không đo độ giống, không điểm. Nét xấu và nét
  đẹp làm kim chạy như nhau. Tranh cuối được tua lại và giữ trang trọng như mọi bức tranh.
- *Cầm bút lên và làm:* hành động đầu tiên của mỗi lượt là đi tới và cầm bút. Chưa cầm thì kim đứng, thế giới vẫn
  tích tắc. Cái cản là **không bắt đầu**.
- *Bỏ dở vì xao nhãng:* xao nhãng không xóa những gì đã làm, nó làm cô **buông bút**. Cái giá là quãng phải quay lại
  nhặt và quãng kim đứng yên. Bắt đầu lại luôn chỉ cách vài bước chân, đúng thông điệp chung "vẫn chưa muộn để bắt
  đầu lại".
- *Kết:* cô bé cầm bút chì lên chính là hành động người chơi đã làm suốt trận.

**Phương án đã cân nhắc và bỏ**

1. *Giữ trống giấy (vòng 3), bỏ chặn bút theo hình mẫu.* Bút luôn chạm giấy, giấy trôi, bánh răng khóa cột giữa. Bỏ
   vì: khóa một chiều thì tranh chỉ còn là đường đồ thị nhấp nhô, không phải bức vẽ; cặp kim được sinh từ hình mẫu nên
   bỏ hình mẫu là mất luôn đạn chính; và bản chất "đi theo nét có sẵn" là chấm điểm trá hình.
2. *Giữ phím confirm để hạ bút.* Cầm bút = giữ Z trong lúc né. Bỏ vì: bắt người chơi giữ thêm một phím suốt pha né là
   gánh nặng tay; "không bắt đầu" thành việc quên giữ phím chứ không phải một lựa chọn nhìn thấy được; xao nhãng không
   có cách thể hiện "buông bút" rõ ràng.
3. *Đã thử trước đó và bỏ:* tẩy nét khi chạm xao nhãng (vòng 1–3) và đèn dẫn (vòng 2). Tẩy nói rằng công sức đã làm
   bị mất, trái với "mọi nét đều được tính"; đèn dẫn và trống giấy đều là hình mẫu đúng.

**Pattern dự kiến** (3 file, `src/data/patterns/resident-4.ts` xuất `R4_ROUNDS`; mọi lượt `loop: true`,
`finish: { kind: "page", drawBeats }`, vòng 32 beat; vị trí là tỉ lệ 0..1)

- **Lượt 1** (`bpm` 100, `pencil` {x 0,25, y 0,5}, `drawBeats` 32; ước ~26 giây nếu vẽ ~75% thời gian):

  | beat | sự kiện |
  | ---- | ------- |
  | 2    | `distraction` từ `top`, `at` 0,7, `hang` |
  | 6    | `distraction` từ `right`, `at` 0,3 |
  | 8    | `straight` từ `left` `at` 0,2 và từ `left` `at` 0,8 |
  | 10   | `distraction` từ `right`, `at` 0,65 |
  | 12   | `aimed` từ `top`, `at` 0,5, `count` 1 |
  | 14   | `straight` từ `right`, `at` 0,5, `count` 3, `spacing` 24 |
  | 16   | `distraction` từ `top`, `at` 0,3, `hang` |
  | 18   | `aimed` từ `bottom`, `at` 0,3, `count` 2, `spreadDeg` 20 |
  | 20   | `straight` từ `top` `at` 0,15 và từ `top` `at` 0,85 |
  | 22   | `distraction` từ `left`, `at` 0,4 |
  | 24   | `burst` `x` 0,5 `y` 0,5, `count` 8 |
  | 26   | `aimed` từ `right`, `at` 0,5, `count` 3, `spreadDeg` 16 |
  | 28   | `distraction` từ `top`, `at` 0,55, `hang` |
  | 30   | `straight` từ `left`, `at` 0,5, `count` 2, `spacing` 32 |

  8 beat đầu không có đạn trừ máu: chỗ để người chơi nhận ra cây bút.
- **Lượt 2** (`bpm` 104, `pencil` {0,75, 0,3}, `drawBeats` 32): khung như lượt 1 nhưng 6 `distraction` mỗi vòng (beat 2,
  7, 12, 17, 22, 27; xen `hang` và bay ngang), đạn thường mỗi 2 beat từ beat 4, thêm `aimed` `count` 3 ở beat 15 và 31.
- **Lượt 3** (`bpm` 108, `pencil` {0,5, 0,8}, `drawBeats` 36): 6 `distraction`, đạn thường mỗi 2 beat, một `sweep` ở beat
  16 (`x` 0,5, `y` 0,5, `length` 70, `degreesPerBeat` 30, `durationBeats` 8) để giữa khung thành vùng phải vòng quanh.
- Không đặt `distraction` hay đạn trong bán kính 40 px quanh chỗ bút nằm trong 4 beat đầu của vòng.

**Con số cảm giác** (mới: `DRAW_FEEL` trong `src/data/sketch-feel.ts`)

| Muốn… | Chỉnh |
| ----- | ----- |
| Nhặt bút dễ/khó | `DRAW_FEEL.pickupRadius` (14) |
| Chờ bao lâu mới nhặt lại được | `DRAW_FEEL.pickupDelaySeconds` (0,3) |
| Bút văng xa bao nhiêu khi rơi | `DRAW_FEEL.dropDistance` (56), `dropMargin` (20) |
| Bút lóe sáng thưa/dày | `DRAW_FEEL.glintEveryBeats` (4) |
| Nét lúc chơi đậm/nhạt | `DRAW_FEEL.liveInkAlpha` (0,45) |
| Trần số đoạn nét | `DRAW_FEEL.maxSegments` (6000) |
| Bao nhiêu beat vẽ thì xong trang | `finish.drawBeats` trong từng lượt của `resident-4.ts` |
| Sau bao nhiêu vòng pattern thì trang tự khép dù chưa đủ | `DRAW_FEEL.maxLoops` (3) |
| Nét mảnh/đậm, gãy/mịn | `SKETCH_FEEL.width`, `slowWidth`, `sampleDistance`, `slowSampleDistance` (giữ) |
| Tua lại / giữ tranh bao lâu | `SKETCH_FEEL.replaySeconds` (2,8), `revealSeconds` (3,5) |
| Nét sáp dày bao nhiêu, màu gì | `SKETCH_FEEL.crayonWidth` (9), `crayonColor` |
| Lực hút, tốc độ, cỡ đạn xao nhãng | `DISTRACTION_FEEL.pull`, `speed`, `radius` (giữ) |
| Đung đưa | `DISTRACTION_FEEL.threadLength`, `swingAmplitude`, `swingPerBeat`, `hangBeats` (chuyển từ `PAPER_FEEL`) |

**Giữ lại từ code hiện có**

- `battle/sketch.ts`: `Sketch` (`sample`, `lift`, `segments`, `count`) và `replayPieces` (bỏ cờ `erased` ra khỏi kết quả).
- Đạn `distraction` và kiểu `hang` (handler trong `spawners.ts`, vẽ trong `bullets.ts`), lực hút `pullPlayer`.
- Màn lộ tranh của `DodgePhase` (`veil`, `renderReplay`, giữ đồng hồ bằng `clock.hold`), đổi chỗ kích hoạt: từ "hết mỗi
  vòng pattern có `gallery`" sang "trang xong".
- `SKETCH_FEEL.width`, `slowWidth`, `sampleDistance`, `slowSampleDistance`, `revealSeconds`, `color`.

**Xóa**

- `battle/paper.ts`, `battle/paper.test.ts`, `data/paper.ts`, `data/figures/child-drawing.ts` (và thư mục `figures/`).
- `battle/tail.ts` (nét hiện suốt nên không cần đuôi) và phần `tail` trong `testing/fixtures.ts` nếu chỉ dùng cho nó.
- Loại đạn `hands` (`HandsEvent`, handler, phần vẽ và va chạm trong `bullets.ts`), `withPaperHands` trong
  `pattern-runner.ts`, tham số `column` và `keepColumn` trong `player.ts`.
- `Pattern.paper` và `Pattern.gallery` (thay bằng `pencil` và `finish`).
- Tẩy: `Sketch.erase`, `EraserPlay`, `eraseGeneration`, cờ `erased`, test tẩy trong `sketch.test.ts`, và
  `SKETCH_FEEL.eraseLength`, `eraserSpeed`, `erasedAlpha`, `eraserColor`.
- `PAPER_FEEL`: xóa hẳn; `replaySeconds`, `crayonWidth`, `crayonColor` chuyển vào `SKETCH_FEEL`; bốn số đung đưa chuyển
  vào `DISTRACTION_FEEL`.
- `distraction.test.ts`: sửa lại cho luật mới (không trừ máu, có cảnh báo khi `pull` > 0, chỉ có tác dụng khi cầm bút).

**Mã mới:** `battle/page.ts` (logic thuần, có test): `PageState { sketch, drawnBeats, pastSegments }`,
`pencilPickup(...)`, `dropPoint(gear, distraction, arena, feel)`, `addDrawnBeats(...)`. `DodgePhase` nhận
`options.page` (không có thì tự tạo khi pattern có `pencil`).

- **Mảnh ký ức** (pha tháo `ALARM_CLOCK`, `rhythmic: true`, `bpm` 100): "Hộp chì màu mười hai cây." · "Con mèo vẽ
  được dán lên tủ lạnh." · "Tập vẽ, trang đầu còn trắng." · core: "Hồi đó vẽ mà chẳng nghĩ gì."
- Hội thoại mở: "Mai mình vẽ." Khép: "Xấu thật đấy." (dừng một nhịp) "...Nhưng là của mình."

### 5. Ông Khải, người thợ đồng hồ đã phí cả đời (`boss`)

- **Khoảnh khắc bị kẹt:** trong tháp đồng hồ, trước bàn thợ, tay cầm chiếc đồng hồ đang sửa dở từ nhiều năm. Không
  nói ông là ai với người chơi; để ngỏ.
- **Không cần thắng, chỉ cần bước ra khỏi vòng lặp.** Mỗi pha né là một vòng lặp y hệt nhau (`loop: true`), thua thì
  vòng quay lại. Lối ra là **khe cửa** trên viền khung (`finish: { kind: "exit", ... }`):
  - Khe nằm trên cạnh `side`, tâm ở `at` (tỉ lệ), mở ở `openBeat` của mỗi vòng, rộng `widths[k]` px trong
    `openBeats[k]` beat, với `k` = số vòng đã qua (kẹp vào phần tử cuối). Mặc định `widths` [28, 44, 64],
    `openBeats` [2, 4, 999]: vòng 3 trở đi khe mở rồi không đóng. Từ vòng 4 khe mở ngay từ beat 0.
  - 1 beat trước khi mở, đoạn viền ở khe nhấp nháy (cảnh báo công bằng, cùng nhịp nháy `telegraphFlashSeconds`).
  - Khi khe mở, `Player.update` không kẹp bánh răng ở cạnh đó trong khoảng khe. Tâm bánh răng ra khỏi viền ngoài khung
    → pha thắng. Khe đóng khi bánh răng đang ở giữa khe thì đẩy về trong khung.
  - Số vòng đã qua giữ qua các lần thua (do `BattleScene` giữ, truyền vào `options.loopsSeen`).
  - Bảo đảm: chậm nhất đầu vòng 4 (≈ 3 × 20 giây) lối ra mở hẳn.
- **Ba lượt, mỗi lượt nhắc lại hai cư dân, khe cửa ở cả ba:**
  - Lượt 1 "giờ làm": tích tắc dồn (120 → 150 BPM, `straight` chuỗi, `aimed`), vòng 32 beat, khe `right` `at` 0,5,
    `openBeat` 24.
  - Lượt 2 "ngẩng lên": `still` với cảnh nền tháp nhìn ra thị trấn, `distraction` (không có bút nên chỉ hút), vòng
    32 beat, khe `top` `at` 0,5, `openBeat` 20.
  - Lượt 3 "vòng lặp": `word` và đạn thường, `lagClock`, vòng 32 beat, khe `left` `at` 0,5, `openBeat` 28.
- **Pha tháo: máy tháp đồng hồ (`TOWER_CLOCK`).** `rhythmic: true`, `bpm` 72. `core` là bộ thoát (`escapement`):
  tháo bộ thoát thì vòng lặp dừng.
- **Mảnh ký ức:** "Tiệm chưa bao giờ đóng cửa sớm." · "Lá thư viết xong, chưa gửi." · "Sang năm. Sang năm nữa." ·
  core: "Còn kịp không?"
- **Kết:** ông đặt chiếc đồng hồ sửa dở xuống bàn, đứng dậy, bước ra cửa tháp. Nối thẳng vào màn kết.
- Hội thoại mở: "Cậu cũng tới sửa à. Ta sửa nó suốt bao năm rồi." Khép: "Ta cứ nghĩ còn nhiều thời gian."

## Pha tháo lắp

Bản thô dùng chung cho mọi cư dân, đã làm ở bước 3c, kể cả phần "Tầng" ở cuối mục (mốc 3c.1; câu "Tháo xong `core`:
hiện xong…" ở trên đã thay bằng `outcome`). Chưa ghép với pha né đạn (đó là bước 4). Mỗi cỗ máy là dữ liệu
trong `src/data/mechanisms/`. Pha này tự dựng `BeatClock` và tiếng tích tắc, cùng cách pha né: beat là hàm của
giờ nghe được.

- Một bộ phận có `id`, id sprite, vị trí (tỉ lệ 0..1 của vùng tháo), vùng chọn, `blockedBy` (phải tháo trước),
  kiểu thao tác, và tùy chọn một câu ký ức. Đúng một bộ phận `core`.
- Con trỏ nhảy theo mũi tên: một lần bấm (`wasPressed`) chọn bộ phận còn lại gần nhất trong nửa mặt phẳng của
  hướng đó. Giữ phím không trượt, vì lớp input không nhận lại phím đang giữ.
- Ba kiểu:
  - `unscrew`: mỗi lần bấm confirm trong cửa sổ nhịp thì một nấc, đủ `unscrewSteps` nấc thì rời.
  - `lift`: giữ confirm đủ `liftBeats` beat nghe được. Nhả sớm thì đếm lại từ đầu.
  - `unhook`: một lần bấm trong cửa sổ.
- Cửa sổ là `beatWindow` (nửa bề rộng, theo beat): khoảng cách từ beat nghe được (`beatAtTime`) tới beat nguyên
  gần nhất. Không đếm tick, không dùng beat kịch bản. Hệ số nhịp dưới 1 chỉ làm mỗi beat dài hơn.
- Bấm lệch nhịp phát tiếng `clack` và không tiến. Không trừ máu, không phạt gì khác.
- `rhythmic: false` tắt cửa sổ của `unscrew` và `unhook` (cư dân 1, chậm và êm). `lift` vẫn phải giữ đủ số beat,
  vì đó là thao tác nhấc, không phải cửa sổ nhịp.
- Chọn bộ phận đang bị chặn: mọi bộ phận chặn còn lắp sáng trong `blockFlashBeats` beat. Không tiếng cạch, không phạt.
- Tháo xong bộ phận có câu ký ức: hiện câu đó, chạy với `memoryCharsPerSecond`. Confirm lúc chữ chưa hiện hết thì
  hiện nốt; confirm lúc đã hiện hết thì đóng. Lần bấm vừa tháo xong không đóng câu.
- Tháo xong tầng (bộ phận cuối của tầng, kèm đóng câu ký ức của nó nếu có): `outcome` là `done`. Không còn chữ "xong"
  và không tự chơi lại. Tháo xong `core` là tháo xong tầng cuối.
- Tiếng `unscrew`, `lift`, `unhook`, `clack` là tổng hợp procedural, phát qua `playCue` theo tên, cùng gain với
  tiếng tích tắc.
- Hình là sprite placeholder theo id. Cỗ máy thử `CLOCKWORK`: 4 ốc (`unscrew`) → mặt đồng hồ (`lift`) → tấm che
  (`lift`) → 2 bánh răng (`unhook`) → lò xo (`lift`) → bánh lắc (`unhook`, `core`). Ba câu ký ức tạm. Cỗ máy thử
  để `rhythmic: true` để nghe cửa sổ; cư dân 1 sẽ đặt `false`.
- `main.ts` chọn pha chơi thử bằng `PLAYTEST_PHASE` (`"dodge"` hoặc `"disassemble"`), cùng kiểu với
  `PLAYTEST_PATTERN`. Hai pha không gọi nhau.
- Kiểm lúc tạo máy: id trong `blockedBy` có thật, không trùng id, không có vòng, đúng một `core`, và có thứ tự
  tháo tới được `core`.
- Con số cảm giác ở `src/data/disassembly-feel.ts`, vùng tháo ở `DISASSEMBLY_LAYOUT`, pixel logic 640×360.

### Tầng (chốt 2026-11-24, làm ở mốc 3c.1)

- `Part.stage?: number` (số nguyên ≥ 1, mặc định 1). Một trận có 3 tầng; tầng cuối chứa `core`.
- Một `Workbench` sống suốt trận (do `BattleScene` giữ); `removed` giữ qua các tầng. `Workbench.setStage(n)` mở tầng n.
  Bộ phận có `stage` > tầng hiện tại vẫn được vẽ (chúng vẫn nằm trong máy) nhưng con trỏ bỏ qua, không chọn được.
- `Workbench.stageComplete`: mọi bộ phận có `stage` ≤ tầng hiện tại đã tháo và không còn câu ký ức đang mở.
- `DisassemblePhase` nhận `(input, audio, mechanism, bench, stage)` và có `outcome`: `"playing" | "done"`. Tầng xong
  (đã đóng câu ký ức cuối) thì `done`; không còn chữ "xong" và không tự chơi lại. Con trỏ đầu tầng đặt vào bộ phận
  chọn được gần góc trên trái nhất.
- Kiểm lúc tạo máy (thêm vào `validateMechanism`): `blockedBy` chỉ trỏ tới bộ phận cùng tầng hoặc tầng trước; mỗi tầng
  từ 1 tới tầng lớn nhất có ít nhất một bộ phận; `core` ở tầng lớn nhất; mỗi tầng tháo hết được chỉ với bộ phận của
  các tầng ≤ nó.
- Mỗi tầng 3–4 bộ phận, mỗi tầng ít nhất một câu ký ức (thường ở bộ phận tháo cuối của tầng). Bốn câu một trận:
  tầng 1 một câu, tầng 2 một câu, tầng 3 hai câu (một câu trước core, một câu ở core).
- Gợi ý phím ở đáy pha tháo: "Mũi tên chọn · Z thao tác" chỉ hiện ở tầng 1 của cư dân 1.
- Cỗ máy thử `CLOCKWORK` được chia tầng: tầng 1 bốn ốc; tầng 2 mặt và tấm che; tầng 3 hai bánh răng, lò xo, bánh lắc.

## Thông điệp và nguyên tắc kể chuyện

Thông điệp: biết quý trọng thời gian, và quan trọng nhất là **VẪN CHƯA MUỘN để bắt đầu lại**. Sống có ý nghĩa,
dành thời gian cho gia đình và ngắm nhìn thế giới, đừng phí thời gian vào điều tiêu cực người khác gây ra.

- **Kết thúc mở.** Game KHÔNG nói nhân vật có sửa được lỗi lầm hay đạt được ước mơ hay không. Họ chỉ nhận ra
  và muốn thay đổi, và đó là đủ.
- **Cơ chế mang thông điệp, lời thoại chỉ gợi nhẹ.** Không giảng đạo lý. Nếu một ý có thể truyền bằng cơ chế
  thì không viết nó thành câu thoại.
- **Màn kết hiện tổng thời gian người chơi đã bỏ ra**, kèm một câu rất ngắn.

## Thị trấn

*(Chốt 2026-11-24. Làm ở bước 5.)*

- **Góc nhìn từ trên xuống**, như Undertale. Lưới ô 32 px logic. Bản đồ **64 × 11 ô** (2048 × 352 px). Camera chỉ trôi
  ngang theo người chơi, kẹp trong bản đồ; chiều dọc vừa màn (lệch xuống 4 px).
- **Dữ liệu** (`src/data/town.ts`, kiểu `TownMap`): `rows` là 11 chuỗi dài 64 ký tự; `legend` ký tự → `{ solid, color,
  sprite? }`; `spawns`, `npcs`, `spots`, `signs`, `gates` theo toạ độ ô. Ký tự đề xuất: `#` tường/mái (cứng), `D` cửa
  (cứng, vẽ khác), `.` đường, `,` vỉa hè, `=` cầu, `~` kênh (cứng), `T` cây (cứng), `b` ghế đá (cứng), `S` bậc thang.
  Hàng 0–2 là dãy nhà và cửa; hàng 3–7 là phố đi được; hàng 8–10 là vỉa hè, cây, kênh nhánh.
- **Bố cục tây → đông** (x là cột ô):
  - x 1–7: **tiệm đồng hồ** của người chơi. Điểm xuất phát (4, 5). Tờ giấy trên bàn ở (3, 3).
  - x 12–16: nhà bác Hòa (`r1`) ở (14, 4), trước cửa cơ quan. Cổng (x 16, y 3–7).
  - x 19–26: **kênh và cây cầu**. Chỗ ngắm cảnh 1 "lan can cầu" ở (23, 3). Chú Minh (`r2`) ở đầu cầu phía đông (27, 5).
    Cổng (x 28).
  - x 31–42: **quảng trường**, bảng tin dán kín giấy. Chị Vân (`r3`) ngồi ghế đá ở (38, 6). Chỗ ngắm cảnh 2 "ghế dưới gốc
    cây" ở (34, 8). Cổng (x 42).
  - x 45–51: nhà Linh (`r4`), cửa sổ có bàn học, Linh ở (48, 3). Cổng (x 51).
  - x 54–63: **bậc thang lên tháp đồng hồ**. Chỗ ngắm cảnh 3 "đầu dốc nhìn mái nhà" ở (56, 2). Cửa tháp (61, 2) là
    điểm gặp boss.
- **Thứ tự gặp cư dân cố định 1 → 2 → 3 → 4 → boss.** Mỗi cư dân chưa giải thoát kèm một **cổng**: một cột ô cứng cắt
  ngang phố, vẽ thành dải "khoảnh khắc đông cứng" (xám, lấp lánh chậm theo nhịp 40 BPM). Giải thoát xong cổng biến
  mất. Lý do: độ khó tăng dần (cư dân 1 dạy pha tháo với `rhythmic: false`), và mỗi cơ chế được giới thiệu riêng.
- **Đi lại:** `TOWN_FEEL.walkSpeed` 140 px/giây, không gia tốc, chuẩn hóa hướng chéo, Shift đi chậm 70 px/giây. Hitbox
  chân 20 × 12 px. Sprite người thợ 16 × 24 px dữ liệu × `scale` 2, có hướng nhìn (4 hướng, placeholder).
- **Tương tác:** Z khi đối tượng tương tác (cư dân, biển, tờ giấy, chỗ ngắm cảnh, cửa tháp) nằm trong
  `TOWN_FEEL.interactRange` (28 px) theo hướng đang nhìn. Đối tượng gần nhất thắng.
- **Cư dân chưa giải thoát:** vẽ bằng bảng màu xám, đứng yên tuyệt đối. Z → hội thoại mở → mờ → trận.
  **Đã giải thoát:** có màu, đứng ở chỗ cũ với tư thế của cảnh kết; Z → một câu (`idle`): r1 "Chuông vẫn đang đổ.",
  r2 "Ngoài này rộng thật.", r3 "Hừm... hừm...", r4 "Đang vẽ, đừng nhìn."
- **Chỗ ngắm cảnh:** Z → người thợ ngồi xuống; khung cảnh (`Backdrop`, cùng kiểu với cảnh nền của cư dân 2) hiện toàn
  màn sau 1 giây mờ, camera đứng yên. Không chữ, không bộ đếm, không phần thưởng, không bắt buộc. Bấm bất kỳ phím di
  chuyển nào thì đứng dậy. Đó là khoảng lặng, không phải đoạn đệm.
- **Thị trấn đổi dần khi cư dân được giải thoát** (mỗi người một lớp, dữ liệu `TOWN_AMBIENCE`):
  r1 → cửa sổ các nhà sáng đèn vàng ấm; r2 → dải trời có màu; r3 → tiếng chim procedural thỉnh thoảng (6–12 giây một
  lần); r4 → tranh người chơi vẽ treo trên tường nhà Linh (từ `SaveData.drawing`).
- **Boss:** sau khi `r4` được giải thoát, cổng x 51 mở, đi lên bậc thang tới cửa tháp, Z → hội thoại mở của boss → trận.

## Hội thoại

*(Chốt 2026-11-24. Làm ở mốc 4.2.)*

- **Dữ liệu** (`src/data/dialogues.ts`):

  ```ts
  export type SpeakerId = "narrator" | "note" | "r1" | "r2" | "r3" | "r4" | "boss";
  export interface DialogueLine { speaker: SpeakerId; text: string }
  export const SPEAKERS: Record<SpeakerId, { name: string; blipHz: number }> = { … };
  export const DIALOGUES = { introOpening: [...], shopNote: [...], r1Open: [...], r1Close: [...], r1Idle: [...], … }
    satisfies Record<string, readonly DialogueLine[]>;
  export type DialogueId = keyof typeof DIALOGUES;
  ```

  `narrator` và `note` không hiện tên. Tên hiện: "Bác Hòa", "Chú Minh", "Chị Vân", "Linh", "Ông Khải". Người thợ (người
  chơi) không bao giờ nói.
- **Hộp thoại** (`scenes/dialogue-box.ts`, dùng chung cho thị trấn, trận và màn mở đầu): khung đen viền trắng 4 px,
  x 16, y 252, rộng 608, cao 92. Tên người nói ở trên mép trái hộp, màu `#d8c9a3`. Đệm 12 px, chữ cỡ 20, cao dòng 22,
  tối đa 3 dòng, ngắt
  dòng theo từ bằng `Renderer.measureText` (thêm vào renderer). Lời dẫn của màn mở đầu dùng kiểu `narration`: không
  khung, căn giữa màn.
- **Hiện chữ:** chạy từng ký tự, `DIALOGUE_FEEL.charsPerSecond` 30; dừng thêm `commaPause` 0,12 giây sau dấu phẩy và
  `stopPause` 0,3 giây sau `. ? ! …`. Tiếng `blip` (procedural, cao độ `blipHz` của người nói) mỗi 2 ký tự hiện ra.
  Hết dòng thì tam giác nhỏ ở góc phải dưới nhấp nháy.
- **Điều khiển:** Z khi chữ đang chạy → hiện hết dòng; Z khi đã hết → dòng sau; Z ở dòng cuối → đóng.
  **Giữ X = tua nhanh:** chữ chạy nhanh gấp `DIALOGUE_FEEL.fastMultiplier` (8) và tự sang dòng sau
  `fastHoldSeconds` (0,15 giây) khi hiện hết. Không có nút bỏ qua cả đoạn.
- **Kiểm dữ liệu (test):** mọi dòng không rỗng, ≤ `DIALOGUE_FEEL.maxChars` (110) ký tự, người nói có trong `SPEAKERS`;
  mọi `DialogueId` mà `RESIDENTS` tham chiếu đều có.

## Dữ liệu cư dân

- `src/data/residents/types.ts`:

  ```ts
  export type ResidentId = "r1" | "r2" | "r3" | "r4" | "boss";
  export interface ResidentData {
    id: ResidentId;
    name: string;
    rounds: readonly [Pattern, Pattern, Pattern];    // pha né của lượt 1, 2, 3
    mechanism: Mechanism;                            // 3 tầng, core ở tầng 3
    dialogue: { open: DialogueId; close: DialogueId; idle: DialogueId };
    vignette: "phone" | "lookUp" | "hum" | "pencil" | "leave";   // cảnh kết ở thị trấn
    town: { tile: { x: number; y: number }; gateX: number | null; sprite: string; freedSprite: string };
  }
  ```

- `src/data/residents/index.ts` xuất `RESIDENTS` theo thứ tự gặp. Thêm cư dân = thêm file dữ liệu, không sửa engine.
- `BattleScene` (`scenes/battle-scene.ts`) nhận một `ResidentData`, tự chạy 3 lượt, hội thoại khép trận, rồi báo
  `finished`. Nó giữ `Workbench`, `PageState` (nếu lượt có `pencil`), `loopsSeen` (nếu `finish.kind` là `exit`).

## Lưu tiến trình

*(Chốt 2026-11-24. Làm ở mốc 5.2.)*

- **Khóa localStorage:** `still-hours/save/v1` (tiến trình) và `still-hours/settings/v1` (`{ muted: boolean }`).
- **Dữ liệu:**

  ```ts
  interface SaveData {
    version: 1;
    seenIntro: boolean;
    freed: ResidentId[];        // theo thứ tự đã giải thoát
    playSeconds: number;        // tổng thời gian chơi
    drawing: number[] | null;   // tranh của r4: x, y xen kẽ, số nguyên trong khung 400×160; cặp -1, -1 = nhấc bút
    finished: boolean;          // đã qua boss, đang ở màn kết
  }
  ```

- **Khi nào lưu:** xong cảnh mở đầu (`seenIntro`); xong cảnh kết của mỗi cư dân (`freed`, `playSeconds`, `drawing`);
  xong trận boss (`finished: true`); và khi `pagehide` hoặc `visibilitychange` sang ẩn (chỉ cập nhật `playSeconds`, và
  chỉ khi đã có bản lưu). Giữa trận không lưu: thoát giữa trận thì lần sau vào lại từ thị trấn, trước cư dân đó.
- **Khi nào tải:** ở `TitleScene`, ngay sau khi âm thanh mở khóa. JSON hỏng, sai `version` hay sai kiểu → coi như không
  có bản lưu (không xóa, không crash). `localStorage` ném lỗi (chế độ riêng tư) → chơi không lưu, không báo lỗi.
- **Tiếp tục:** `finished` → vào thẳng màn kết. Ngược lại vào thị trấn: đứng một ô bên phải chỗ của cư dân vừa giải
  thoát gần nhất (hoặc ở tiệm nếu chưa ai).
- **Xóa:** khi chọn "Bắt đầu lại" và xác nhận; khi màn kết chạy xong.
- **Tranh của r4:** giản lược bằng Ramer–Douglas–Peucker, sai số `SAVE_FEEL.drawingEpsilon` (1,5 px), tối đa
  `SAVE_FEEL.drawingMaxNumbers` (3000) số; quá thì tăng sai số gấp đôi tới khi vừa.
- **Code:** `core/save.ts`, hàm thuần `parseSave(text)`, `serializeSave(data)`, và `SaveStore` nhận một đối tượng kiểu
  `Storage` (test truyền bộ nhớ giả). Phiên debug (nhảy cóc) không bao giờ ghi.

## Phím debug và nhảy cóc

*(Chốt 2026-11-24. Làm ở mốc 5.6.)*

- **F1** bật/tắt lớp debug cho mọi cảnh (cờ chung ở `Director`, không còn mỗi cảnh một cờ).
- **Khi lớp debug đang bật**, phím số nhảy cóc (bảng `DEBUG_JUMP_KEYS` trong `data/keybindings.ts`, xử lý ở
  `core/debug-jump.ts`, không đi qua `Input` vì không phải logic game): `1`–`4` vào trận cư dân 1–4 từ lượt 1, `5` vào
  trận boss, `6` thị trấn ở tiệm, `7` màn kết, `0` màn bắt đầu.
- **URL:** `?jump=` với `r1`…`r4` / `boss` (vào trận), `r4.2` (lượt 2, pha né), `r4.2d` (lượt 2, pha tháo), `town`,
  `town.r3` (thị trấn, cư dân trước r3 đã giải thoát, đứng trước r3), `intro`, `ending`. Giá trị lạ → bỏ qua, chạy bình
  thường. Hàm thuần `parseJump(search)` có test.
- Nhảy cóc coi mọi cư dân đứng trước đích là đã giải thoát, bật `debugSession`: không đọc ghi localStorage, góc phải trên
  hiện "DEBUG · không lưu".
- `PLAYTEST_PATTERN` và `PLAYTEST_PHASE` trong `main.ts` bị xóa khi có `?jump=` (mốc 5.6).

## Hình ảnh và âm thanh

- **Hình ảnh**: giai đoạn đầu dùng placeholder vẽ bằng code (hình khối, sprite pixel định nghĩa bằng mảng dữ
  liệu). Game chỉ tham chiếu sprite qua `id` (xem `src/core/sprites.ts`, `Renderer.sprite()`), nên khi có ảnh PNG
  chỉ cần đổi `definePixels(id, ...)` thành `loadImage(id, url)`, code vẽ không đổi. PNG đặt trong `public/assets/`.
  Placeholder hiện có `scale: 2` (mỗi pixel dữ liệu = khối 2×2). PNG vẽ sẵn ở 640×360 thì để `scale` mặc định 1.
- **Âm thanh**: tạo bằng WebAudio theo kiểu procedural: tiếng tích tắc, tiếng bánh răng, hiệu ứng khi tháo lắp,
  nhạc nền đơn giản. Module `src/audio/` phải thiết kế để sau này thêm được file nhạc thật (phát qua cùng một
  giao diện theo tên âm thanh, nguồn có thể là bộ tổng hợp hoặc file). Nhớ: trình duyệt chỉ cho phát âm thanh sau
  một thao tác của người dùng.
- **Nhạc nền (chốt 2026-11-24):** pha né và pha tháo không có nhạc giai điệu; tiếng tích tắc chính là nhạc. Thị trấn có
  một lớp nền procedural rất nhỏ: gió (nhiễu lọc thấp) và một tiếng tích xa ở 40 BPM. Màn bắt đầu: một tiếng tích mỗi
  giây. Màn kết: các lớp tích tắc chồng dần. Cue mới (đều procedural, phát qua `playCue`): `blip`, `mend`, `pencilUp`,
  `pencilDrop`, `drawTick`, `ring`, `hum`, `bird`, `chime`. Chưa dùng file âm thanh thật.
- **Độ trễ loa (chốt):** không làm màn hiệu chỉnh; giữ `visualDelaySeconds`. Ghi vào PLAYTEST.md để chủ dự án chỉnh.
- **Font (chốt 2026-11-24): VT323** của Peter Hull, giấy phép **SIL Open Font License 1.1**. Metadata Google Fonts
  (`ofl/vt323/METADATA.pb`) ghi `license: "OFL"`, subsets `latin`, `latin-ext`, `vietnamese`.
  - Nguồn tải: `https://github.com/google/fonts/raw/main/ofl/vt323/VT323-Regular.ttf`, giấy phép
    `https://github.com/google/fonts/raw/main/ofl/vt323/OFL.txt`, gốc `https://github.com/phoikoi/VT323`.
  - Tự host: `public/assets/fonts/VT323-Regular.ttf` và `public/assets/fonts/OFL.txt` (kèm theo bắt buộc của OFL).
    `@font-face` trong `style.css` (`font-display: block`); `FONT_FAMILY = '"VT323", monospace'`; `main.ts` chờ
    `document.fonts.load('20px "VT323"')` (tối đa 3 giây, quá thì chạy với font dự phòng) trước khi vẽ chữ đầu tiên.
    Ghi vào `CREDITS.md`.
  - Kiểm: script tạm (ngoài `src/`, không commit) đọc bảng `cmap` của file TTF và xác nhận có đủ mọi ký tự xuất hiện
    trong chuỗi hiển thị của `src/data/` và `src/scenes/`, cùng dòng mẫu hoa/thường "ắ ằ ẳ ẵ ặ ế ề ể ễ ệ ố ồ ổ ỗ ộ ớ ờ ở
    ỡ ợ ứ ừ ử ữ ự ỳ ỷ ỹ ỵ đ". Lớp debug hiện dòng mẫu ở cỡ 16, 20, 24, 32.
  - Cỡ chữ: VT323 hẹp và cao nên cỡ nhỏ nhất là **16** (gợi ý phím, debug), chữ hội thoại **20**, tiêu đề 32–48.
    Hộp thoại tính lại số ký tự mỗi dòng theo `measureText`, không đoán.
  - Dự phòng nếu chủ dự án nhìn thấy dấu chồng (ví dụ "ẳ", "ỡ") bị dính hay cắt ở cỡ 20: **GNU Unifont** (OFL 1.1,
    `https://unifoundry.com/unifont/`), cỡ 16. Đổi font chỉ là đổi file và `FONT_FAMILY`.
- **Asset bên ngoài**: nếu dùng (font, nhạc, ảnh...), ghi nguồn và giấy phép vào `CREDITS.md` (tạo file khi có
  asset đầu tiên). Không đưa vào asset không rõ giấy phép.

## Stack

- **Vite + TypeScript (strict) + Canvas 2D thuần.** Không dùng game engine.
- **Package manager: npm.**
- **Deploy: Cloudflare Workers + Workers Static Assets** (chỉ phục vụ file tĩnh, chưa có backend).
  - Cấu hình ở `wrangler.jsonc`: `name: "still-hours"`, `assets.directory: "./dist"`, không có `main`.
  - **Không dùng `@cloudflare/vite-plugin`**: theo tài liệu Cloudflare, plugin đó dành cho dự án có Worker script.
    Game hiện chỉ là file tĩnh nên trỏ thẳng `assets.directory` vào `dist` là đủ và nhẹ nhất. Nếu sau này thêm
    backend (Worker), mới cân nhắc chuyển sang plugin.
  - `compatibility_date` đặt theo ngày dựng dự án (2026-11-21). Chỉ đổi khi chủ động nâng cấp runtime.
  - `public/.assetsignore` loại `.gitkeep` khỏi những gì được deploy. Giữ file này.
- **Trợ lý AI không chạy deploy:** cả `npm run deploy` lẫn `wrangler deploy`. Chủ dự án tự đăng nhập
  (`npx wrangler login`) và deploy.

## Lệnh

| Lệnh               | Việc                                                              |
| ------------------ | ----------------------------------------------------------------- |
| `npm run dev`      | Vite dev server (hot reload)                                      |
| `npm run build`    | Kiểm tra kiểu (`tsc --noEmit`) rồi build ra `dist/`               |
| `npm run preview`  | Xem bản build bằng Vite                                           |
| `npm test`         | Chạy test (Vitest, không cần trình duyệt, ~0,3 giây)               |
| `npm run deploy`   | `npm test`, rồi build, rồi `wrangler deploy` (chủ dự án chạy)    |
| `npx wrangler dev` | Phục vụ `dist/` bằng runtime Workers, giống môi trường production |

## Cấu trúc thư mục

```
src/
  main.ts       điểm vào: khởi tạo renderer, chạy vòng lặp
  style.css     CSS tối thiểu (canvas pixelated, nền đen)
  core/         vòng lặp game, input, renderer, lưu tiến trình
  scenes/       menu, thị trấn, hội thoại, trận đấu, kết quả
  battle/       pha né đạn, pha tháo lắp
  data/         pattern đạn theo beat, hội thoại, bản đồ thị trấn, sprite (dạng DỮ LIỆU)
  audio/        âm thanh procedural bằng WebAudio
  testing/      đồng hồ giả, mô phỏng khung hình giật/treo, pattern fixture cho test (KHÔNG vào bản build)
  **/*.test.ts  test, đặt cạnh file được kiểm
public/
  assets/       ảnh/âm thanh thật khi có (copy nguyên sang dist/)
  .assetsignore loại file không cần deploy (.gitkeep)
wrangler.jsonc  cấu hình Cloudflare Worker (Static Assets)
```

Hiện đã có:

- `core/`: `config.ts` (hằng số), `loop.ts` (fixed timestep), `renderer.ts` (canvas cố định, scale pixel art; đĩa,
  vòng, đường, cắt vùng vẽ), `sprites.ts` (kho sprite theo id), `math.ts` (`Rect`, va chạm hình tròn/đoạn thẳng,
  `clamp`, `lerp`), `input.ts` (lớp trừu tượng hành động), `keyboard.ts` (nguồn input bàn phím),
  `tempo-map.ts` (đổi qua lại beat ↔ giây khi BPM thay đổi), `beat-clock.ts` (đồng hồ nhịp của một trận).
- `audio/`: `audio-engine.ts` (AudioContext: mở khóa, tắt/bật tiếng, **nguồn thời gian chủ**), `tick-scheduler.ts`
  (hẹn trước tiếng tích tắc theo đúng bản đồ tempo), `tick-sound.ts` (tổng hợp tiếng đồng hồ cơ), `cues.ts`
  (tiếng ôm / nhả một câu, tiếng vặn, nhấc, gỡ, cạch).
- `battle/`: `dodge-phase.ts` (pha né đạn: khung, thanh máu, lớp debug, ghép mọi thứ), `player.ts` (bánh răng),
  `pattern-runner.ts` (chạy pattern theo beat, kiểm tra tính công bằng), `spawners.ts` (một handler cho mỗi loại
  đạn), `bullets.ts` (đạn, cảnh báo, va chạm, vẽ), `pool.ts` (pool đối tượng), `pace.ts` (khi nào hạ / hồi hệ số nhịp),
  `sketch.ts` (danh sách đoạn nét chì, tua lại), `page.ts` (trang vẽ: nhặt bút, bút rơi, beat vẽ), `ink-layer.ts` (canvas
  phụ cho nét lúc chơi), `mechanism.ts` (thứ tự tháo, nhịp, con trỏ), `disassemble-phase.ts` (pha tháo lắp).
- `scenes/`: `scene.ts` (giao diện `Scene`), `director.ts`, `title.ts`, `battle-scene.ts`, `dialogue-box.ts`,
  `dialogue-scene.ts`, `vignette.ts`, `town.ts`, `backdrop.ts`, `intro.ts`, `ending.ts`.
- `data/`: `feel.ts` (**cảm giác của người chơi**), `rhythm-feel.ts` (**cảm giác của nhịp, đạn, âm thanh**),
  `battle-layout.ts` (kích thước khung, thanh máu), `keybindings.ts` (phím → hành động), `sprites.ts` (sprite
  placeholder), `pattern-types.ts` (**định dạng pattern đạn**), `words.ts` (câu tạm của đạn chữ),
  `sketch-feel.ts` (**độ dày nét, sáp màu, đung đưa, bút và trang vẽ `DRAW_FEEL`**), `flow-feel.ts` (**chuyển cảnh, dọn đạn,
  màn thua**),
  `patterns/test-pattern.ts` (pattern thử đạn), `patterns/resident-3.ts` (pattern thử lời tiêu cực, ~36 giây),
  `patterns/resident-4.ts` (`R4_ROUNDS`: ba lượt "Nhặt bút", vòng 32 beat, `finish: page`),
  `disassembly-feel.ts` (cửa sổ nhịp, số nấc, số beat giữ, chữ ký ức),
  `mechanisms/clockwork.ts` (bộ máy đồng hồ thử).
- `testing/`: `sim.ts` (đồng hồ âm thanh giả, `simulate` với jitter và lần treo, tích phân Simpson độc lập), `fixtures.ts`
  (pattern fixture + hàm tính giờ độc lập), `bots.ts` (bot thử: đi tới bút, đi vòng chữ nhật, đứng yên). Test: `core/tempo-map.test.ts`, `audio/tick-scheduler.test.ts`,
  `battle/rhythm-sync.test.ts`, `battle/pattern-runner.test.ts`, `battle/pace.test.ts`, `battle/words.test.ts`,
  `battle/sketch.test.ts` (khoảng lấy mẫu, nhấc bút, thứ tự tua lại),
  `battle/page.test.ts` (nhặt bút, bút rơi, kim đồng hồ, trang luôn khép được, `finish: length`),
  `data/patterns/resident-4.test.ts` (ba lượt: hợp lệ, độ dài, chỗ đặt bút, bot vẽ xong),
  `battle/mechanism.test.ts` (thứ tự tháo, cửa sổ nhịp, nhấc, con trỏ, kiểm máy),
  `battle/distraction.test.ts` (không trừ máu, cảnh báo),
  `core/renderer.test.ts` (hệ số phóng).
- Chưa có code: vòng chơi nối thị trấn với trận và lưu `freed` (mốc 5.5), nhảy cóc (5.6), nội dung r1–r3 và boss (bước 6).
- File sẽ thêm theo kế hoạch (AUTOPILOT.md): `battle/stillness.ts`, `scenes/director.ts`,
  `scenes/title.ts`, `scenes/intro.ts`, `scenes/town.ts`, `scenes/battle-scene.ts`, `scenes/dialogue-box.ts`,
  `scenes/ending.ts`, `core/save.ts`, `core/debug-jump.ts`, `data/flow-feel.ts` (`FLOW_FEEL`, `DIALOGUE_FEEL`,
  `TOWN_FEEL`, `STILL_FEEL`, `SAVE_FEEL`), `data/dialogues.ts`, `data/town.ts`, `data/backdrops.ts`,
  `data/residents/*.ts`, `data/mechanisms/{pocket-watch,stopwatch,metronome,alarm-clock,tower-clock}.ts`,
  `data/patterns/resident-{1,2,3,4}.ts` và `boss.ts` (mỗi file xuất 3 lượt).

### Nền tảng kỹ thuật đã chốt

- **Độ phân giải logic cố định 640×360** (`GAME_WIDTH`/`GAME_HEIGHT` trong `src/core/config.ts`). Mọi toạ độ
  trong game theo hệ này. So với 320×180, mọi số pixel (khung 400×160, tốc độ, hitbox, đạn, cỡ chữ, độ dày nét)
  đã nhân đôi để thời gian đi hết khung và độ khó né sát giữ nguyên. Bố cục (tỉ lệ, căn giữa) giữ nguyên.
- **Scale pixel art**: `Renderer.fit()` gọi `pixelArtScale(innerWidth × devicePixelRatio, innerHeight × devicePixelRatio)`:
  bội số nguyên làm tròn xuống khi cửa sổ đủ lớn, thu nhỏ lẻ khi nhỏ hơn 640×360. CSS `image-rendering: pixelated`.
  Hệ số đang dùng hiện ở lớp debug (F1), chữ `phóng`. Bảng dưới là pixel **thiết bị** (tích `innerWidth × dpr`),
  không phải pixel CSS. Màn 1920×1080 để scale Windows 125% (dpr 1,25) ra khoảng 2400×1350 pixel thiết bị, hệ số là 3.
  Thiếu một pixel so với bội tiếp theo thì giữ bội thấp hơn (1919×1079 → 2).

  | Pixel thiết bị của cửa sổ | Hệ số phóng |
  | ------------------------- | ----------- |
  | 1280×720                  | 2           |
  | 1920×1080                 | 3           |
  | 2560×1440                 | 4           |
  | 3840×2160                 | 6           |

- **Fixed timestep 60 Hz** (`TICK_RATE`). `update()` tách khỏi `render(alpha)`. Logic KHÔNG phụ thuộc FPS
  hay `Date.now()`: chuyển động của người chơi đi theo số tick. **Ngoại lệ có chủ đích: nhịp của trận.** Trong pha né
  đạn, "bây giờ là lúc nào" do **đồng hồ nhịp (BeatClock) lấy từ đồng hồ âm thanh** quyết định, không đếm theo tick.
  Lý do và cách làm: xem mục "Nhịp, tích tắc và đạn".
- Không dùng `{ alpha: false }` cho canvas context: nó bật antialiasing chữ LCD, gây viền màu trên pixel art.
- **Input qua hành động, không qua phím.** Logic game chỉ dùng `Input.isDown(action)`, `wasPressed(action)` và
  `input.move`. Hành động: `up/down/left/right/confirm/cancel/slow/debug/mute`. Phím gán ở `data/keybindings.ts` (theo
  `KeyboardEvent.code`). Thêm cảm ứng/tay cầm = viết thêm một nguồn gọi `input.setActionState(...)` (như
  `keyboard.ts`), không sửa logic game. `Input.poll()` được gọi một lần ở đầu mỗi tick.
- **Di chuyển bánh răng**: vận tốc tức thời, không gia tốc (không trượt). Chuẩn hóa hướng nên đi chéo không nhanh
  hơn đi thẳng. Giữ `slow` (Shift) để đi chậm. Vị trí là số thực; vẽ thì nội suy theo `alpha` rồi làm tròn về lưới
  pixel (`Renderer.rect`/`sprite` tự làm tròn).
- **Hitbox nhỏ hơn hình vẽ** (`hitboxSize` 10 so với sprite 18px, dữ liệu 9px × `scale` 2) để người chơi thấy mình né sát mà không trúng. Va chạm
  dùng AABB (`overlaps`); chỉ chạm mép thì không tính là trúng.
- **Cảm giác nằm ở `data/feel.ts`** (tốc độ, tốc độ khi giữ Shift, hitbox, thời gian bất tử, nhấp nháy, máu tối đa).
  Đơn vị: px/giây và giây; code tự quy ra tick. Không rải số "cảm giác" vào code.
- **Lớp debug bật/tắt bằng F1** (vẫn có trong bản deploy): hiện hitbox bánh răng (xanh lá), khung hình vẽ (xám),
  vùng va chạm của đạn, kim và chữ (hồng), toạ độ, số tick, **beat hiện tại, BPM hiệu dụng, hệ số nhịp, vòng
  pattern, số đạn và cảnh báo đang hoạt động** (và số lần phải bỏ đạn vì pool đầy: nên luôn là 0), **số đoạn nét chì**
  (`nét`, kể cả đoạn đã tẩy), **hệ số phóng**
  (`phóng`), và một dòng mẫu dấu tiếng Việt ở cỡ 8, 12, 16, 20 (đổi thành 16, 20, 24, 32 khi có VT323, mốc 7.1).
  Phím nhảy cóc khi lớp debug bật: mục "Phím debug và nhảy cóc".
- Windows có "Sticky Keys" bật lên khi bấm Shift 5 lần liên tiếp, có thể làm gián đoạn lúc chơi; đây là cài đặt của
  hệ điều hành, game không chặn được. Chốt: không thêm phím phụ; ghi vào PLAYTEST.md.

## Nhịp, tích tắc và đạn

### Vì sao đồng hồ âm thanh là "chủ" (đồng bộ nhịp ↔ âm thanh)

Có hai đồng hồ chạy lệch nhau: vòng lặp game đi theo khung hình (`requestAnimationFrame`), còn tiếng tích tắc đi theo
đồng hồ phần cứng của thiết bị âm thanh. Chúng có tốc độ hơi khác nhau, và vòng lặp game còn **bỏ mất** thời gian mỗi
khi khựng (`MAX_FRAME_MS` = 250 ms). Nếu đạn đếm beat theo tick, hoặc tiếng được phát "khi vòng lặp chạy tới", thì
sau vài phút đạn và tiếng lệch nhau, và mỗi lần giật khung hình lệch vĩnh viễn. Vì vậy:

1. **Nguồn thời gian chủ là AudioContext.** `AudioEngine.heardTime()` = `currentTime` − độ trễ đầu ra
   (`outputLatency`) − `visualDelaySeconds`, đơn điệu tăng. Đó là thời điểm âm thanh **đang được nghe thấy**.
2. **`BeatClock`**: `time = heardTime − origin`, `beat = tempo.beatAtTime(time)`. Beat là HÀM của thời gian, không
   cộng dồn nên không có sai số tích lũy. `update()` gọi một lần đầu mỗi tick; cả tick dùng cùng một giá trị.
3. **`TickScheduler`** mỗi tick hẹn trước 0,2 giây: beat `n` phát đúng lúc `origin + tempo.timeAtBeat(n)` bằng
   `source.start(time)`. WebAudio phát chính xác tới từng mẫu, không chịu jitter của khung hình. Beat đã trễ hơn
   30 ms (tab bị treo) thì **bỏ qua** thay vì phát muộn, để nhịp không bị "dồn cục".
4. **Pattern chạy theo beat**: đạn sinh khi `beat ≥ event.beat`, cảnh báo khi `beat ≥ warnBeat`. Vị trí đạn là hàm
   giải tích `origin + v · (time − fireTime)`, góc kim là `angle0 + ω · (beat − fireBeat)`: đạn sinh trễ vài ms vẫn
   nằm đúng chỗ như đã sinh từ đúng beat. Tiếng và đạn cùng đọc MỘT bản đồ tempo nên không thể lệch dần.
5. **Trừ độ trễ đầu ra** để đạn xuất hiện đúng lúc người chơi NGHE tiếng "tích" (không phải lúc máy tính gửi tiếng).
   Máy nào lệch (loa Bluetooth trễ nhiều): chỉnh `visualDelaySeconds` trong `data/rhythm-feel.ts`.

Tab bị ẩn thì `AudioContext.suspend()` nên đồng hồ dừng, trận tạm dừng, hiện lại thì chạy tiếp (không "trôi" qua lúc
vắng mặt). Trình duyệt chặn âm thanh tới khi người dùng tương tác: `AudioEngine` lắng nghe `keydown/pointerdown/
touchend` và tạo/resume AudioContext NGAY trong sự kiện đó (Safari đòi vậy); `PressStartScene` chờ `audio.ready`.

**Đã kiểm chứng bằng test trong repo** (`npm test`): `battle/rhythm-sync.test.ts` chạy `DodgePhase` THẬT 180 giây trên đồng hồ
âm thanh giả có jitter khung hình và một lần treo 1 giây. Kiểm: mọi tiếng nằm đúng lưới beat so với tích phân số độc lập
(lệch dưới 1 µs, không lệch dần), tích/tắc xen kẽ, không beat nào phát đôi, khi treo chỉ bỏ đúng beat rơi vào lúc treo,
đạn luôn xuất hiện sau lúc NGHE thấy tiếng của beat đó không quá một khung hình, kể cả sau lúc treo, và độ trễ đầu/cuối
trận như nhau. `audio/tick-scheduler.test.ts` kiểm riêng bộ lên lịch (đổi tempo giữa trận không phát đôi, không thủng
beat). Ngoài repo: trong Edge headless (thiết bị âm thanh giả) 66 tiếng hẹn trên AudioContext thật lệch 0,0 µs so với
lưới beat. **Chưa thử trên loa/tai nghe thật**, nên độ trễ đầu ra thực tế (đặc biệt Bluetooth) chỉ chỉnh được bằng
`visualDelaySeconds`.

**Cách đo độ lệch trong test (quan trọng khi sửa):** đo độ trễ đạn bằng ĐỒNG HỒ ÂM THANH (`ctxTime` − giờ hẹn tiếng − độ
trễ đầu ra), KHÔNG đo bằng `clock.time`. Đồng hồ nhịp tự nhất quán với chính nó nên một đồng hồ bị drift vẫn trông "đúng".
Lần treo trong test được đặt ngay trước một cụm đạn dày; đặt vào đoạn không có đạn thì test không bắt được lỗi bắt kịp chậm.

### Bản đồ tempo (`core/tempo-map.ts`)

BPM mô tả theo đoạn: đứng yên, hoặc đổi tuyến tính THEO BEAT từ BPM đầu đến BPM cuối (tăng/giảm dần). Khi đó
đổi beat ↔ giây bằng công thức đóng (log/exp), không tích phân số. `change(atBeat, bpm, overBeats)` đổi tempo từ
`atBeat` (tức thì nếu `overBeats` = 0). Mỗi lần đổi, `version` tăng và `TickScheduler` tự hủy các tiếng đã hẹn mà
chưa phát, rồi hẹn lại theo tempo mới (đã kiểm: đổi 120 → 60 BPM giữa trận không phát đôi).

- Tempo kịch bản nằm trong pattern (sự kiện `tempo`). Hết mỗi vòng, BPM trở về `pattern.bpm`. `change` không đụng hệ số nhịp.
- **Hệ số nhịp** (`setPace(atBeat, factor)`): lớp riêng, dùng chung, không gắn một cư dân. Nhân lên BPM kịch bản.
  Cư dân 3 hạ/hồi qua `battle/pace.ts`; cư dân 2 (đứng yên thì đạn chậm) sẽ gọi cùng `setPace` ở bước 6.
  - Hệ số **hằng theo đoạn**, luôn trong (0, 1]. Nhân với đoạn BPM tuyến tính vẫn ra đoạn tuyến tính, nên công thức
    đóng giữ nguyên. Ramp tuyến tính của hệ số ra bậc hai, không dùng. `setPace` với hệ số ngoài (0, 1] thì ném lỗi.
  - `timeAtBeat` / `bpmAtBeat` là thời gian và BPM **nghe được** (đã nhân hệ số). `scriptTimeAtBeat` là tempo kịch bản
    (hệ số 1). Tiếng và đạn cùng đọc bản đồ nghe được. `version` tăng khi hệ số đổi; `TickScheduler` hẹn lại.
  - Không đổi gì thì không tăng `version`.
- **Cảnh báo khi nhịp đổi:** `PatternRunner` chỉ lưu beat, giờ nghe được tính lúc cảnh báo và lúc bắn. Độ dài cảnh báo
  đo trên tempo kịch bản, nên khi hệ số hồi về 1 cảnh báo không ngắn hơn `telegraphMinSeconds`. Hệ số dưới 1 chỉ làm
  cảnh báo dài thêm. Cảnh báo hết theo beat bắn, không theo giây đã đóng băng.
- **Chính sách cư dân 3** (`Pace`): ôm một câu thì hạ `PACE_FEEL.drop` từ beat nguyên kế tiếp; câu đi hết khung không
  chạm thì hồi `PACE_FEEL.recover` ở đầu nhịp kế (`beatsPerBar`). Cùng một beat: hạ trước, rồi hồi, một lần `setPace`.
  Hệ số kẹp trong [`floor`, 1]. Code hiện để sàn 0,8 (1 / 0,8 = 1,25); đã chốt đổi thành 0,7 ở mốc 6.3
  (mục cư dân 3).

### Định dạng pattern (`data/pattern-types.ts`)

Một pattern là danh sách sự kiện theo beat. **Thêm pattern mới = thêm file dữ liệu trong `data/patterns/`**
(xuất một `Pattern`), rồi truyền vào `new DodgePhase(input, audio, bodySize, pattern)`; không sửa code engine.
`DodgePhase` mặc định dùng `TEST_PATTERN`. `main.ts` đang truyền `PLAYTEST_PATTERN` (đổi một dòng để chơi pattern kia).
Pattern của cô bé (`resident-4.ts`, `R4_ROUNDS`) là kiểu `finish: page` có `pencil`: bút nằm yên, bánh răng cầm bút
thì mọi bước đi để lại nét. Trang xong thì khung và đạn mờ đi, nét của lượt này được tua lại bằng sáp trong
`SKETCH_FEEL.replaySeconds`, rồi giữ tranh `SKETCH_FEEL.revealSeconds`; sau đó `outcome` là `won`. Pha `length` xong thì
`outcome` là `won` ngay, đạn còn lại mờ đi trong `FLOW_FEEL.clearSeconds`. Hết máu thì `outcome` là `lost` và pha đóng băng.
Pattern không khai `finish`: `loop: false` coi như `length`, `loop: true` chạy mãi (pattern thử, test đồng bộ nhịp).

**Trường pattern** (`finish` kiểu `length` và `page`, `pencil`, `idleLines` đã làm; các trường khác ở mốc ghi kèm):

| Trường | Kiểu | Việc | Mốc |
| ------ | ---- | ---- | --- |
| `finish` | `{ kind: "length" }` \| `{ kind: "page"; drawBeats: number }` \| `{ kind: "exit"; side: Side; at: number; openBeat: number; widths: readonly number[]; openBeats: readonly number[] }` | Pha né kết thúc thế nào (mục "Cấu trúc một trận"). Bỏ trống: `loop: false` là `length`, `loop: true` chạy mãi. `length` cần `loop: false`; `page` và `exit` cần `loop: true` | xong (`length`, `page`); 6.4 (`exit`) |
| `pencil` | `{ x: number; y: number }` | Chỗ bút nằm đầu lượt (cư dân 4). Bắt buộc khi `finish.kind` là `page`, cấm khi khác | xong |
| `idleLines` | `readonly string[]` | Câu tự nhủ khi một vòng trọn vẹn trôi qua mà chưa cầm bút (chỉ pattern có `pencil`) | xong |
| `still` | `{ backdrop: string }` | Đứng yên thì chậm nhịp và hiện cảnh nền (cư dân 2, boss lượt 2). Cấm đi cùng đạn `word` | 6.2 |
| `lagClock` | `boolean` | Mặt đồng hồ trễ (cư dân 3, boss lượt 3) | 6.3 |

`validatePattern` kiểm các ràng buộc trong bảng. Đạn `distraction`: không tẩy nét; chỉ có tác dụng (làm rơi bút) khi
pattern có `pencil` và bánh răng đang cầm bút.

```ts
export const MY_PATTERN: Pattern = {
  name: "…", bpm: 100, lengthBeats: 60, loop: true,
  events: [
    { beat: 4, type: "straight", from: "right", at: 0.5 },                         // đạn từ mép phải, giữa cạnh
    { beat: 8, type: "aimed", from: "top", at: 0.5, count: 3, spreadDeg: 18 },       // 3 viên nhắm vào người chơi
    { beat: 18, type: "burst", x: 0.5, y: 0.5, count: 12 },                          // vòng tròn 12 viên từ giữa
    { beat: 20, type: "sweep", x: 0.5, y: 0.5, length: 80, startAngleDeg: -90,
      degreesPerBeat: 45, durationBeats: 8 },                                         // kim đồng hồ quay quanh tâm
    { beat: 22, type: "word", from: "left", at: 0.4, phrase: 0 },                     // câu số 0 trong NEGATIVE_PHRASES
    { beat: 23, type: "distraction", from: "right", at: 0.6 },                        // đạn xao nhãng, không trừ máu
    { beat: 24, type: "tempo", bpm: 160, overBeats: 16 },                             // tăng dần lên 160 BPM
  ],
};
```

| `type`     | Việc                                                  | Tham số chính                                                   |
| ---------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| `straight` | bay thẳng từ cạnh khung vào trong                      | `from` (left/right/top/bottom), `at` 0..1, `count`, `spacing`    |
| `aimed`    | từ một điểm trên cạnh, nhắm vào người chơi             | `from`, `at`, `count`, `spreadDeg` (xòe quạt)                    |
| `burst`    | tỏa từ một điểm trong khung: vòng tròn hoặc quạt       | `x`, `y`, `count`, `angleDeg`, `arcDeg` (360 = vòng), `aimed`    |
| `sweep`    | kim đồng hồ quay quanh tâm (quay theo BEAT)            | `x`, `y`, `length`, `startAngleDeg`, `degreesPerBeat`, `durationBeats`, `hands` |
| `tempo`    | đổi BPM kịch bản                                       | `bpm`, `overBeats` (0 = ngay)                                    |
| `word`     | một câu ngắn bay từ mép khung; trúng không trừ máu     | `from`, `at`, `phrase` (chỉ số trong `data/words.ts`), `speed`   |
| `distraction` | thứ xao nhãng; không trừ máu; cầm bút mà chạm thì bút rơi. `hang` thì treo và đung đưa | `from`, `at`, `speed`, `radius`, `sprite`, `hang` |

Quy ước: `beat` là lúc đạn XUẤT HIỆN (có thể lẻ, ví dụ 40.5); vị trí trong khung là **tỉ lệ 0..1** (đổi kích thước khung
không hỏng pattern); góc tính bằng độ (0° = sang phải, 90° = xuống); `speed`, `radius`, `damage` tùy chọn, mặc định ở
`data/rhythm-feel.ts`. **Thêm LOẠI đạn mới**: khai báo kiểu trong `pattern-types.ts` + thêm handler vào `HANDLERS`
trong `battle/spawners.ts` (TypeScript buộc phải có handler cho mọi `type`).

### Công bằng: cảnh báo trước

- Đạn **lớn** (`radius ≥ bigRadius`), **vòng tròn/quạt** (`burst`), **kim** (`sweep`),
  **chữ** (`word`) và **đạn
  xao nhãng** (`distraction` khi `radius ≥ bigRadius` hoặc `DISTRACTION_FEEL.pull` > 0) BẮT BUỘC
  có cảnh báo nhấp nháy trước khi xuất hiện: mặc định `telegraphBeats` = 1 beat nhưng không ngắn hơn
  `telegraphMinSeconds` (BPM cao thì 1 beat quá ngắn). `validatePattern` từ chối pattern đặt `telegraphBeats` ≤ 0 cho
  các loại này (ném lỗi khi tạo `PatternRunner`). Đạn nhỏ, và đạn xao nhãng nhỏ khi lực hút = 0, mặc định không cảnh báo;
  có thể bật bằng `telegraphBeats`.
- Hình cảnh báo: dải ở mép khung (đạn lớn), vòng ở tâm (burst/kim), đường nét đứt (hướng nhắm, rìa quạt, hướng kim).
- Đạn nhắm KHÓA hướng lúc BẮT ĐẦU cảnh báo (người chơi thấy đường ngắm và kịp rời đi); không có cảnh báo thì khóa lúc bắn.
- Đã kiểm (bằng bot tạm, KHÔNG nằm trong repo): một bot né đạn nhìn thấy cảnh báo bị trúng 0 lần qua 3 vòng pattern thử (3 lần chạy khác nhau); khi cho
  bot mù cảnh báo thì bị trúng 36 lần. Tức cảnh báo thực sự đủ để né. Bot có phản xạ hoàn hảo nên người chơi thật
  sẽ khó hơn; đây chỉ là bằng chứng pattern không bất khả thi.

### Object pool

`BulletWorld` cấp phát sẵn pool đạn chấm (`maxBullets` = 256), kim (32), chữ (`WORD_FEEL.maxWords` = 32), đạn xao nhãng (`DISTRACTION_FEEL.max` = 32) và cảnh báo (64); giữa trận không tạo đối tượng
mới nên không giật GC khi nhiều đạn. Hết chỗ thì bỏ qua đạn mới và đếm vào `dropped` (hiện ở lớp debug, nên là 0).
Duyệt pool không tạo closure: xem ghi chú đầu `battle/pool.ts`.

### Âm thanh tích tắc (`audio/tick-sound.ts`)

Beat chẵn là "tích", beat lẻ là "tắc" (thấp hơn khoảng một quãng ba thứ). Mỗi tiếng gồm ba lớp rất ngắn (nhiễu lọc
dải = "click", âm sin tụt nhẹ = nốt, âm sin trầm = thân gỗ), lên nhanh 1 ms, qua bộ lọc cắt cao `softnessHz`. Đo bằng
OfflineAudioContext (ở volume 0,6; mặc định hiện là 0,5, nhỏ hơn khoảng 1,6 dB): tiếng dài ~38 ms, đỉnh −9 dBFS, gần
như không có năng lượng trên 4 kHz, mức trung bình khoảng −38 dBFS khi tích đều (rất nhẹ). **Chưa nghe bằng tai thật**:
nếu thấy chói hoặc giống tiếng "bíp" thay vì đồng hồ, chỉnh `AUDIO_FEEL`.
Phím **M** tắt/bật tiếng (giảm dần trong 20 ms). Khi tắt tiếng, tiếng vẫn được hẹn như thường nên bật lại vẫn đúng nhịp.
Sau này dùng file thật: viết một `TickSink` khác (cùng giao diện) phát `AudioBuffer`; bộ lên lịch giữ nguyên.

### Con số nên chỉnh (`data/rhythm-feel.ts`)

| Muốn…                                          | Chỉnh                                        |
| ---------------------------------------------- | -------------------------------------------- |
| Nhịp nhanh/chậm chung                          | `defaultBpm` hoặc `bpm` trong pattern         |
| Đạn bay nhanh/chậm                             | `BULLET_FEEL.speed` (hoặc `speed` từng sự kiện) |
| Đạn "to/nhỏ", khó/dễ né sát                    | `BULLET_FEEL.radius` (vùng trúng; hình vẽ lớn hơn 1 px) |
| Cảnh báo dài/ngắn                              | `telegraphBeats`, `telegraphMinSeconds`       |
| Nhịp nhấp nháy của cảnh báo                    | `telegraphFlashSeconds`                       |
| Tiếng to/nhỏ                                   | `AUDIO_FEEL.volume`                           |
| Tiếng đanh/ấm hơn                              | `softnessHz` (thấp = ấm), `tickHz`, `tockHz`  |
| Đạn xuất hiện sớm/muộn hơn tiếng "tích"        | `visualDelaySeconds` (sớm → tăng, muộn → giảm) |
| Thời gian dạo đầu trước beat 0                 | `leadInSeconds`                               |
| Một nhịp dài bao nhiêu beat (lúc hồi hệ số)    | `beatsPerBar`                                 |
| Sàn nhịp / mỗi câu hạ / mỗi câu hồi            | `PACE_FEEL.floor`, `drop`, `recover`          |
| Chữ to/nhỏ, bay nhanh/chậm, hitbox chữ         | `WORD_FEEL.fontSize` (16), `speed`, `hitboxScale` |
| Câu tan / câu nổ lâu hay mau                   | `WORD_FEEL.fadeSeconds`, `absorbSeconds`      |

Nét chì, bút và đạn xao nhãng nằm ở `data/sketch-feel.ts` (pixel logic 640×360); thời gian chuyển cảnh và dọn đạn ở
`data/flow-feel.ts`:

| Muốn…                                          | Chỉnh                                        |
| ---------------------------------------------- | -------------------------------------------- |
| Nhặt bút dễ/khó                                | `DRAW_FEEL.pickupRadius` (14)                 |
| Chờ bao lâu mới nhặt lại được                  | `DRAW_FEEL.pickupDelaySeconds` (0,3)          |
| Bút văng xa bao nhiêu khi rơi / cách mép       | `DRAW_FEEL.dropDistance` (56), `dropMargin` (20) |
| Bút lóe sáng thưa/dày                          | `DRAW_FEEL.glintEveryBeats` (4)               |
| Nét lúc chơi đậm/nhạt                          | `DRAW_FEEL.liveInkAlpha` (0,45)               |
| Trần số đoạn nét                               | `DRAW_FEEL.maxSegments` (6000)                |
| Bao nhiêu beat vẽ thì xong trang               | `finish.drawBeats` trong từng lượt của `resident-4.ts` |
| Sau bao nhiêu vòng thì trang tự khép dù chưa đủ | `DRAW_FEEL.maxLoops` (3)                      |
| Đi bao xa mỗi tick thì tính là đang vẽ         | `DRAW_FEEL.minMovePerTick` (0,5)              |
| Mặt đồng hồ của cô bé to/nhỏ                   | `DRAW_FEEL.clockRadius` (14)                  |
| Câu tự nhủ hiện bao lâu / tối đa mấy câu       | `DRAW_FEEL.idleLineSeconds` (3), `idleLineMax` (3) |
| Nét mảnh/đậm khi đi thường hoặc khi giữ Shift  | `SKETCH_FEEL.width`, `slowWidth`              |
| Nét gãy / mịn (khoảng lấy mẫu)                 | `sampleDistance`, `slowSampleDistance`        |
| Tua lại nét đã vẽ bao lâu                      | `SKETCH_FEEL.replaySeconds` (2,8)             |
| Giữ tranh bao lâu sau khi tua xong             | `SKETCH_FEEL.revealSeconds` (3,5)             |
| Nét lộ tranh dày bao nhiêu, màu sáp nào        | `SKETCH_FEEL.crayonWidth` (9), `crayonColor`  |
| Lực hút đạn xao nhãng (0 = tắt)                | `DISTRACTION_FEEL.pull`                       |
| Đạn xao nhãng bay nhanh/chậm, to/nhỏ           | `DISTRACTION_FEEL.speed`, `radius`            |
| Đạn treo: đung đưa rộng / nhanh / sợi dài / sống bao lâu | `DISTRACTION_FEEL.swingAmplitude`, `swingPerBeat`, `threadLength`, `hangBeats` |
| Mờ đen giữa các cảnh                           | `FLOW_FEEL.fadeSeconds` (0,4)                 |
| Đạn còn lại mờ đi khi pha `length` xong        | `FLOW_FEEL.clearSeconds` (0,6)                |
| Bánh răng nứt nằm yên bao lâu khi thua         | `FLOW_FEEL.loseHoldSeconds` (1,2)             |
| Cảnh mở: tích tắc một mình trước dòng đầu      | `INTRO_FEEL.leadSeconds` (3)                  |
| Cảnh mở: im lặng sau khi tích tắc dừng         | `INTRO_FEEL.silenceSeconds` (1,5)             |
| Màn kết: camera trôi bao lâu                   | `ENDING_FEEL.driftSeconds` (40)               |
| Màn kết: "Vẫn chưa muộn." hiện sau / bấm được sau | `closingLineAfterSeconds` (2), `confirmAfterSeconds` (4) |
| Màn kết: công trạng cuộn bao lâu / chống lỡ tay | `creditsSeconds` (20), `creditsGuardSeconds` (1) |
| Màn kết: nhịp từng lớp tích tắc                | `ENDING_FEEL.tickBpms` (60…88)                |

Pha tháo lắp nằm ở `data/disassembly-feel.ts`:

| Muốn…                                          | Chỉnh                                        |
| ---------------------------------------------- | -------------------------------------------- |
| Cửa sổ đúng nhịp rộng hay hẹp                  | `DISASSEMBLY_FEEL.beatWindow`                 |
| Vặn bao nhiêu nấc thì ốc rời                   | `DISASSEMBLY_FEEL.unscrewSteps`               |
| Giữ bao nhiêu beat thì nhấc được               | `DISASSEMBLY_FEEL.liftBeats`                  |
| Bộ phận chặn sáng bao lâu                      | `DISASSEMBLY_FEEL.blockFlashBeats`            |
| Câu ký ức hiện nhanh hay chậm                  | `DISASSEMBLY_FEEL.memoryCharsPerSecond`      |
| Tắt hẳn yêu cầu đúng nhịp của một máy          | `rhythmic: false` trên cỗ máy                 |
| Nhịp tích tắc của pha tháo                     | `bpm` trên cỗ máy                             |

## Quy ước code

- **Nội dung là dữ liệu, không code cứng.** Pattern đạn theo beat, hội thoại, bản đồ thị trấn, sprite đều nằm
  trong `src/data/` dưới dạng dữ liệu thuần (object/mảng, kiểu TypeScript rõ ràng). Code trong `core/`, `scenes/`,
  `battle/` chỉ là "bộ diễn giải" dữ liệu. Thêm cư dân mới = thêm dữ liệu, không sửa engine.
- **Không thêm thư viện khi chưa cần.** Mọi dependency mới phải có lý do rõ ràng; ưu tiên API trình duyệt
  sẵn có. Hiện chỉ có `vite`, `typescript`, `wrangler`, `vitest` (đều là devDependencies), không có thư viện chạy ở client.
- **Giữ build nhỏ.** Theo dõi dung lượng sau `npm run build`. Asset lớn (nhạc, ảnh) phải được nén và cân nhắc kỹ.
- **TypeScript strict.** `tsconfig.json` bật `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`,
  `noUnusedParameters`, `verbatimModuleSyntax`. `npm run build` phải qua mà không có lỗi kiểu.
- Tách `update` và `render`: `update` không vẽ, `render` không đổi trạng thái game.
- Mã định danh (biến, hàm, file) viết bằng tiếng Anh; comment và chuỗi hiển thị cho người chơi viết tiếng Việt.
- **Test**: Vitest, đặt cạnh file được kiểm (`*.test.ts`), chạy bằng `npm test` (cũng được `tsc` kiểm kiểu khi build,
  nhưng KHÔNG vào bản build). Test dùng pattern/fixture riêng ở `src/testing/`, không dựa vào dữ liệu thật vì dữ liệu
  hay được sửa; ngoại lệ duy nhất là kiểm pattern thật còn hợp lệ. Không viết test cần trình duyệt headless (kiểm tay).
  Test engine nhịp phải bắt được lỗi thật: khi sửa `beat-clock`/`tempo-map`/`tick-scheduler`/`pattern-runner`, thử phá
  code có chủ đích (ví dụ cho đồng hồ đếm theo tick) và chắc chắn ít nhất một test vỡ.
- Commit theo kiểu Conventional Commits (ví dụ `chore: ...`, `feat: ...`, `fix: ...`).

## Thứ tự phát triển

1. Di chuyển + va chạm + máu.
2. Đạn theo beat + tiếng tích tắc procedural.
2b. Nâng độ phân giải logic từ 320×180 lên 640×360, giữ nguyên cảm giác chơi.
3a. Lời tiêu cực của cư dân 3 trong pha né đạn (làm chậm nhịp).
3b. Nét vẽ của cô bé trong pha né đạn: "Nhặt bút" (mục cư dân 4). Đã làm; trống giấy (vòng 1–3) đã bị thay.
3c. Bản thô pha tháo lắp, dùng chung cho mọi cư dân. Thiết kế ở mục "Pha tháo lắp". Còn phần "Tầng".
4. Vertical slice một cư dân hoàn chỉnh (cư dân 4: 3 lượt, thua, hội thoại, cảnh kết).
5. Máy trạng thái cảnh + màn bắt đầu, mở đầu, kết + thị trấn + lưu tiến trình + nhảy cóc; khung trận tạm cho mọi cư dân.
6. Nội dung các cư dân còn lại và boss.
7. Hoàn thiện hình ảnh, âm thanh, font.

Đừng nhảy cóc: mỗi bước dựa trên bước trước. Chưa làm gameplay nào ngoài những gì thuộc bước hiện tại.
Các mốc nhỏ của từng bước nằm ở `AUTOPILOT.md`, mục "Kế hoạch từng bước".
