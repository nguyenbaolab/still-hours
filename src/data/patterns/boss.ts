import type { BulletEvent, Pattern, PatternEvent, Side } from "../pattern-types";

/**
 * Ông Khải, người thợ đồng hồ đã phí cả đời (boss): một vòng lặp y hệt nhau. Mỗi lượt `loop: true`, vòng 32 beat; thua
 * thì vòng quay lại từ đầu. Không cần thắng, chỉ cần bước ra: lối ra là một khe cửa trên viền khung (`finish: exit`),
 * mở ở một beat của mỗi vòng và rộng dần theo số vòng đã qua (mặc định rộng 28 / 44 / 64 px, mở 2 / 4 / hết vòng; từ vòng
 * thứ 4 mở ngay từ beat 0). Số vòng đã qua giữ qua lần thua. Ba lượt nhắc lại hai cư dân, khe cửa ở cả ba:
 *
 *  Lượt 1 "giờ làm":  tích tắc dồn (120 → 150 BPM), khe bên phải, mở ở beat 24
 *  Lượt 2 "ngẩng lên": đứng yên thì cảnh tháp nhìn ra thị trấn hiện ra, đạn xao nhãng chỉ hút, khe phía trên, mở ở beat 20
 *  Lượt 3 "vòng lặp": lời tiêu cực làm chậm nhịp, mặt đồng hồ trễ, khe bên trái, mở ở beat 28
 */

const LOOP_BEATS = 32;

/** `straight` mỗi beat từ `first` tới `last`, lần lượt theo `lanes`: [cạnh, vị trí dọc cạnh]. */
function chain(first: number, last: number, lanes: readonly (readonly [Side, number])[]): BulletEvent[] {
  const events: BulletEvent[] = [];
  for (let beat = first, i = 0; beat <= last; beat++, i++) {
    const [from, at] = lanes[i % lanes.length] as readonly [Side, number];
    events.push({ beat, type: "straight", from, at });
  }
  return events;
}

/** `aimed` mỗi `every` beat, lần lượt các cạnh nguồn (không bao giờ từ cạnh có khe cửa). */
function aimed(first: number, last: number, every: number, sources: readonly Side[], count: number, spreadDeg: number): BulletEvent[] {
  const events: BulletEvent[] = [];
  for (let beat = first, i = 0; beat <= last; beat += every, i++) {
    events.push({ beat, type: "aimed", from: sources[i % sources.length] as Side, at: 0.5, count, spreadDeg });
  }
  return events;
}

// ── Lượt 1: giờ làm ─────────────────────────────────────────────────────────────────────────────────────────────
const round1Events: PatternEvent[] = [
  { beat: 0, type: "tempo", bpm: 150, overBeats: LOOP_BEATS },
  ...chain(2, 30, [
    ["left", 0.25],
    ["top", 0.7],
    ["left", 0.75],
    ["bottom", 0.3],
    ["top", 0.2],
    ["bottom", 0.8],
  ]),
  ...aimed(6, 30, 4, ["left", "top", "bottom"], 3, 18),
];

// ── Lượt 2: ngẩng lên ───────────────────────────────────────────────────────────────────────────────────────────
// `straight` chỉ ở làn ngoài túi an toàn giữa khung (0,3..0,7), như cư dân 2; đạn xao nhãng chỉ hút (không có bút).
const STILL_LANES: readonly (readonly [Side, number])[] = [
  ["left", 0.2],
  ["right", 0.78],
  ["bottom", 0.2],
  ["right", 0.25],
  ["left", 0.82],
  ["bottom", 0.8],
];
const round2Events: PatternEvent[] = [
  ...chain(2, 29, STILL_LANES).filter((e) => e.beat % 2 === 0),
  ...aimed(8, 28, 8, ["left", "bottom", "right"], 1, 0),
  { beat: 4, type: "distraction", from: "right", at: 0.3 },
  { beat: 12, type: "distraction", from: "left", at: 0.7, hang: true },
  { beat: 18, type: "distraction", from: "right", at: 0.65 },
  { beat: 26, type: "distraction", from: "left", at: 0.35, hang: true },
];

// ── Lượt 3: vòng lặp ────────────────────────────────────────────────────────────────────────────────────────────
const WORD_SIDES: readonly Side[] = ["right", "top", "bottom", "right"];
const round3Events: PatternEvent[] = [];
for (let beat = 2, i = 0; beat <= 29; beat += 3, i++) {
  round3Events.push({ beat, type: "word", from: WORD_SIDES[i % WORD_SIDES.length] as Side, at: [0.4, 0.6, 0.3, 0.7][i % 4] as number, phrase: i % 8 });
}
for (let beat = 4, i = 0; beat <= 28; beat += 4, i++) {
  if (i % 2 === 0) round3Events.push({ beat, type: "straight", from: i % 4 === 0 ? "top" : "bottom", at: 0.35, count: 2, spacing: 0.3 });
  else round3Events.push({ beat, type: "aimed", from: "right", at: 0.5, count: 2, spreadDeg: 18 });
}

export const BOSS_ROUNDS: readonly [Pattern, Pattern, Pattern] = [
  {
    name: "Ông Khải: giờ làm",
    bpm: 120,
    lengthBeats: LOOP_BEATS,
    loop: true,
    finish: { kind: "exit", side: "right", at: 0.5, openBeat: 24, widths: [28, 44, 64], openBeats: [2, 4, 999] },
    events: round1Events,
  },
  {
    name: "Ông Khải: ngẩng lên",
    bpm: 100,
    lengthBeats: LOOP_BEATS,
    loop: true,
    finish: { kind: "exit", side: "top", at: 0.5, openBeat: 20, widths: [28, 44, 64], openBeats: [2, 4, 999] },
    still: { backdrop: "tower" },
    events: round2Events,
  },
  {
    name: "Ông Khải: vòng lặp",
    bpm: 100,
    lengthBeats: LOOP_BEATS,
    loop: true,
    finish: { kind: "exit", side: "left", at: 0.5, openBeat: 28, widths: [28, 44, 64], openBeats: [2, 4, 999] },
    lagClock: true,
    events: round3Events,
  },
];