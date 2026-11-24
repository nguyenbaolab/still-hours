import type { BulletEvent, Pattern, Side } from "../pattern-types";

/**
 * Chú Minh, người cả đời chưa ngẩng đầu nhìn quanh (cư dân 2): đứng yên thì thế giới hiện ra. Đứng yên đủ
 * `STILL_FEEL.stillSeconds` thì nhịp chậm lại (0,75) và cảnh nền hiện dần sau đạn; di chuyển thì tắt.
 *
 * Đạn `straight` chạy dọc các làn NGOÀI một túi an toàn quanh tâm khung (ô giữa, y và x trong 0,3..0,7), nên đứng giữa
 * khung thì không bị trúng. Cứ 8 beat có `aimed` nhắm vào người chơi, ép phải bước ra rồi mới quay lại đứng yên.
 * Lượt dài nhất khi đứng yên mãi: 1 / 0,75 ≈ 1,33 lần kịch bản. Ba lượt, 100 BPM, 52 / 56 / 60 beat, mỗi lượt một cảnh nền.
 */

/** Làn của `straight`: [cạnh, vị trí dọc cạnh]. Trái/phải: y; trên/dưới: x. Luôn ngoài khoảng 0,3..0,7. */
const LANES: readonly (readonly [Side, number])[] = [
  ["left", 0.2],
  ["right", 0.78],
  ["top", 0.2],
  ["bottom", 0.8],
  ["right", 0.25],
  ["left", 0.82],
  ["bottom", 0.25],
  ["top", 0.78],
];

function lane(beat: number, index: number): BulletEvent {
  const [from, at] = LANES[index % LANES.length] as readonly [Side, number];
  return { beat, type: "straight", from, at };
}

/** Một viên mỗi `step` beat, theo thứ tự các làn. */
function stream(firstBeat: number, lastBeat: number, step: number, doubleEvery = 0): BulletEvent[] {
  const events: BulletEvent[] = [];
  let i = 0;
  for (let beat = firstBeat; beat <= lastBeat; beat += step, i++) {
    events.push(lane(beat, i));
    if (doubleEvery > 0 && i % doubleEvery === 0) events.push(lane(beat, i + 4));
  }
  return events;
}

/** Nhắm vào người chơi mỗi 8 beat, đổi cạnh nguồn. */
function aimedEvery8(lastBeat: number, count: number, spreadDeg: number): BulletEvent[] {
  const sources: readonly Side[] = ["right", "top", "left", "bottom"];
  const events: BulletEvent[] = [];
  for (let beat = 8, i = 0; beat <= lastBeat; beat += 8, i++) {
    events.push({ beat, type: "aimed", from: sources[i % sources.length] as Side, at: 0.5, count, spreadDeg });
  }
  return events;
}

export const R2_ROUNDS: readonly [Pattern, Pattern, Pattern] = [
  {
    name: "Chú Minh: hoàng hôn",
    bpm: 100,
    lengthBeats: 52,
    loop: false,
    finish: { kind: "length" },
    still: { backdrop: "dusk" },
    events: [...stream(4, 48, 2), ...aimedEvery8(48, 1, 0)],
  },
  {
    name: "Chú Minh: mây",
    bpm: 100,
    lengthBeats: 56,
    loop: false,
    finish: { kind: "length" },
    still: { backdrop: "clouds" },
    events: [...stream(4, 52, 1), ...aimedEvery8(52, 1, 0)],
  },
  {
    name: "Chú Minh: đàn chim",
    bpm: 100,
    lengthBeats: 60,
    loop: false,
    finish: { kind: "length" },
    still: { backdrop: "birds" },
    events: [...stream(4, 56, 1, 4), ...aimedEvery8(56, 2, 16)],
  },
];