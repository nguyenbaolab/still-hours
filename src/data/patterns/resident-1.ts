import type { BulletEvent, Pattern, PatternEvent, Side } from "../pattern-types";

/**
 * Bác Hòa, người lỡ hẹn với gia đình (cư dân 1): tích tắc dồn dập, nhưng là cư dân ĐẦU nên phải thắng được dễ. Không có
 * cơ chế riêng nào khác; cái khó là nhịp dồn, và nhịp dồn dần trong lượt (sự kiện `tempo` ở beat 0). `straight` thành chuỗi
 * xen hai bên, `aimed` thưa; lượt 3 thêm hai `sweep` (kim đồng hồ). `finish: length`: hai beat cuối để trống.
 *
 * Cân bằng lại ở nhiệm vụ gameplay-balance-v2 (số cũ trong ngoặc; bảng đầy đủ ở docs/balance.md): BPM thấp hơn
 * (120→144 thành 96→112 ...), chuỗi `straight` cách 2 beat thay vì mỗi beat, `aimed` thưa hơn, tăng dần qua ba lượt để
 * cư dân sau có chỗ khó hơn. Đạn trừ máu mỗi giây: 0,9 / 1,4 / 2,1 (trước: 3,5 / 4,3 / 5,0). Cư dân 1 cũng có nhiều máu nhất
 * (`r1.ts`: 36).
 *
 *  Lượt 1:  96 → 112 BPM, 48 beat (~28 giây)    (120 → 144, 60 beat)
 *  Lượt 2: 104 → 122 BPM, 52 beat (~27 giây)    (132 → 160, 64 beat)
 *  Lượt 3: 112 → 132 BPM, 56 beat (~27 giây)    (144 → 176, 68 beat)
 */

/** Một viên cứ `step` beat, xen trái/phải, vị trí dọc cạnh đổi theo chu kỳ. */
function chain(firstBeat: number, lastBeat: number, step: number): BulletEvent[] {
  const sides: readonly Side[] = ["left", "right"];
  const at = [0.3, 0.7, 0.5, 0.2, 0.8, 0.4, 0.6];
  const events: BulletEvent[] = [];
  for (let beat = firstBeat, i = 0; beat <= lastBeat; beat += step, i++) {
    events.push({ beat, type: "straight", from: sides[i % 2] as Side, at: at[i % at.length] as number });
  }
  return events;
}

/** `count` viên nhắm vào người chơi cứ `every` beat, đổi cạnh nguồn. */
function aimedEvery(firstBeat: number, lastBeat: number, every: number, count: number, spreadDeg: number): BulletEvent[] {
  const sources: readonly Side[] = ["top", "right", "bottom", "left"];
  const events: BulletEvent[] = [];
  for (let beat = firstBeat, i = 0; beat <= lastBeat; beat += every, i++) {
    events.push({ beat, type: "aimed", from: sources[i % sources.length] as Side, at: 0.5, count, spreadDeg });
  }
  return events;
}

/** Thêm một viên ở nửa beat sau, xen trên/dưới, cứ `every` beat: cho nhịp dồn hơn lượt trước. */
function offbeats(firstBeat: number, lastBeat: number, every: number): BulletEvent[] {
  const events: BulletEvent[] = [];
  for (let beat = firstBeat, i = 0; beat <= lastBeat; beat += every, i++) {
    events.push({ beat: beat + 0.5, type: "straight", from: i % 2 === 0 ? "top" : "bottom", at: 0.5 });
  }
  return events;
}

// Lượt 1: chuỗi thưa (cứ 2 beat một viên), một viên nhắm cứ 8 beat. 8 beat đầu để nghe nhịp.
const round1Events: PatternEvent[] = [
  { beat: 0, type: "tempo", bpm: 112, overBeats: 32 },
  ...chain(4, 43, 2),
  ...aimedEvery(8, 40, 8, 1, 0),
];

// Lượt 2: chuỗi cứ 2 beat từ beat 3 (lệch nhịp với lượt 1), thêm vài viên giữa nhịp, aimed đôi cứ 8 beat.
const round2Events: PatternEvent[] = [
  { beat: 0, type: "tempo", bpm: 122, overBeats: 32 },
  ...chain(3, 47, 2),
  ...offbeats(6, 46, 8),
  ...aimedEvery(8, 48, 8, 2, 18),
];

// Lượt 3: thêm viên giữa nhịp dày hơn, aimed đôi, và hai kim quét (30 độ mỗi beat, như thiết kế).
const round3Events: PatternEvent[] = [
  { beat: 0, type: "tempo", bpm: 132, overBeats: 32 },
  ...chain(3, 51, 2),
  ...offbeats(6, 50, 4),
  ...aimedEvery(8, 52, 8, 2, 20),
  { beat: 18, type: "sweep", x: 0.5, y: 0.5, length: 70, startAngleDeg: -90, degreesPerBeat: 30, durationBeats: 8 },
  { beat: 38, type: "sweep", x: 0.5, y: 0.5, length: 70, startAngleDeg: 90, degreesPerBeat: 30, durationBeats: 8 },
];

export const R1_ROUNDS: readonly [Pattern, Pattern, Pattern] = [
  { name: "Bác Hòa: lượt 1", bpm: 96, lengthBeats: 48, loop: false, finish: { kind: "length" }, events: round1Events },
  { name: "Bác Hòa: lượt 2", bpm: 104, lengthBeats: 52, loop: false, finish: { kind: "length" }, events: round2Events },
  { name: "Bác Hòa: lượt 3", bpm: 112, lengthBeats: 56, loop: false, finish: { kind: "length" }, events: round3Events },
];
