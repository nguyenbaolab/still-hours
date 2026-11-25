# Cân bằng độ khó (gameplay-balance-v2)

> **Hai đợt.** Đợt 1 (commit `721782d`) làm cư dân 1 dễ hơn cư dân sau, nhưng chủ dự án chơi thử vẫn thấy quá khó. **Đợt 2** (mục cuối
> file này, "Đợt 2") hạ thêm cư dân 1 và làm mềm cư dân 2. Các bảng ngay dưới là của đợt 1; số hiện hành ở mục "Đợt 2".

Vấn đề: game quá khó, và người chơi không biết bao giờ mới thắng. Số đo "trước" là của commit `cff009e`.

## Phát hiện

Cư dân 1 (người chơi gặp đầu tiên) là cư dân **khó nhất về mật độ đạn**: 3,5 – 5,0 đạn trừ máu mỗi giây kịch bản, so với 0,6 – 2,3 của
cư dân 2, 3, 4. Thứ tự độ khó bị ngược. Mọi cư dân đều có 20 máu (5 lần trúng).

## Bảng trước / sau

Đạn/giây = số viên đạn trừ máu (kim đồng hồ tính 3) chia thời gian kịch bản của lượt. "Áp lực" = đạn/giây chia số lần trúng chịu được
(máu / 4). `Đỉnh 4s` = nhiều nhất trong một cửa sổ 4 giây. Cư dân 2 – 4 và boss lượt 2, 3 **không đổi pattern**, chỉ đổi máu.

| Lượt | Máu trước → sau (lần trúng) | BPM trước | BPM sau | Giây | Đạn/giây trước | Đạn/giây sau | Đỉnh 4s trước → sau | Áp lực trước → sau |
| ---- | --------------------------- | --------- | ------- | ---- | -------------- | ------------ | ------------------- | ------------------ |
| r1.1 | 20 → **36** (5 → 9) | 120→144 | **96→112** | 26,3 → 27,1 | 3,54 | **0,92** | 19 → 5 | 0,71 → 0,10 |
| r1.2 | 20 → **36** | 132→160 | **104→122** | 25,2 → 26,9 | 4,29 | **1,53** | 22 → 9 | 0,86 → 0,17 |
| r1.3 | 20 → **36** | 144→176 | **112→132** | 24,3 → 26,7 | 5,02 | **2,06** | 26 → 13 | 1,00 → 0,23 |
| r2.1 | 20 → **32** (8) | 100 | 100 | 31,2 | 0,93 | 0,93 | 5 | 0,19 → 0,12 |
| r2.2 | 20 → **32** | 100 | 100 | 33,6 | 1,64 | 1,64 | 8 | 0,33 → 0,21 |
| r2.3 | 20 → **32** | 100 | 100 | 36,0 | 2,25 | 2,25 | 11 | 0,45 → 0,28 |
| r3.1 | 20 → **28** (7) | 100 | 100 | 28,8 | 0,59 | 0,59 | 3 | 0,12 → 0,08 |
| r3.2 | 20 → **28** | 100 | 100 | 31,2 | 0,77 | 0,77 | 4 | 0,15 → 0,11 |
| r3.3 | 20 → **28** | 100 | 100 | 33,6 | 0,95 | 0,95 | 5 | 0,19 → 0,14 |
| r4.1 | 20 → **24** (6) | 100 | 100 | 19,2 / vòng | 1,20 | 1,20 | 13 | 0,24 → 0,20 |
| r4.2 | 20 → **24** | 104 | 104 | 18,5 / vòng | 1,52 | 1,52 | 13 | 0,30 → 0,25 |
| r4.3 | 20 → **24** | 108 | 108 | 17,8 / vòng | 1,52 | 1,52 | 12 | 0,30 → 0,25 |
| boss.1 | 20 → 20 (5) | 120→150 | **116→140** | 14,3 → 15,0 / vòng | 3,50 | **2,39** | 19 → 14 | 0,70 → 0,48 |
| boss.2 | 20 → 20 | 100 | 100 | 19,2 / vòng | 0,89 | 0,89 | 5 | 0,18 |
| boss.3 | 20 → 20 | 100 | 100 | 19,2 / vòng | 0,73 | 0,73 | 4 | 0,15 |

Áp lực trung bình mỗi cư dân (đạn thuần; cư dân 3 khó ở chỗ khác: chữ làm chậm nhịp, nên đạn thưa):

| | r1 | r2 | r3 | r4 | boss |
| - | -- | -- | -- | -- | ---- |
| Trước | 0,86 | 0,32 | 0,15 | 0,28 | 0,34 |
| Sau | **0,17** | 0,20 | 0,11 | 0,24 | 0,27 |

