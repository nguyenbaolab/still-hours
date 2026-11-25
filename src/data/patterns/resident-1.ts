import type { BulletEvent, Pattern, PatternEvent, Side } from "../pattern-types";

/**
 * Bác Hòa, người lỡ hẹn với gia đình (cư dân 1): tích tắc dồn dập, nhưng là cư dân ĐẦU và là màn làm quen: người chơi mới, chưa
 * biết luật, phải thắng được ngay lần đầu. Không có cơ chế riêng nào khác; cái khó chỉ là nhịp hơi dồn, tăng nhẹ trong lượt (sự kiện
 * `tempo` ở beat 0). `straight` xen hai bên cứ 2 beat, `aimed` thưa; lượt 3 có một `sweep` (kim đồng hồ). `finish: length`: hai
 * beat cuối để trống.
 *
 * Cân bằng lại hai đợt (số gốc, rồi đợt 1, rồi hiện tại; bảng đầy đủ ở docs/balance.md): BPM 120→144 / 132→160 / 144→176, rồi
 * 96→112 / 104→122 / 112→132, nay 88→98 / 94→106 / 100→114. Đạn bay 100 px/giây thay vì 140 (`R1_BULLET_SPEED`): chậm hơn thì kịp
 * nhìn và kịp tránh. Đạn trừ máu mỗi giây: 3,5 / 4,3 / 5,0 → 0,9 / 1,5 / 2,1 → 0,8 / 1,1 / 1,4. Cư dân 1 còn có nhiều máu nhất, hitbox
 * nhỏ hơn và bất tử lâu hơn sau khi trúng (`r1.ts`).
 *
 *  Lượt 1:  88 →  98 BPM, 44 beat (~28 giây)
 *  Lượt 2:  94 → 106 BPM, 46 beat (~27 giây)
 *  Lượt 3: 100 → 114 BPM, 50 beat (~28 giây)
 */

/** Tốc độ đạn của cư dân 1 (px/giây). Mặc định của game là `BULLET_FEEL.speed` 140. */
export const R1_BULLET_SPEED = 100;

/** Một viên cứ `step` beat, xen trái/phải, vị trí dọc cạnh đổi theo chu kỳ. */
function chain(firstBeat: number, lastBeat: number, step: number): BulletEvent[] {
  const sides: readonly Side[] = ["left", "right"];
  const at = [0.3, 0.7, 0.5, 0.2, 0.8, 0.4, 0.6];
  const events: BulletEvent[] = [];
  for (let beat = firstBeat, i = 0; beat <= lastBeat; beat += step, i++) {
    events.push({ beat, type: "straight", from: sides[i % 2] as Side, at: at[i % at.length] as number, speed: R1_BULLET_SPEED });
  }
  return events;
}

/** `count` viên nhắm vào người chơi cứ `every` beat, đổi cạnh nguồn. */
function aimedEvery(firstBeat: number, lastBeat: number, every: number, count: number, spreadDeg: number): BulletEvent[] {
  const sources: readonly Side[] = ["top", "right", "bottom", "left"];
  const events: BulletEvent[] = [];
  for (let beat = firstBeat, i = 0; beat <= lastBeat; beat += every, i++) {
    events.push({ beat, type: "aimed", from: sources[i % sources.length] as Side, at: 0.5, count, spreadDeg, speed: R1_BULLET_SPEED });
  }
  return events;
}

/** Thêm một viên ở nửa beat sau, xen trên/dưới, cứ `every` beat: cho nhịp dồn hơn lượt trước. */
function offbeats(firstBeat: number, lastBeat: number, every: number): BulletEvent[] {
  const events: BulletEvent[] = [];
  for (let beat = firstBeat, i = 0; beat <= lastBeat; beat += every, i++) {
    events.push({ beat: beat + 0.5, type: "straight", from: i % 2 === 0 ? "top" : "bottom", at: 0.5, speed: R1_BULLET_SPEED });
  }
  return events;
}

// Lượt 1: chuỗi thưa (cứ 2 beat một viên), một viên nhắm cứ 8 beat. 8 beat đầu để nghe nhịp.
const round1Events: PatternEvent[] = [
  { beat: 0, type: "tempo", bpm: 98, overBeats: 32 },
  ...chain(4, 39, 2),
  ...aimedEvery(8, 36, 8, 1, 0),
];

// Lượt 2: chuỗi cứ 2 beat từ beat 3 (lệch nhịp với lượt 1), thêm vài viên giữa nhịp, một viên nhắm cứ 8 beat.
const round2Events: PatternEvent[] = [
  { beat: 0, type: "tempo", bpm: 106, overBeats: 32 },
  ...chain(3, 41, 2),
  ...offbeats(6, 40, 8),
  ...aimedEvery(8, 40, 8, 1, 0),
];

// Lượt 3: viên giữa nhịp dày hơn, nhắm đôi, và một kim quét (30 độ mỗi beat, như thiết kế).
const round3Events: PatternEvent[] = [
  { beat: 0, type: "tempo", bpm: 114, overBeats: 32 },
  ...chain(3, 45, 2),
  ...offbeats(6, 44, 8),
  ...aimedEvery(8, 44, 8, 2, 20),
  { beat: 24, type: "sweep", x: 0.5, y: 0.5, length: 70, startAngleDeg: -90, degreesPerBeat: 30, durationBeats: 8 },
];

export const R1_ROUNDS: readonly [Pattern, Pattern, Pattern] = [
  { name: "Bác Hòa: lượt 1", bpm: 88, lengthBeats: 44, loop: false, finish: { kind: "length" }, events: round1Events },
  { name: "Bác Hòa: lượt 2", bpm: 94, lengthBeats: 46, loop: false, finish: { kind: "length" }, events: round2Events },
  { name: "Bác Hòa: lượt 3", bpm: 100, lengthBeats: 50, loop: false, finish: { kind: "length" }, events: round3Events },
];
