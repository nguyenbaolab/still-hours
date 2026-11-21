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
- **Bước tiếp theo: (2b)**, nâng độ phân giải logic từ 320×180 lên 640×360, giữ nguyên cảm giác chơi. Chưa có gì của
  pha tháo lắp. Hiện `main.ts` chạy thẳng `DodgePhase` (máy trạng thái cảnh là bước 5), và hết máu chỉ reset
  (chưa có màn thua).
- **Vấn đề còn mở:**
  1. **Làm chậm nhịp của cư dân 3 mà vẫn trở lại tempo kịch bản.** Đã chọn hướng (a): hệ số chậm tách riêng, nhân lên
     tempo kịch bản, rồi hồi về 1. Không dùng `clock.tempo.change` cho việc này: `change` cắt bỏ mọi tempo kịch bản
     sau beat đó (kể cả vòng kế mà `PatternRunner` đã triển khai trước) và runner không biết để làm lại. Ràng buộc:
     - Hệ số chậm là **hằng số theo đoạn**. Nhân với đoạn BPM tuyến tính vẫn ra đoạn tuyến tính, nên `TempoMap` giữ
       được công thức đóng beat ↔ giây. Ramp tuyến tính của hệ số sẽ ra bậc hai, không được.
     - Hệ số luôn trong (0, 1]. Cảnh báo đã triển khai chỉ dài thêm theo giây, không ngắn hơn `telegraphMinSeconds`.
     - Trúng thì giảm từ beat kế tiếp. Hồi phục áp dụng ở đầu ô nhịp (từng nấc hằng số, không phải dốc liên tục).
       Cần thêm `beatsPerBar` vào `data/rhythm-feel.ts` (hiện chưa có).
     - Tiếng và đạn phải đọc cùng một `TempoMap`. `TickScheduler` đã tự hẹn lại khi `version` đổi (có test). Phần mới
       phải có test đồng bộ tương tự và được kiểm bằng cách phá code có chủ đích.
  2. **Dọn tiến trình nền trên Windows.** Dừng một tác vụ nền (`npm run dev`, `npx wrangler dev`) bằng công cụ dừng
     tác vụ chỉ tắt lớp vỏ: `node`, `vite`, `workerd.exe` con vẫn sống và giữ cổng (5173, 5199, 8787); nếu chỉ kill
     con thì `wrangler dev` tự khởi động lại `workerd`. Cách dọn: tìm chủ cổng bằng `Get-NetTCPConnection -State Listen
     -LocalPort <cổng>`, kiểm tra dòng lệnh có `still-hours` (không đụng tiến trình khác, ví dụ MCP server), rồi
     `taskkill /PID <pid> /T /F` trên tiến trình trên cùng của cây, và kiểm lại cổng đã trống. Trước khi bật server nền,
     kiểm cổng trống và dùng `--strictPort` để xung đột báo lỗi rõ thay vì chạy nhầm server cũ.
  3. Nhỏ: `npm run deploy` chỉ build rồi deploy, **không chạy `npm test`**. Cân nhắc thêm `npm test &&` vào script nếu
     muốn chặn deploy khi test vỡ. Độ trễ loa (đặc biệt Bluetooth) chỉnh bằng `visualDelaySeconds`.

## Quy trình làm việc (cho mọi trợ lý AI: Claude Code, Cursor...)

- Mỗi cuộc chat làm đúng một bước trong "Thứ tự phát triển".
- Làm xong thì KHÔNG commit, KHÔNG push. Dừng lại để chủ dự án chơi thử.
- Chỉ commit khi chủ dự án nói đã ưng, theo Conventional Commits. Không bao giờ force push. Không bao giờ deploy:
  cả `npm run deploy` lẫn `wrangler deploy`.
- Không tự bật `npm run dev`, `npx wrangler dev` hay tiến trình nền nào; chủ dự án tự chạy trong terminal của họ.
- Được tự chạy: `npm run build`, `npm test`.
- Gặp quyết định thiết kế chưa có trong file này: hỏi, không tự chốt.
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
  - 4 cư dân + 1 boss, mỗi trận ~3 phút.
  - Đi lại trong thị trấn và hội thoại giữa các trận ~1–2 phút mỗi lần.
  - Kết thúc ~2 phút.
- Thị trấn là một khu nhỏ có thể đi lại, có những chỗ để dừng lại ngắm cảnh. Những khoảng lặng này là một
  phần của thông điệp, **không phải đoạn đệm**.
- Tôn trọng thời gian người chơi:
  - Thua thì **chơi lại ngay từ đầu pha vừa thua**, không bắt chơi lại cả trận.
  - Hội thoại có thể **tua nhanh**.
  - Không cày cuốc, không câu giờ.