Trước: r1 là cư dân khó nhất. Sau: r1 dễ nhất, tăng dần 1 → 2 → 4 → boss (test `src/testing/difficulty.test.ts` giữ thứ tự này).

### Số cụ thể đã đổi

| Chỗ | Trước | Sau |
| --- | ----- | --- |
| `ResidentData.hp` (mới, `src/data/residents/*.ts`; bỏ trống = `PLAYER_FEEL.maxHp` 20) | 20 cho mọi người | r1 36, r2 32, r3 28, r4 24, boss 20 (bội số của sát thương mặc định 4) |
| `resident-1.ts`: BPM, độ dài | 120→144 / 60 beat; 132→160 / 64; 144→176 / 68 | 96→112 / 48 beat; 104→122 / 52; 112→132 / 56 |
| `resident-1.ts`: chuỗi `straight` | mỗi beat | cứ 2 beat; lượt 1 không có thêm viên giữa nhịp |
| `resident-1.ts`: `aimed` | 3 viên mỗi 4 beat | lượt 1: 1 viên mỗi 8 beat; lượt 2, 3: 2 viên mỗi 8 beat |
| `resident-1.ts`: viên giữa nhịp (`offbeats`) | mỗi 8 beat (lượt 2, 3) | mỗi 8 beat (lượt 2), mỗi 4 beat (lượt 3) |
| `boss.ts` lượt 1 | 120→150 BPM, `straight` mỗi beat | 116→140 BPM, `straight` cứ 2 beat |

Không đổi: `PLAYER_FEEL` (tốc độ 180, bất tử 1 giây, `maxHp` 20 là mặc định), `BULLET_FEEL` (sát thương 4, tốc độ 140), `PACE_FEEL`,
`DRAW_FEEL`, pattern của r2, r3, r4 và boss lượt 2, 3, pha tháo (`DISASSEMBLY_FEEL`).

### Bot phản xạ chậm (cận dưới của người thật)

`DodgerBot` hoàn hảo thắng mọi lượt cả trước lẫn sau, nên không đo được "khó". `src/testing/difficulty.ts` (`humanLosses`) chạy
`DodgePhase` thật với bot chỉ được quyết định thưa: `rt20` ≈ quyết định mỗi 0,67 giây, `rt30` ≈ mỗi 1 giây. Số lần thua trung bình
trước khi thắng (6 hạt giống jitter khác nhau, tối đa 10 lần thử):

| Lượt | Trước, rt20 | Sau, rt20 | Trước, rt30 | Sau, rt30 |
| ---- | ----------- | --------- | ----------- | --------- |
| r1.1 | 1,7 | **0** | 6,7 | **0** |
| r1.2 | 3,3 | **0** | 6,7 | **1,7** |
| r1.3 | 3,3 | **0** | 10,0 (cạn lượt thử) | **0** |

Với cùng bot, cư dân 2 và 3 (máu mới 32 / 28) thua 0 lần ở mọi lượt, kể cả rt30. Đây là **bot**: người thật bấm kém hơn và nhìn
cảnh báo kém hơn; số thật chỉ biết sau khi chủ dự án chơi.

## Tiến độ, sao, gợi ý

Mọi con số ở `src/data/hud-feel.ts` (`HUD_FEEL`, `HUD_LAYOUT`, `HINTS`).

| Cái gì | Ở đâu | Số |
| ------ | ----- | -- |
| Thanh tiến độ của pha hiện tại | hàng trên cùng, x 120..520, y 20 | cả pha né và pha tháo; vạch ở 25 / 50 / 75%; vàng sáng từ 75% |
| "Lượt n/3" và 3 nhóm sao (mỗi lượt một nhóm) | hàng trên cùng | sao hiện khi thắng pha né của lượt |
| Sao của lượt | theo máu còn lại lúc thắng | ≥ 75% máu: 3 sao; ≥ 40%: 2; còn lại 1 (`stars.three`, `stars.two`) |
| Bảng "Xong lượt n" + sao | dưới màn, 3 giây đầu pha tháo ngay sau đó | `starsBannerSeconds` 3 |
| Tổng kết sao cuối trận | giữa màn, trên hội thoại khép trận | "n/9 sao" |
| Gợi ý riêng (đứng yên, khe cửa, chữ, thường; **không có cho Linh**, đợt 2) | dưới màn, pha né | sau 2 lần thua cùng lượt (`hintAfterLosses`) |
| Gợi ý chung (Shift) | dòng thứ hai | sau 4 lần thua (`generalHintAfterLosses`) |
| Gợi ý pha tháo theo bộ phận đang chọn | dưới màn | sau 12 giây không tiến bộ (`idleSeconds`) |

