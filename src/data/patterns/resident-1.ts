import type { BulletEvent, Pattern, PatternEvent, Side } from "../pattern-types";

/**
 * Bác Hòa, người lỡ hẹn với gia đình (cư dân 1): tích tắc dồn dập. Không có cơ chế riêng nào khác; cái khó là nhịp dồn.
 * BPM cao và tăng dần trong 32 beat đầu của mỗi lượt (sự kiện `tempo` ở beat 0), `straight` thành chuỗi mỗi beat xen hai
 * bên, `aimed` 3 viên mỗi 4 beat; lượt 3 thêm hai `sweep` (kim đồng hồ). `finish: length`: hai beat cuối để trống.
 *
 *  Lượt 1: 120 → 144 BPM, 60 beat (~26 giây)
 *  Lượt 2: 132 → 160 BPM, 64 beat (~25 giây)
 *  Lượt 3: 144 → 176 BPM, 68 beat (~24 giây)
 */

/** Một viên mỗi beat, xen trái/phải, vị trí dọc cạnh đổi theo chu kỳ. */
function chain(firstBeat: number, lastBeat: number): BulletEvent[] {
  const sides: readonly Side[] = ["left", "right"];
  const at = [0.3, 0.7, 0.5, 0.2, 0.8, 0.4, 0.6];
  const events: BulletEvent[] = [];
  for (let beat = firstBeat; beat <= lastBeat; beat++) {
    const i = beat - firstBeat;
    events.push({ beat, type: "straight", from: sides[i % 2] as Side, at: at[i % at.length] as number });
  }
  return events;
}

/** Ba viên nhắm vào người chơi mỗi 4 beat, đổi cạnh nguồn. */
function aimedEvery4(firstBeat: number, lastBeat: number, spreadDeg: number): BulletEvent[] {
  const sources: readonly Side[] = ["top", "right", "bottom", "left"];
  const events: BulletEvent[] = [];
  for (let beat = firstBeat; beat <= lastBeat; beat += 4) {
    const from = sources[((beat - firstBeat) / 4) % sources.length] as Side;
    events.push({ beat, type: "aimed", from, at: 0.5, count: 3, spreadDeg });
  }
  return events;
}

/** Thêm một viên ở nửa beat sau, xen trên/dưới, mỗi 8 beat: cho nhịp dồn hơn lượt trước. */
function offbeats(firstBeat: number, lastBeat: number): BulletEvent[] {
  const events: BulletEvent[] = [];
  for (let beat = firstBeat; beat <= lastBeat; beat += 8) {
    events.push({ beat: beat + 0.5, type: "straight", from: beat % 16 === firstBeat % 16 ? "top" : "bottom", at: 0.5 });
  }
  return events;
}

const round1Events: PatternEvent[] = [
  { beat: 0, type: "tempo", bpm: 144, overBeats: 32 },
  ...chain(4, 57),
  ...aimedEvery4(8, 56, 18),
];

const round2Events: PatternEvent[] = [
  { beat: 0, type: "tempo", bpm: 160, overBeats: 32 },
  ...chain(3, 61),
  ...offbeats(6, 54),
  ...aimedEvery4(8, 60, 20),
];

const round3Events: PatternEvent[] = [
  { beat: 0, type: "tempo", bpm: 176, overBeats: 32 },
  ...chain(3, 65),
  ...offbeats(6, 62),
  ...aimedEvery4(8, 64, 22),
  { beat: 20, type: "sweep", x: 0.5, y: 0.5, length: 70, startAngleDeg: -90, degreesPerBeat: 30, durationBeats: 8 },
  { beat: 44, type: "sweep", x: 0.5, y: 0.5, length: 70, startAngleDeg: 90, degreesPerBeat: 30, durationBeats: 8 },
];

export const R1_ROUNDS: readonly [Pattern, Pattern, Pattern] = [
  { name: "Bác Hòa: lượt 1", bpm: 120, lengthBeats: 60, loop: false, finish: { kind: "length" }, events: round1Events },
  { name: "Bác Hòa: lượt 2", bpm: 132, lengthBeats: 64, loop: false, finish: { kind: "length" }, events: round2Events },
  { name: "Bác Hòa: lượt 3", bpm: 144, lengthBeats: 68, loop: false, finish: { kind: "length" }, events: round3Events },
];
