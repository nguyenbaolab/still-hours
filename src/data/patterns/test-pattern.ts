import type { Pattern } from "../pattern-types";

/**
 * PATTERN THỬ để cảm nhận nhịp (bước 2). Dài 60 beat ≈ 31 giây, lặp lại mãi. Dùng đủ bốn loại đạn.
 * Muốn chỉnh/viết pattern mới: sửa danh sách `events` bên dưới (định dạng: xem ../pattern-types.ts).
 * Cách đọc nhanh: `beat` là lúc đạn xuất hiện; `from`/`at` là cạnh và vị trí dọc cạnh (0..1).
 *
 *  Beat   0–24   100 BPM  làm quen nhịp: đạn đơn, hàng đạn, đạn nhắm, đạn lớn, vòng tròn, kim đồng hồ
 *  Beat  24–40   100→160  tempo TĂNG DẦN: đạn dồn theo nhịp, quạt, hai kim quay nhanh
 *  Beat  40–48   160      nhịp dồn dập: đạn lên xuống mỗi nửa beat
 *  Beat  48–56   160→100  tempo GIẢM DẦN, thưa dần, kết bằng vòng tròn lớn
 *  Beat  56–60   100      kim đồng hồ chậm rồi nghỉ, sang vòng mới
 */
export const TEST_PATTERN: Pattern = {
  name: "Pattern thử (bước 2)",
  bpm: 100,
  lengthBeats: 60,
  loop: true,
  events: [
    // ── 0–24: 100 BPM ────────────────────────────────────────────────
    // Bốn viên đơn, mỗi beat một viên: nghe nhịp và thấy đạn trùng tiếng "tích tắc".
    { beat: 4, type: "straight", from: "right", at: 0.5 },
    { beat: 5, type: "straight", from: "right", at: 0.25 },
    { beat: 6, type: "straight", from: "right", at: 0.75 },
    { beat: 7, type: "straight", from: "left", at: 0.5 },

    // Hàng 3 viên từ bên trái (khe hở giữa các viên đủ rộng để lách qua).
    { beat: 8, type: "straight", from: "left", at: 0.15, count: 3, spacing: 0.35 },
    // Hai viên rơi từ trên và bay lên từ dưới.
    { beat: 10, type: "straight", from: "top", at: 0.3 },
    { beat: 10, type: "straight", from: "bottom", at: 0.7 },

    // Ba viên nhắm vào người chơi, mỗi beat một viên từ một phía.
    { beat: 12, type: "aimed", from: "right", at: 0.5 },
    { beat: 13, type: "aimed", from: "top", at: 0.25 },
    { beat: 14, type: "aimed", from: "left", at: 0.75 },

    // Đạn LỚN chậm (radius >= 8 nên tự có cảnh báo trước 1 beat ở mép khung).
    { beat: 16, type: "straight", from: "right", at: 0.5, radius: 12, speed: 110 },

    // Vòng tròn 12 viên tỏa từ giữa khung (luôn có cảnh báo: vòng nhấp nháy ở tâm).
    { beat: 18, type: "burst", x: 0.5, y: 0.5, count: 12, speed: 120 },

    // Kim đồng hồ: một kim quay 45°/beat, đủ một vòng trong 8 beat. Cảnh báo vạch đường kim bắt đầu.
    { beat: 20, type: "sweep", x: 0.5, y: 0.5, length: 80, startAngleDeg: -90, degreesPerBeat: 45, durationBeats: 8 },
    { beat: 22, type: "straight", from: "right", at: 0.2, count: 3, spacing: 0.3 },

    // ── 24–40: tempo tăng dần 100 → 160 BPM trong 16 beat ────────────
    { beat: 24, type: "tempo", bpm: 160, overBeats: 16 },
    // Mỗi beat một viên, đổi bên liên tục: càng về sau càng dồn vì beat ngắn dần.
    { beat: 24, type: "straight", from: "left", at: 0.3 },
    { beat: 25, type: "straight", from: "right", at: 0.7 },
    { beat: 26, type: "straight", from: "left", at: 0.6 },
    { beat: 27, type: "straight", from: "right", at: 0.4 },
    { beat: 28, type: "straight", from: "left", at: 0.2 },
    { beat: 29, type: "straight", from: "right", at: 0.8 },
    // Quạt 5 viên từ mép trái bắn sang phải (có cảnh báo: vòng ở nguồn và hai vạch rìa quạt).
    { beat: 30, type: "burst", x: 0.03, y: 0.5, count: 5, angleDeg: 0, arcDeg: 70, speed: 140 },
    { beat: 31, type: "straight", from: "right", at: 0.5 },
    { beat: 32, type: "straight", from: "left", at: 0.5 },
    { beat: 33, type: "aimed", from: "right", at: 0.5, count: 3, spreadDeg: 18 },
    { beat: 34, type: "straight", from: "left", at: 0.35 },
    { beat: 35, type: "straight", from: "right", at: 0.65 },
    // Hai kim đối nhau quay 60°/beat: kim quay theo BEAT nên lúc tempo đang tăng, kim cũng quay nhanh dần.
    { beat: 36, type: "sweep", x: 0.5, y: 0.5, length: 80, startAngleDeg: 0, degreesPerBeat: 60, durationBeats: 6, hands: 2 },
    { beat: 37, type: "straight", from: "left", at: 0.15 },
    { beat: 38, type: "straight", from: "right", at: 0.85 },
    { beat: 39, type: "straight", from: "left", at: 0.85 },

    // ── 40–48: 160 BPM, dồn dập: đạn lên xuống xen kẽ mỗi NỬA beat, quét dần từ trái sang phải rồi ngược lại ──
    { beat: 40, type: "straight", from: "top", at: 0.1 },
    { beat: 40.5, type: "straight", from: "bottom", at: 0.2 },
    { beat: 41, type: "straight", from: "top", at: 0.3 },
    { beat: 41.5, type: "straight", from: "bottom", at: 0.4 },
    { beat: 42, type: "straight", from: "top", at: 0.5 },
    { beat: 42.5, type: "straight", from: "bottom", at: 0.6 },
    { beat: 43, type: "straight", from: "top", at: 0.7 },
    { beat: 43.5, type: "straight", from: "bottom", at: 0.8 },
    { beat: 44, type: "straight", from: "top", at: 0.9 },
    { beat: 44.5, type: "straight", from: "bottom", at: 0.8 },
    { beat: 45, type: "straight", from: "top", at: 0.7 },
    { beat: 45.5, type: "straight", from: "bottom", at: 0.6 },
    { beat: 46, type: "aimed", from: "right", at: 0.5, count: 5, spreadDeg: 14 },
    { beat: 46.5, type: "straight", from: "top", at: 0.4 },
    { beat: 47, type: "straight", from: "bottom", at: 0.3 },
    { beat: 47.5, type: "straight", from: "top", at: 0.2 },

    // ── 48–56: tempo giảm dần 160 → 100 BPM trong 8 beat, thưa dần ───
    { beat: 48, type: "tempo", bpm: 100, overBeats: 8 },
    { beat: 48, type: "straight", from: "left", at: 0.15, count: 3, spacing: 0.35 },
    { beat: 50, type: "aimed", from: "top", at: 0.5 },
    { beat: 52, type: "aimed", from: "right", at: 0.5 },
    // Vòng lớn 16 viên kết đoạn.
    { beat: 54, type: "burst", x: 0.5, y: 0.5, count: 16, speed: 110 },

    // ── 56–60: 100 BPM, một kim chậm 30°/beat rồi nghỉ ──────────────
    { beat: 56, type: "sweep", x: 0.5, y: 0.5, length: 80, startAngleDeg: 90, degreesPerBeat: 30, durationBeats: 4 },
  ],
};