Không vẽ gì ở góc trên-trái (x < 120, y < 96): vùng dành cho nhân vật hướng dẫn (`GUIDE_ZONE`, có test).
Số lần thua **không hiện ở đâu** (CLAUDE.md, mục "Thua"): chỉ dùng để chọn gợi ý và phát sự kiện `stuck`.

## Chỗ không chắc

- Toàn bộ "dễ" ở trên là đo bằng bot; chưa có người thật chơi. r1 lượt 3 (2,06 đạn/giây, hai kim quét) có thể vẫn hơi gắt với người
  mới hoàn toàn: nếu vậy chỉnh `offbeats(6, 50, 4)` (thưa hơn) hoặc bỏ một `sweep` ở `resident-1.ts`.
- r4 (Linh) và boss lượt 2, 3 không đổi pattern; "khó" của họ nằm ở cơ chế (bút, đứng yên, khe cửa), mà bot không đo được.
  Chỉ máu của r4 tăng từ 20 lên 24.
- CLAUDE.md còn ghi số cũ (r1 120→144..., máu 20 cho mọi người): chưa sửa vì ngoài phạm vi nhiệm vụ này (xem báo cáo, "Cần task nối").
- Sao tính theo máu của **lần thắng**, không phạt số lần thua trước đó. Muốn thưởng cho ai không thua lần nào: thêm ràng buộc ở
  `BattleScene.watchOutcome` (có sẵn `this.losses`).

## Đợt 2: cư dân 1 là màn làm quen

Phản hồi sau khi chơi thử: r1 vẫn quá khó. Mục tiêu: người chơi mới thắng r1 ngay lần đầu mà không cần biết luật; r2 là bước
chuyển hợp lý. Tiêu chí đo được: bot **kém** thắng cả ba lượt r1 ngay lần đầu ít nhất 9/10 lần.

### Bot kém (`src/testing/difficulty.ts`, `firstTryTrials`)

`DodgerBot` (nhìn cảnh báo, tính quỹ đạo đạn chính xác) bị làm kém theo hai cách:

1. **Phản xạ chậm:** chỉ được ra quyết định mỗi ~1 giây (`reactionTicks` 30; bot quyết định cách một lần gọi), giữa hai quyết định giữ nguyên phím.
2. **Hay đi sai:** mỗi quyết định có 50% xác suất bị thay bằng một hướng bấm bừa (8 hướng hoặc đứng yên), giữ tới quyết định sau.

Một lần thử = ba lượt r1 liên tiếp, mỗi lượt chỉ được chơi MỘT lần (thua là hỏng lần thử). Bot vẫn nhìn thấy cảnh báo và tính quỹ đạo
đúng lúc nó quyết định, nên vẫn là cận dưới của người thật; số thật chỉ biết khi chủ dự án chơi.

| Cấu hình | r1 gốc (cff009e) | r1 đợt 1 (721782d) | **r1 nay** | r2 gốc | r2 đợt 1 | **r2 nay** |
| -------- | ---------------- | ------------------ | ---------- | ------ | -------- | ---------- |
| Máu (lần trúng) | 20 (5) | 36 (9) | **40 (10)** | 20 (5) | 32 (8) | 32 (8) |
| Thắng ngay lần đầu, bot kém (phản xạ 1 s, 50% bấm bừa), 10 lần thử | 0/10 | 7/10 | **10/10** | 1/10 | 7/10 | **10/10** |
| Cùng cấu hình, 30 lần thử | 0/30 | 25/30 | **30/30** | 4/30 | 23/30 | **30/30** |
| Bot rất kém (phản xạ 1,5 s, 60% bấm bừa), 30 lần thử | 0/30 | 29/30 | **30/30** | 7/30 | 25/30 | **29/30** |
| Trúng đạn trung bình mỗi ba lượt (bot kém) | 14,9 | 13,8 | **10,7** | 10,6 | 11,7 | **10,2** |

### Thông số r1