- **Tự động lưu tiến trình sau mỗi cư dân** (localStorage), để người chơi dừng giữa chừng và quay lại được.

## Nhân vật

1. **Cư dân lỡ hẹn với gia đình.** Tích tắc dồn dập khi né; pha tháo lắp chậm và êm. Mảnh ký ức là những bữa
   cơm, cuộc gọi bị bỏ lỡ.
2. **Cư dân cả đời chưa ngẩng đầu nhìn quanh.** Đứng yên vài giây thì cảnh đẹp hiện ra và đạn chậm lại.
3. **Cư dân bị lời người khác ám ảnh.** Đạn là những câu nói tiêu cực; đỡ trúng thì nhịp tích tắc của người
   chơi bị chậm lại (mất thời gian vì điều không đáng). Lời tiêu cực **không trừ máu**; cái giá là thời gian.
   Ghi chú khi chơi thử: nhịp chậm thì đạn sinh thưa hơn, trận dễ hơn nhưng dài hơn; để ý người chơi có cố tình
   ăn đạn không. Kể cả bị trúng liên tục, trận không dài quá ~1,25 lần độ dài kịch bản; chọn sàn và mức hồi
   theo ràng buộc này.
4. **Cô bé yêu thích vẽ nhưng chưa đạt được ước mơ**, giờ phải học trái ngành, nản vì thấy mình chưa làm được
   gì, rồi lại để thời gian trôi vào những việc khác.
   - Cơ chế: đường di chuyển của người chơi khi né đạn **để lại nét chì**; cuối trận các nét ghép thành một bức
     tranh ("mỗi bước nhỏ đều thành một nét vẽ").
   - Đạn là những thứ xao nhãng, trông hấp dẫn và dễ bị hút vào; chạm vào thì **bị tẩy mất nét vẽ**. Đạn xao nhãng
     **không trừ máu**; cái giá là mất nét vẽ.
   - Ý tưởng cần thử, chưa chốt: đạn xao nhãng có lực hút nhẹ kéo bánh răng về phía nó.
   - Bức tranh cuối trận không cần hoàn hảo hay hoàn chỉnh, chỉ cần **có**.
   - Kết: cô bé cầm bút chì lên.
5. **Boss: người thợ đồng hồ đã phí cả đời.** Không cần thắng, chỉ cần bước ra khỏi vòng lặp.

## Thông điệp và nguyên tắc kể chuyện

Thông điệp: biết quý trọng thời gian, và quan trọng nhất là **VẪN CHƯA MUỘN để bắt đầu lại**. Sống có ý nghĩa,
dành thời gian cho gia đình và ngắm nhìn thế giới, đừng phí thời gian vào điều tiêu cực người khác gây ra.

- **Kết thúc mở.** Game KHÔNG nói nhân vật có sửa được lỗi lầm hay đạt được ước mơ hay không. Họ chỉ nhận ra
  và muốn thay đổi, và đó là đủ.
- **Cơ chế mang thông điệp, lời thoại chỉ gợi nhẹ.** Không giảng đạo lý. Nếu một ý có thể truyền bằng cơ chế
  thì không viết nó thành câu thoại.
- **Màn kết hiện tổng thời gian người chơi đã bỏ ra**, kèm một câu rất ngắn.

## Hình ảnh và âm thanh

- **Hình ảnh**: giai đoạn đầu dùng placeholder vẽ bằng code (hình khối, sprite pixel định nghĩa bằng mảng dữ
  liệu). Game chỉ tham chiếu sprite qua `id` (xem `src/core/sprites.ts`, `Renderer.sprite()`), nên khi có ảnh PNG
  chỉ cần đổi `definePixels(id, ...)` thành `loadImage(id, url)`, code vẽ không đổi. PNG đặt trong `public/assets/`.
- **Âm thanh**: tạo bằng WebAudio theo kiểu procedural: tiếng tích tắc, tiếng bánh răng, hiệu ứng khi tháo lắp,
  nhạc nền đơn giản. Module `src/audio/` phải thiết kế để sau này thêm được file nhạc thật (phát qua cùng một
  giao diện theo tên âm thanh, nguồn có thể là bộ tổng hợp hoặc file). Nhớ: trình duyệt chỉ cho phát âm thanh sau
  một thao tác của người dùng.
- **Font**: BẮT BUỘC hỗ trợ đầy đủ dấu tiếng Việt. **Chưa chọn font**; hiện dùng `monospace` tạm thời
  (`FONT_FAMILY` trong `src/core/config.ts`). Khi chọn, kiểm tra thật với các chữ như "ắ ằ ẳ ẵ ặ ế ề ể ễ ệ ố ồ ổ
  ỗ ộ ớ ờ ở ỡ ợ ứ ừ ử ữ ự ỳ ỷ ỹ ỵ đ" và cân nhắc kích thước tối thiểu để đọc rõ trên canvas độ phân giải thấp.
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
| `npm run deploy`   | Build rồi `wrangler deploy` (chủ dự án chạy)                      |
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
  (hẹn trước tiếng tích tắc theo đúng bản đồ tempo), `tick-sound.ts` (tổng hợp tiếng đồng hồ cơ).
