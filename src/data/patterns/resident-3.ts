import type { BulletEvent, Pattern, Side } from "../pattern-types";
import { NEGATIVE_PHRASES } from "../words";

/**
 * Pattern thử của cư dân 3: những câu tiêu cực bay qua khung. 100 BPM, 60 beat ≈ 36 giây, có lặp.
 * Câu là chỉ số trong NEGATIVE_PHRASES; câu thật viết sau.
 *
 * Chơi thử pattern này: `?jump=r3` (cư dân 3 dùng dữ liệu thật ở mốc 6.3).
 */
export const RESIDENT3_PATTERN: Pattern = {
  name: "lời tiêu cực",
  bpm: 100,
  lengthBeats: 60,
  loop: true,
  events: [
    { beat: 2, type: "word", from: "right", at: 0.5, phrase: 0 },
    { beat: 6, type: "word", from: "left", at: 0.32, phrase: 1 },
    { beat: 10, type: "word", from: "top", at: 0.5, phrase: 2 },
    { beat: 14, type: "word", from: "bottom", at: 0.62, phrase: 3 },
    { beat: 18, type: "word", from: "right", at: 0.28, phrase: 4 },
    { beat: 22, type: "word", from: "left", at: 0.7, phrase: 0 },
    { beat: 26, type: "word", from: "top", at: 0.35, phrase: 1 },
    { beat: 30, type: "word", from: "bottom", at: 0.48, phrase: 2 },
    { beat: 34, type: "word", from: "right", at: 0.58, phrase: 3 },
    { beat: 38, type: "word", from: "left", at: 0.4, phrase: 4 },
    { beat: 42, type: "word", from: "top", at: 0.72, phrase: 0 },
    { beat: 46, type: "word", from: "bottom", at: 0.3, phrase: 1 },
    { beat: 50, type: "word", from: "right", at: 0.45, phrase: 2 },
    { beat: 54, type: "word", from: "left", at: 0.66, phrase: 3 },
    { beat: 58, type: "word", from: "bottom", at: 0.52, phrase: 4 },
  ],
};

/**
 * Chị Vân, người bị lời người khác ám ảnh (cư dân 3): lời tiêu cực làm chậm nhịp. Lời không trừ máu; cái giá là thời
 * gian (ôm một câu thì hạ hệ số nhịp, `PACE_FEEL`). Mỗi lượt cũng có đạn thường trừ máu (`straight`, `aimed`) khoảng mỗi
 * 4 beat, thưa hơn chữ (chữ mỗi 3 beat), nên đôi khi phải chọn giữa né chữ và né đạn. Có mặt đồng hồ trễ (`lagClock`).
 * Ba lượt, 100 BPM, 48 / 52 / 56 beat trên tempo kịch bản; ôm hết mọi câu thì dài nhất 1 / 0,7 ≈ 1,43 lần.
 */
const WORD_SIDES: readonly Side[] = ["right", "left", "top", "bottom"];
const WORD_AT = [0.5, 0.3, 0.7, 0.4, 0.6];

/** Một câu mỗi 3 beat, từ beat 2, lần lượt các câu và các cạnh. */
function words(lastBeat: number): BulletEvent[] {
  const events: BulletEvent[] = [];
  for (let beat = 2, i = 0; beat <= lastBeat; beat += 3, i++) {
    events.push({
      beat,
      type: "word",
      from: WORD_SIDES[i % WORD_SIDES.length] as Side,
      at: WORD_AT[i % WORD_AT.length] as number,
      phrase: i % NEGATIVE_PHRASES.length,
    });
  }
  return events;
}

/** Đạn thường mỗi 4 beat từ beat 4: xen `straight` (đứng chắn đường của chữ) và `aimed`. */
function bullets(lastBeat: number, aimedCount: number, aimedSpread: number): BulletEvent[] {
  const events: BulletEvent[] = [];
  for (let beat = 4, i = 0; beat <= lastBeat; beat += 4, i++) {
    if (i % 2 === 0) {
      events.push({ beat, type: "straight", from: i % 4 === 0 ? "left" : "right", at: i % 3 === 0 ? 0.5 : 0.35, count: 2, spacing: 0.3 });
    } else {
      events.push({ beat, type: "aimed", from: i % 4 === 1 ? "top" : "bottom", at: 0.5, count: aimedCount, spreadDeg: aimedSpread });
    }
  }
  return events;
}

export const R3_ROUNDS: readonly [Pattern, Pattern, Pattern] = [
  {
    name: "Chị Vân: lượt 1",
    bpm: 100,
    lengthBeats: 48,
    loop: false,
    finish: { kind: "length" },
    lagClock: true,
    events: [...words(44), ...bullets(44, 1, 0)],
  },
  {
    name: "Chị Vân: lượt 2",
    bpm: 100,
    lengthBeats: 52,
    loop: false,
    finish: { kind: "length" },
    lagClock: true,
    events: [...words(48), ...bullets(48, 2, 18)],
  },
  {
    name: "Chị Vân: lượt 3",
    bpm: 100,
    lengthBeats: 56,
    loop: false,
    finish: { kind: "length" },
    lagClock: true,
    events: [...words(52), ...bullets(52, 3, 22)],
  },
];
