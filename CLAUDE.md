# Still Hours

Game web 2D lấy cảm hứng từ Undertale. Tên folder và tên Cloudflare Worker: `still-hours`.

> File này là nguồn sự thật về thiết kế và quy ước của dự án. Khi làm việc, hãy đọc kỹ các mục
> "Thông điệp và nguyên tắc kể chuyện" và "Quy ước code" trước khi thêm bất cứ nội dung hay tính năng nào.

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
   chơi bị chậm lại (mất thời gian vì điều không đáng).
4. **Cô bé yêu thích vẽ nhưng chưa đạt được ước mơ**, giờ phải học trái ngành, nản vì thấy mình chưa làm được
   gì, rồi lại để thời gian trôi vào những việc khác.
   - Cơ chế: đường di chuyển của người chơi khi né đạn **để lại nét chì**; cuối trận các nét ghép thành một bức
     tranh ("mỗi bước nhỏ đều thành một nét vẽ").
   - Đạn là những thứ xao nhãng, trông hấp dẫn và dễ bị hút vào; chạm vào thì **bị tẩy mất nét vẽ**.
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
- **Claude KHÔNG chạy `wrangler deploy` thật.** Chủ dự án tự đăng nhập (`npx wrangler login`) và deploy.

## Lệnh

| Lệnh               | Việc                                                              |
| ------------------ | ----------------------------------------------------------------- |
| `npm run dev`      | Vite dev server (hot reload)                                      |
| `npm run build`    | Kiểm tra kiểu (`tsc --noEmit`) rồi build ra `dist/`               |
| `npm run preview`  | Xem bản build bằng Vite                                           |
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
public/
  assets/       ảnh/âm thanh thật khi có (copy nguyên sang dist/)
  .assetsignore loại file không cần deploy (.gitkeep)
wrangler.jsonc  cấu hình Cloudflare Worker (Static Assets)
```

Hiện đã có:

- `core/`: `config.ts` (hằng số), `loop.ts` (fixed timestep), `renderer.ts` (canvas cố định, scale pixel art),
  `sprites.ts` (kho sprite theo id), `math.ts` (`Rect`, `overlaps`, `clamp`, `lerp`), `input.ts` (lớp trừu tượng
  hành động), `keyboard.ts` (nguồn input bàn phím).
- `battle/`: `dodge-phase.ts` (pha né đạn: khung, thanh máu, lớp debug), `player.ts` (bánh răng: di chuyển, hitbox,
  máu, bất tử), `temp-obstacles.ts` (**code TẠM**, xem dưới).
- `data/`: `feel.ts` (**mọi con số cảm giác của người chơi**), `battle-layout.ts` (kích thước khung, thanh máu),
  `keybindings.ts` (phím → hành động), `sprites.ts` (sprite placeholder), `temp-obstacles.ts` (**dữ liệu TẠM**).
- Chưa có code: `scenes/`, `audio/`, lưu tiến trình trong `core/`.

**Code tạm cần xóa ở bước 2:** `battle/temp-obstacles.ts` và `data/temp-obstacles.ts` (vật cản để thử va chạm). Thay
bằng đạn theo beat đọc từ pattern trong `src/data/`; `DodgePhase` chỉ đổi chỗ tạo và cập nhật vật cản.

### Nền tảng kỹ thuật đã chốt

- **Độ phân giải logic cố định 320×180** (`GAME_WIDTH`/`GAME_HEIGHT`). Mọi toạ độ trong game theo hệ này.
- **Scale pixel art**: `Renderer.fit()` phóng canvas theo bội số nguyên của pixel thiết bị (có tính
  `devicePixelRatio`), CSS `image-rendering: pixelated`. Chỉ thu nhỏ lẻ khi cửa sổ nhỏ hơn 320×180.
- **Fixed timestep 60 Hz** (`TICK_RATE`). `update()` tách khỏi `render(alpha)`. Logic game (đạn, nhịp tích tắc,
  va chạm) chỉ được phụ thuộc vào số tick, **không** dùng `Date.now()`/FPS. Nhờ vậy nhịp "theo beat" ổn định và
  cơ chế làm chậm nhịp (cư dân 3) chỉ là đổi hệ số tick.
- Không dùng `{ alpha: false }` cho canvas context: nó bật antialiasing chữ LCD, gây viền màu trên pixel art.
- **Input qua hành động, không qua phím.** Logic game chỉ dùng `Input.isDown(action)`, `wasPressed(action)` và
  `input.move`. Hành động: `up/down/left/right/confirm/cancel/slow/debug`. Phím gán ở `data/keybindings.ts` (theo
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
  hitbox vật cản (hồng), toạ độ và số tick.
- Windows có "Sticky Keys" bật lên khi bấm Shift 5 lần liên tiếp, có thể làm gián đoạn lúc chơi; đây là cài đặt của
  hệ điều hành, game không chặn được. Nếu thành vấn đề, thêm phím phụ cho `slow` trong `keybindings.ts`.

## Quy ước code

- **Nội dung là dữ liệu, không code cứng.** Pattern đạn theo beat, hội thoại, bản đồ thị trấn, sprite đều nằm
  trong `src/data/` dưới dạng dữ liệu thuần (object/mảng, kiểu TypeScript rõ ràng). Code trong `core/`, `scenes/`,
  `battle/` chỉ là "bộ diễn giải" dữ liệu. Thêm cư dân mới = thêm dữ liệu, không sửa engine.
- **Không thêm thư viện khi chưa cần.** Mọi dependency mới phải có lý do rõ ràng; ưu tiên API trình duyệt
  sẵn có. Hiện chỉ có `vite`, `typescript`, `wrangler` (đều là devDependencies), không có thư viện chạy ở client.
- **Giữ build nhỏ.** Theo dõi dung lượng sau `npm run build`. Asset lớn (nhạc, ảnh) phải được nén và cân nhắc kỹ.
- **TypeScript strict.** `tsconfig.json` bật `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`,
  `noUnusedParameters`, `verbatimModuleSyntax`. `npm run build` phải qua mà không có lỗi kiểu.
- Tách `update` và `render`: `update` không vẽ, `render` không đổi trạng thái game.
- Mã định danh (biến, hàm, file) viết bằng tiếng Anh; comment và chuỗi hiển thị cho người chơi viết tiếng Việt.
- Commit theo kiểu Conventional Commits (ví dụ `chore: ...`, `feat: ...`, `fix: ...`).

## Thứ tự phát triển

1. Di chuyển + va chạm + máu.
2. Đạn theo beat + tiếng tích tắc procedural.
3. Bản thô mini-game tháo lắp của cư dân 3 và cơ chế nét vẽ của cô bé.
4. Vertical slice một cư dân hoàn chỉnh.
5. Máy trạng thái cảnh + thị trấn + lưu tiến trình.
6. Nội dung các cư dân còn lại và boss.
7. Hoàn thiện hình ảnh, âm thanh, font.

Đừng nhảy cóc: mỗi bước dựa trên bước trước. Chưa làm gameplay nào ngoài những gì thuộc bước hiện tại.
