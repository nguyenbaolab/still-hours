# PLAYTEST

Hướng dẫn chơi thử sau lượt chạy tự động (AUTOPILOT.md). Game đã nối trọn vòng: màn bắt đầu → mở đầu → thị trấn → 5 trận
(4 cư dân và boss) → màn kết. **Toàn bộ lượt này chưa được chạy trong trình duyệt thật** (luật cấm bật `npm run dev`); mọi thứ
được kiểm bằng `npm test` (403 test), `npm run build` và bot mô phỏng. Nên chuyện đầu tiên là mở game lên xem có chạy không.

## Cách chạy

```
npm install
npm run dev          # mở địa chỉ Vite in ra, thường http://localhost:5173
npm test             # 403 test, ~1 giây
npm run build        # tsc rồi build ra dist/
npx wrangler dev     # xem bản dist/ như production (cần npm run build trước)
```

Không deploy. Chủ dự án tự chạy `npm run deploy` khi muốn.

### Phím

| Phím | Việc |
| ---- | ---- |
| Mũi tên / WASD | Đi, chọn bộ phận khi tháo, lên/xuống ở menu |
| Shift (giữ) | Đi chậm (và vẽ nét mịn, đậm ở cư dân 4) |
| Z hoặc Enter | Xác nhận, nói chuyện, thao tác khi tháo |
| X hoặc Esc | Hủy; **giữ X để tua nhanh chữ** trong hội thoại |
| M | Tắt/bật tiếng |
| F1 | Lớp debug (hitbox, beat, BPM, số đạn, dòng mẫu dấu tiếng Việt) |

### Nhảy thẳng tới từng cư dân

Nhảy cóc không đọc ghi bản lưu (góc phải trên hiện "DEBUG · không lưu"). Cư dân đứng trước đích coi như đã giải thoát.

- **Phím:** bấm F1 để bật lớp debug, rồi `1`–`4` vào trận cư dân 1–4 từ lượt 1, `5` boss, `6` thị trấn ở tiệm, `7` màn kết,
  `0` màn bắt đầu. Phím nhảy chờ âm thanh mở khóa: bấm một phím trước.
- **URL:** `http://localhost:5173/?jump=r1` … `r4`, `boss` (vào trận); `r4.2` (lượt 2, pha né); `r4.2d` (lượt 2, pha tháo);
  `town`; `town.r3` (thị trấn, đứng trước chị Vân); `intro`; `ending`; `title`. Giá trị lạ thì bỏ qua.

## Đã làm, theo từng bước

- **1–2b:** di chuyển, va chạm, máu; đạn theo beat và tiếng tích tắc procedural, đồng hồ nhịp lấy từ đồng hồ âm thanh; độ phân giải 640×360.
- **3a:** lời tiêu cực của chị Vân làm chậm nhịp (`Pace`, `TempoMap.setPace`).
- **3b:** "Nhặt bút" cho Linh (mục dưới).
- **3c:** pha tháo dùng chung, chia 3 tầng, 5 cỗ máy (đồng hồ quả quýt, bấm giờ, máy đếm nhịp, đồng hồ báo thức, tháp đồng hồ).
- **4:** hộp thoại (gõ chữ, tua bằng X), trận 3 lượt, màn thua không chữ (bánh răng nứt rồi lành), cảnh kết của Linh.
- **5:** `Director` (mờ đen, F1, M, đếm thời gian chơi), màn bắt đầu có menu Tiếp tục / Bắt đầu lại, lưu tiến trình
  (`localStorage`), thị trấn 64×11 ô đi lại được (cổng, chỗ ngắm cảnh), cảnh mở đầu, màn kết, nhảy cóc.
- **6:** cư dân 1 (nhịp dồn), 2 (đứng yên thì thế giới hiện ra), 3 (lời chậm nhịp, đồng hồ trễ), boss (khe cửa trên viền khung),
  thị trấn đổi dần theo cư dân, cảnh kết riêng cho từng người, bot né đạn thử toàn bộ.
- **7:** font VT323 tự host; âm thanh nền (gió, tích xa, tích màn bắt đầu) và test mọi cue; sprite riêng cho bộ phận máy.

## Màn Linh (cư dân 4), tóm tắt

Khung né là tờ giấy với một cây bút chì nằm trên. Chạm bút thì cầm, từ đó mọi bước đi đều để lại nét chì, không hình mẫu,
không chấm điểm. Đạn xao nhãng (không trừ máu) làm **rơi bút** nếu đang cầm; bút văng ra, phải đi nhặt lại. Mặt đồng hồ nhỏ
của cô bé chỉ chạy khi đang vẽ; đủ một vòng thì trang xong, nét của lượt được tua lại bằng sáp rồi giữ tranh. Trang **luôn khép
được** (sau `DRAW_FEEL.maxLoops` vòng pattern dù chưa vẽ đủ, kể cả không bao giờ nhặt bút: trang trắng). Ba lượt vẽ tiếp trên cùng
một tờ. Cảnh kết: tranh của người chơi thu vào tờ giấy trên bàn, Linh cầm bút chì lên; tranh được lưu và treo trên tường nhà cô.

