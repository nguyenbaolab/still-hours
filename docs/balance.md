# Cân bằng độ khó (gameplay-balance-v2)

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
| Gợi ý riêng (bút, đứng yên, khe cửa, chữ, thường) | dưới màn, pha né | sau 2 lần thua cùng lượt (`hintAfterLosses`) |
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