- `battle/`: `dodge-phase.ts` (pha né đạn: khung, thanh máu, lớp debug, ghép mọi thứ), `player.ts` (bánh răng),
  `pattern-runner.ts` (chạy pattern theo beat, kiểm tra tính công bằng), `spawners.ts` (một handler cho mỗi loại
  đạn), `bullets.ts` (đạn, cảnh báo, va chạm, vẽ), `pool.ts` (pool đối tượng).
- `scenes/`: `scene.ts` (giao diện `Scene`), `press-start.ts` (màn "Nhấn phím bất kỳ để bắt đầu").
- `data/`: `feel.ts` (**cảm giác của người chơi**), `rhythm-feel.ts` (**cảm giác của nhịp, đạn, âm thanh**),
  `battle-layout.ts` (kích thước khung, thanh máu), `keybindings.ts` (phím → hành động), `sprites.ts` (sprite
  placeholder), `pattern-types.ts` (**định dạng pattern đạn**), `patterns/test-pattern.ts` (pattern thử ~31 giây).
- `testing/`: `sim.ts` (đồng hồ âm thanh giả, `simulate` với jitter và lần treo, tích phân Simpson độc lập), `fixtures.ts`
  (pattern fixture + hàm tính giờ độc lập). Test: `core/tempo-map.test.ts`, `audio/tick-scheduler.test.ts`,
  `battle/rhythm-sync.test.ts`, `battle/pattern-runner.test.ts`.
- Chưa có code: lưu tiến trình trong `core/`, pha tháo lắp, hội thoại, thị trấn.

### Nền tảng kỹ thuật đã chốt

- **Độ phân giải logic cố định**, hiện **320×180** (`GAME_WIDTH`/`GAME_HEIGHT` trong `src/core/config.ts`). Mọi
  toạ độ trong game theo hệ này. Bước 2b nâng lên **640×360** và giữ nguyên cảm giác chơi; đến bước đó mới đổi hai
  hằng này cùng các kích thước px đi kèm.
- **Scale pixel art**: `Renderer.fit()` phóng canvas theo bội số nguyên của pixel thiết bị (có tính
  `devicePixelRatio`), CSS `image-rendering: pixelated`. Chỉ thu nhỏ lẻ khi cửa sổ nhỏ hơn độ phân giải logic.
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
- **Hitbox nhỏ hơn hình vẽ** (`hitboxSize` so với sprite 9px) để người chơi thấy mình né sát mà không trúng. Va chạm
  dùng AABB (`overlaps`); chỉ chạm mép thì không tính là trúng.
- **Cảm giác nằm ở `data/feel.ts`** (tốc độ, tốc độ khi giữ Shift, hitbox, thời gian bất tử, nhấp nháy, máu tối đa).
  Đơn vị: px/giây và giây; code tự quy ra tick. Không rải số "cảm giác" vào code.
- **Lớp debug bật/tắt bằng F1** (vẫn có trong bản deploy): hiện hitbox bánh răng (xanh lá), khung hình vẽ (xám),
  vùng va chạm của đạn và kim (hồng), toạ độ, số tick, **beat hiện tại, BPM, vòng pattern, số đạn và cảnh báo đang
  hoạt động** (và số lần phải bỏ đạn vì pool đầy: nên luôn là 0).
- Windows có "Sticky Keys" bật lên khi bấm Shift 5 lần liên tiếp, có thể làm gián đoạn lúc chơi; đây là cài đặt của
  hệ điều hành, game không chặn được. Nếu thành vấn đề, thêm phím phụ cho `slow` trong `keybindings.ts`.

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

- Tempo kịch bản nằm trong pattern (sự kiện `tempo`). Hết mỗi vòng, BPM trở về `pattern.bpm`.
- **Cư dân 3 làm chậm nhịp (bước 3a):** đã chọn hướng (a). Không dùng `clock.tempo.change` để làm chậm, vì `change`
  cắt bỏ tempo kịch bản phía sau. Hệ số chậm là lớp riêng, nhân lên tempo kịch bản. Chi tiết và ràng buộc ở vấn đề mở 1.

### Định dạng pattern (`data/pattern-types.ts`)

Một pattern là danh sách sự kiện theo beat. **Thêm pattern mới = thêm file dữ liệu trong `data/patterns/`**
(xuất một `Pattern`), rồi truyền vào `new DodgePhase(input, audio, bodySize, pattern)`; không sửa code engine.
`DodgePhase` hiện mặc định dùng `TEST_PATTERN`.