Nên thử: không nhặt bút cả lượt (xem câu tự nhủ, trang trắng); nhặt rồi để xao nhãng làm rơi; thua giữa lượt (tranh và kim còn nguyên).

## Lỗi đã biết, chỗ chưa xong

Không có mốc nào bị bỏ vì lỗi. Những chỗ còn thiếu hoặc chưa kiểm:

1. **Chưa chạy trong trình duyệt thật.** Chưa ai thấy hình, nghe tiếng, hay cảm nhận nhịp. Dễ hỏng nhất: font không nạp (kiểm tab
   Network, phải có `VT323-Regular.ttf` 153 KB), canvas không co đúng cửa sổ, âm thanh không mở khóa.
2. **Âm thanh chưa nghe bằng tai.** Gió (`AMBIENCE_FEEL.windLevel` 0,07), độ đục tiếng tích xa, tiếng chuông `ring`, `hum`, `bird`,
   `chime`, `blip` của từng người nói, độ to chung `AUDIO_FEEL.volume`. Test chỉ kiểm không ném lỗi, mọi nguồn có `start`/`stop`.
3. **Độ trễ loa:** đạn xuất hiện đúng lúc nghe tiếng tích trên loa thường. Loa Bluetooth trễ nhiều: chỉnh `RHYTHM_FEEL.visualDelaySeconds`.
4. **Dấu tiếng Việt chồng** (ẳ, ỡ, ợ…) có thể dính hay bị cắt ở cỡ 20 của VT323. Script kiểm `cmap` báo 0 ký tự thiếu, nhưng chưa
   nhìn bằng mắt. Bật F1 xem dòng mẫu ở cỡ 16/20/24/32. Nếu xấu: dự phòng GNU Unifont (CLAUDE.md, mục Font).
5. **Hình vẫn là placeholder** (sprite pixel viết bằng mã, hình khối). Chưa có PNG. Người thợ 24×36 px, cư dân 16×24 px.
6. **Chị Vân lượt 2 dễ hơn dự định:** bot đứng yên giữa khung vẫn thắng vì đạn thường thưa. Không bất khả thi, chỉ nhẹ tay.
   Muốn khó hơn: thêm `aimed` ở giữa lượt (`data/patterns/resident-3.ts`).
7. **Chữ của chị Vân dễ né hơn một chút sau khi đổi font:** `WORD_FEEL.advanceEm` 0,6 → 0,4 làm khung chữ hẹp đi một phần ba.
   Muốn như cũ: tăng `WORD_FEEL.fontSize` hoặc `hitboxScale`.
8. **Độ khó chưa đo bằng người.** Bot né 15 lượt đều thắng với 0 lần thua và tháo hết 5 máy (mỗi tầng 2–6 giây); người thật chậm hơn
   nhiều. Lượt dài nhất của bot: chú Minh lượt 3, 49 giây so với 36 của kịch bản (~1,37 lần, trần thiết kế 2 lần).
9. **Linh:** bot né kỹ nên chỉ vẽ 11–28 beat mỗi lượt, trang khép bằng `maxLoops` (~60 giây). Người chơi cứ đi liên tục thì xong
   trong khoảng 26–30 giây mỗi lượt. Chưa biết 3 vòng chờ có quá dài hay không với người hay nhặt bút lâu.
10. **Cảnh kết của mỗi cư dân là màn tối riêng**, không phải cảnh trong thị trấn như thiết kế gốc (xem DECISIONS.md 6.5). Muốn đổi
    thì dựng lại trong `TownScene`.
11. **Sticky Keys:** Windows bật khi bấm Shift 5 lần liên tiếp. Là cài đặt hệ điều hành, game không chặn được.
12. **Mờ đen tab ẩn:** tab ẩn thì âm thanh tạm dừng, trận tạm dừng theo (đúng thiết kế); chưa thử chuyển tab giữa pha né.

## Chỗ không chắc (gom từ DECISIONS.md, cần chủ dự án quyết)

- **Hội thoại, câu ký ức, câu thoại của đạn chữ** đều dùng bản nháp đã chốt trong CLAUDE.md. Đọc thử toàn bộ một lượt xem giọng
  có ổn không, nhất là "Vẫn chưa muộn." (chỉ được xuất hiện đúng một lần ở màn kết; test kiểm).