| | Gốc | Đợt 1 | **Nay** |
| - | --- | ----- | ------- |
| Máu | 20 | 36 | **40** |
| Hitbox người chơi (`ResidentData.player.hitboxSize`) | 10 | 10 | **8** |
| Bất tử sau khi trúng (`player.invincibleSeconds`) | 1,0 s | 1,0 s | **1,6 s** |
| Tốc độ đạn thẳng / nhắm (`R1_BULLET_SPEED`) | 140 | 140 | **100** |
| BPM lượt 1 | 120→144 | 96→112 | **88→98** |
| BPM lượt 2 | 132→160 | 104→122 | **94→106** |
| BPM lượt 3 | 144→176 | 112→132 | **100→114** |
| Độ dài (beat) lượt 1 / 2 / 3 | 60 / 64 / 68 | 48 / 52 / 56 | **44 / 46 / 50** |
| Giây kịch bản lượt 1 / 2 / 3 | 26,3 / 25,2 / 24,3 | 27,1 / 26,9 / 26,7 | **28,0 / 27,1 / 27,4** |
| Đạn trừ máu / giây, lượt 1 / 2 / 3 | 3,54 / 4,29 / 5,02 | 0,92 / 1,53 / 2,06 | **0,79 / 1,11 / 1,46** |
| Đỉnh trong 4 giây, lượt 1 / 2 / 3 | 19 / 22 / 26 | 5 / 9 / 13 | **5 / 6 / 10** |
| `aimed` | 3 viên mỗi 4 beat | 1 / 2 / 2 viên mỗi 8 beat | **1 / 1 / 2 viên mỗi 8 beat** |
| `sweep` (kim quét) lượt 3 | 2 | 2 | **1** |
| Áp lực (đạn/giây ÷ lần trúng chịu được) TB | 0,86 | 0,17 | **0,11** |

### Thông số r2

Chỉ làm mềm vừa đủ để từ r1 sang r2 không nhảy vọt; cơ chế "đứng yên" vẫn là thứ mới phải học. Cảm giác người chơi của r2 là mặc định
(hitbox 10, bất tử 1,0 s).

| | Gốc | Đợt 1 | **Nay** |
| - | --- | ----- | ------- |
| Máu | 20 | 32 | 32 |
| Đạn trừ máu / giây, lượt 1 / 2 / 3 | 0,93 / 1,64 / 2,25 | 0,93 / 1,64 / 2,25 | 0,93 / **1,28 / 1,67** |
| Số đạn lượt 1 / 2 / 3 | 29 / 55 / 81 | 29 / 55 / 81 | 29 / **43 / 60** |
| Đỉnh trong 4 giây lượt 1 / 2 / 3 | 5 / 8 / 11 | 5 / 8 / 11 | 5 / **7 / 8** |
| Lượt 2 | chuỗi mỗi beat | chuỗi mỗi beat | bỏ mỗi viên thứ tư |
| Lượt 3 | chuỗi mỗi beat + viên đôi mỗi 4, `aimed` 2 viên | như gốc | chuỗi mỗi beat, bỏ viên đôi, `aimed` 1 viên |
| Áp lực TB | 0,32 | 0,20 | 0,16 |

Đường cong áp lực trung bình (đạn thuần): r1 0,11 → r2 0,16 → r4 0,24 → boss 0,27 (test `src/testing/difficulty.test.ts` giữ thứ tự này).

### Vì sao chọn các đòn bẩy này

- **Đạn chậm hơn (140 → 100) và thưa hơn:** người mới chưa biết luật nên cần thời gian nhìn và quyết định; đạn chậm tăng thời gian phản ứng thêm
  40% mà không đổi hình dạng pattern. Đây là đòn bẩy mạnh nhất với người phản xạ chậm.
- **Hitbox 8, bất tử 1,6 s, 40 máu:** mỗi lần trúng bớt đau và không bị trúng liên tiếp (bất tử lâu hơn). Chỉ áp cho r1 (`ResidentData.player`):
  từ r2 về mặc định để mức khó "thật" của game giữ nguyên.
- **Không làm r1 không thể thua:** thắng là có nghĩa nhờ có thể thua; bot kém thắng 30/30 mà không cần miễn thua. Nếu chủ dự án vẫn thấy khó,
  bước tiếp theo hợp lý là máu không xuống dưới 1 ở r1 (một dòng ở `DodgePhase`), nhưng sao theo máu sẽ mất ý nghĩa ở r1.
- **Pha tháo r1:** không cần đổi. Đồng hồ quả quýt đã `rhythmic: false` (không có cửa sổ nhịp để bấm trượt) và `lift` chỉ giữ Z 2 beat ở 60 BPM.

### Bỏ gợi ý chữ của Linh

`HINTS.dodge.pencil` ("Chạm vào cây bút để cầm...") đã xóa. Pha có bút giờ **không có gợi ý chữ nào** (cả dòng chung về Shift): `dodgeHintKind`
trả `null`, `dodgeHints` trả mảng rỗng. Sự kiện `stuck` (thua nhiều lần) vẫn phát như cũ; nhân vật hướng dẫn nói thay ở đợt sau.