```ts
export const MY_PATTERN: Pattern = {
  name: "…", bpm: 100, lengthBeats: 60, loop: true,
  events: [
    { beat: 4, type: "straight", from: "right", at: 0.5 },                         // đạn từ mép phải, giữa cạnh
    { beat: 8, type: "aimed", from: "top", at: 0.5, count: 3, spreadDeg: 18 },       // 3 viên nhắm vào người chơi
    { beat: 18, type: "burst", x: 0.5, y: 0.5, count: 12 },                          // vòng tròn 12 viên từ giữa
    { beat: 20, type: "sweep", x: 0.5, y: 0.5, length: 40, startAngleDeg: -90,
      degreesPerBeat: 45, durationBeats: 8 },                                         // kim đồng hồ quay quanh tâm
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
| `tempo`    | đổi BPM                                                | `bpm`, `overBeats` (0 = ngay)                                    |

Quy ước: `beat` là lúc đạn XUẤT HIỆN (có thể lẻ, ví dụ 40.5); vị trí trong khung là **tỉ lệ 0..1** (đổi kích thước khung
không hỏng pattern); góc tính bằng độ (0° = sang phải, 90° = xuống); `speed`, `radius`, `damage` tùy chọn, mặc định ở
`data/rhythm-feel.ts`. **Thêm LOẠI đạn mới**: khai báo kiểu trong `pattern-types.ts` + thêm handler vào `HANDLERS`
trong `battle/spawners.ts` (TypeScript buộc phải có handler cho mọi `type`).

### Công bằng: cảnh báo trước

- Đạn **lớn** (`radius ≥ bigRadius`), **vòng tròn/quạt** (`burst`) và **kim** (`sweep`) BẮT BUỘC có cảnh báo nhấp
  nháy trước khi xuất hiện: mặc định `telegraphBeats` = 1 beat nhưng không ngắn hơn `telegraphMinSeconds` (BPM cao
  thì 1 beat quá ngắn). `validatePattern` từ chối pattern đặt `telegraphBeats` ≤ 0 cho các loại này (ném lỗi khi tạo
  `PatternRunner`). Đạn nhỏ mặc định không cảnh báo, có thể bật bằng `telegraphBeats`.
- Hình cảnh báo: dải ở mép khung (đạn lớn), vòng ở tâm (burst/kim), đường nét đứt (hướng nhắm, rìa quạt, hướng kim).
- Đạn nhắm KHÓA hướng lúc BẮT ĐẦU cảnh báo (người chơi thấy đường ngắm và kịp rời đi); không có cảnh báo thì khóa lúc bắn.
- Đã kiểm (bằng bot tạm, KHÔNG nằm trong repo): một bot né đạn nhìn thấy cảnh báo bị trúng 0 lần qua 3 vòng pattern thử (3 lần chạy khác nhau); khi cho
  bot mù cảnh báo thì bị trúng 36 lần. Tức cảnh báo thực sự đủ để né. Bot có phản xạ hoàn hảo nên người chơi thật
  sẽ khó hơn; đây chỉ là bằng chứng pattern không bất khả thi.

### Object pool

`BulletWorld` cấp phát sẵn pool đạn chấm (`maxBullets` = 256), kim (32) và cảnh báo (64); giữa trận không tạo đối tượng
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
| Đạn "to/nhỏ", khó/dễ né sát                    | `BULLET_FEEL.radius` (vùng trúng; hình vẽ lớn hơn 0,5 px) |
| Cảnh báo dài/ngắn                              | `telegraphBeats`, `telegraphMinSeconds`       |
| Nhịp nhấp nháy của cảnh báo                    | `telegraphFlashSeconds`                       |
| Tiếng to/nhỏ                                   | `AUDIO_FEEL.volume`                           |
| Tiếng đanh/ấm hơn                              | `softnessHz` (thấp = ấm), `tickHz`, `tockHz`  |
| Đạn xuất hiện sớm/muộn hơn tiếng "tích"        | `visualDelaySeconds` (sớm → tăng, muộn → giảm) |
| Thời gian dạo đầu trước beat 0                 | `leadInSeconds`                               |

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
3b. Nét vẽ của cô bé trong pha né đạn.
3c. Bản thô pha tháo lắp, dùng chung cho mọi cư dân (thiết kế sẽ chốt trước khi làm).
4. Vertical slice một cư dân hoàn chỉnh.
5. Máy trạng thái cảnh + thị trấn + lưu tiến trình.
6. Nội dung các cư dân còn lại và boss.
7. Hoàn thiện hình ảnh, âm thanh, font.

Đừng nhảy cóc: mỗi bước dựa trên bước trước. Chưa làm gameplay nào ngoài những gì thuộc bước hiện tại.