- **Biển trong thị trấn** (`officeSign`, `noticeBoard`, `towerSign`) là chữ tự viết ngắn, trung tính vì thiết kế chưa có lời.
- **Màn bắt đầu dùng tiếng tích thường** (không phải bản xa) mỗi giây một tiếng: để rõ vì là âm thanh duy nhất của màn.
- **Cư dân 1 dùng `rhythmic: false` ở pha tháo** (êm, không cần đúng nhịp); còn lại `rhythmic: true`. Gợi ý phím "Mũi tên chọn · Z thao tác" chỉ hiện ở tầng 1 của bác Hòa.
- **Boss:** khe cửa mở từ vòng 1; vòng 3 trở đi mở không đóng; từ vòng 4 mở ngay từ beat 0. Bảo đảm lối ra nhưng boss có thể quá dễ
  nếu người chơi biết ngay chỗ ra; chưa có người thật thử.
- **Tháp đồng hồ trong màn kết:** camera trôi ~40 giây, tích tắc chồng lớp, thẻ thời gian, công trạng. Cảm giác cả chuỗi chưa ai xem.
- **Bản lưu:** chỉ lưu sau mỗi cư dân (và sau cảnh mở đầu); thoát giữa trận thì vào lại ở thị trấn trước cư dân đó.

## Con số nên chỉnh (file + tên hằng)

| Muốn… | Chỉnh |
| ----- | ----- |
| Bánh răng nhanh/chậm, máu tối đa, bất tử sau trúng | `data/feel.ts`: `PLAYER_FEEL.speed`, `slowSpeed`, `maxHp`, `invincibleSeconds` |
| Đạn bay nhanh/to, cảnh báo dài/ngắn | `data/rhythm-feel.ts`: `BULLET_FEEL.speed`, `radius`; `RHYTHM_FEEL.telegraphMinSeconds` |
| Dạo đầu trước beat 0, độ trễ loa | `RHYTHM_FEEL.leadInSeconds`, `visualDelaySeconds` |
| Tiếng tích to/đanh | `AUDIO_FEEL.volume`, `softnessHz`, `tickHz`, `tockHz` |
| Chị Vân: sàn nhịp, hạ, hồi; chữ to/nhanh | `PACE_FEEL.floor` (0,7), `drop`, `recover`; `WORD_FEEL.fontSize`, `speed`, `hitboxScale`, `advanceEm` |
| Chú Minh: đứng yên bao lâu, chậm bao nhiêu | `data/flow-feel.ts`: `STILL_FEEL.stillSeconds`, `pace`, `fadeInSeconds` |
| Linh: nhặt bút, bút rơi xa, số vòng tự khép | `data/sketch-feel.ts`: `DRAW_FEEL.pickupRadius`, `dropDistance`, `maxLoops`; `finish.drawBeats` trong `data/patterns/resident-4.ts` |
| Linh: tranh tua lại / giữ bao lâu | `SKETCH_FEEL.replaySeconds`, `revealSeconds` |
| Lực hút đạn xao nhãng | `DISTRACTION_FEEL.pull` |
| Pha tháo: cửa sổ nhịp, số nấc, số beat giữ | `data/disassembly-feel.ts`: `beatWindow` (0,25), `unscrewSteps`, `liftBeats` |
| Boss: khe cửa (rộng, mở bao lâu, từ beat nào) | `finish: { kind: "exit", … }` trong `data/patterns/boss.ts` |
| Mờ đen, màn thua | `FLOW_FEEL.fadeSeconds`, `loseHoldSeconds` |
| Hội thoại: tốc độ chữ, tua nhanh | `DIALOGUE_FEEL.charsPerSecond`, `fastMultiplier` |
| Đi lại trong thị trấn | `TOWN_FEEL.walkSpeed`, `interactRange` |
| Gió, tích xa, tích màn bắt đầu | `AMBIENCE_FEEL.windLevel`, `distantGain`, `townTickBpm`, `titleTickBpm` |
| Màn kết: trôi bao lâu, chữ hiện khi nào | `ENDING_FEEL.driftSeconds`, `closingLineAfterSeconds`, `confirmAfterSeconds` |
| Font | `public/assets/fonts/`, `FONT_FAMILY` trong `core/config.ts` |

## Nên thử theo thứ tự

1. Mở game, bấm phím: nghe một tiếng tích mỗi giây. Chọn Bắt đầu: cảnh mở (tích tắc dừng hẳn ở dòng 2), ra tiệm, đọc tờ giấy trên bàn.
2. Đi ra, tới bác Hòa: hội thoại → trận 3 lượt (nhịp dồn) → cảnh kết (chuông đổ, mờ) → thị trấn sáng đèn cửa sổ.
3. Thử thua cố ý (đứng yên ở r1): màn bánh răng nứt không chữ, rồi chơi lại đúng pha vừa thua.
4. Đóng tab giữa chừng rồi mở lại, chọn Tiếp tục: đứng cạnh cư dân vừa giải thoát.
5. Chạy tới màn kết bằng `?jump=ending` để xem cuối trước (không xóa bản lưu thật).
