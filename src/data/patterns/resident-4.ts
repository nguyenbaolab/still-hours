import type { Pattern, PatternEvent } from "../pattern-types";

/**
 * Ba lượt "Nhặt bút" của cô bé Linh (cư dân 4). Mỗi lượt là một pha né kiểu `page`: bút nằm ở `pencil`, bánh răng cầm
 * bút thì mọi bước đi để lại nét; chạm đạn xao nhãng (`distraction`) thì bút rơi. Đạn thường (`straight`, `aimed`,
 * `burst`, `sweep`) trừ máu như mọi pha né, nhưng không làm rơi bút.
 *
 * Vòng 32 beat, lặp. Vị trí là tỉ lệ 0..1 của khung (400×160). `spacing` của `straight` là tỉ lệ độ dài cạnh:
 * thiết kế ghi 24 px và 32 px, ở cạnh dọc (160 px) là 0,15 và 0,2. Hàng đạn đặt `at` sao cho cả hàng nằm giữa cạnh.
 *
 * Quy tắc: 8 beat đầu của lượt 1 không có đạn trừ máu (chỗ để nhận ra cây bút); không đạn hay đạn xao nhãng nào
 * xuất hiện trong bán kính 40 px quanh chỗ bút nằm trong 4 beat đầu của vòng (kiểm ở resident-4.test.ts).
 */

/** Giọng trì hoãn của cô, không phải lời khuyên. Hiện khi một vòng trọn vẹn trôi qua mà chưa cầm bút. */
export const R4_IDLE_LINES: readonly string[] = ["Mai vẽ cũng được.", "Giờ vẽ thì muộn rồi.", "Vẽ cũng chẳng đẹp."];

const common = {
  loop: true,
  lengthBeats: 32,
  idleLines: R4_IDLE_LINES,
} as const;

const round1Events: PatternEvent[] = [
  { beat: 2, type: "distraction", from: "top", at: 0.7, hang: true },
  { beat: 6, type: "distraction", from: "right", at: 0.3 },
  { beat: 8, type: "straight", from: "left", at: 0.2 },
  { beat: 8, type: "straight", from: "left", at: 0.8 },
  { beat: 10, type: "distraction", from: "right", at: 0.65 },
  { beat: 12, type: "aimed", from: "top", at: 0.5, count: 1 },
  { beat: 14, type: "straight", from: "right", at: 0.35, count: 3, spacing: 0.15 },
  { beat: 16, type: "distraction", from: "top", at: 0.3, hang: true },
  { beat: 18, type: "aimed", from: "bottom", at: 0.3, count: 2, spreadDeg: 20 },
  { beat: 20, type: "straight", from: "top", at: 0.15 },
  { beat: 20, type: "straight", from: "top", at: 0.85 },
  { beat: 22, type: "distraction", from: "left", at: 0.4 },
  { beat: 24, type: "burst", x: 0.5, y: 0.5, count: 8 },
  { beat: 26, type: "aimed", from: "right", at: 0.5, count: 3, spreadDeg: 16 },
  { beat: 28, type: "distraction", from: "top", at: 0.55, hang: true },
  { beat: 30, type: "straight", from: "left", at: 0.4, count: 2, spacing: 0.2 },
];

const round2Events: PatternEvent[] = [
  // Sáu thứ xao nhãng, xen treo và bay ngang.
  { beat: 2, type: "distraction", from: "top", at: 0.2, hang: true },
  { beat: 7, type: "distraction", from: "right", at: 0.5 },
  { beat: 12, type: "distraction", from: "top", at: 0.5, hang: true },
  { beat: 17, type: "distraction", from: "left", at: 0.35 },
  { beat: 22, type: "distraction", from: "top", at: 0.8, hang: true },
  { beat: 27, type: "distraction", from: "right", at: 0.7 },
  // Đạn thường mỗi 2 beat từ beat 4.
  { beat: 4, type: "straight", from: "left", at: 0.25 },
  { beat: 6, type: "straight", from: "right", at: 0.7 },
  { beat: 8, type: "aimed", from: "top", at: 0.5, count: 1 },
  { beat: 10, type: "straight", from: "bottom", at: 0.3, count: 2, spacing: 0.25 },
  { beat: 12, type: "straight", from: "right", at: 0.3 },
  { beat: 14, type: "straight", from: "left", at: 0.75 },
  { beat: 15, type: "aimed", from: "right", at: 0.5, count: 3, spreadDeg: 18 },
  { beat: 16, type: "burst", x: 0.5, y: 0.5, count: 6 },
  { beat: 18, type: "straight", from: "top", at: 0.2, count: 2, spacing: 0.3 },
  { beat: 20, type: "straight", from: "right", at: 0.55 },
  { beat: 22, type: "aimed", from: "bottom", at: 0.6, count: 1 },
  { beat: 24, type: "straight", from: "left", at: 0.4, count: 2, spacing: 0.3 },
  { beat: 26, type: "straight", from: "right", at: 0.2 },
  { beat: 28, type: "straight", from: "top", at: 0.6 },
  { beat: 30, type: "aimed", from: "left", at: 0.5, count: 1 },
  { beat: 31, type: "aimed", from: "right", at: 0.5, count: 3, spreadDeg: 18 },
];

const round3Events: PatternEvent[] = [
  { beat: 2, type: "distraction", from: "top", at: 0.8, hang: true },
  { beat: 7, type: "distraction", from: "left", at: 0.5 },
  { beat: 12, type: "distraction", from: "top", at: 0.3, hang: true },
  { beat: 17, type: "distraction", from: "right", at: 0.45 },
  { beat: 22, type: "distraction", from: "top", at: 0.6, hang: true },
  { beat: 27, type: "distraction", from: "left", at: 0.7 },
  { beat: 4, type: "straight", from: "right", at: 0.2 },
  { beat: 6, type: "straight", from: "left", at: 0.6 },
  { beat: 8, type: "aimed", from: "top", at: 0.3, count: 1 },
  { beat: 10, type: "straight", from: "right", at: 0.7, count: 2, spacing: 0.15 },
  { beat: 12, type: "straight", from: "left", at: 0.3 },
  { beat: 14, type: "aimed", from: "bottom", at: 0.7, count: 2, spreadDeg: 20 },
  // Kim quét giữa khung: vùng giữa thành chỗ phải vòng quanh.
  { beat: 16, type: "sweep", x: 0.5, y: 0.5, length: 70, startAngleDeg: -90, degreesPerBeat: 30, durationBeats: 8 },
  { beat: 18, type: "straight", from: "top", at: 0.75, count: 2, spacing: 0.15 },
  { beat: 20, type: "straight", from: "right", at: 0.35 },
  { beat: 22, type: "burst", x: 0.3, y: 0.5, count: 6, angleDeg: 0, arcDeg: 90 },
  { beat: 24, type: "straight", from: "left", at: 0.55, count: 2, spacing: 0.3 },
  { beat: 26, type: "straight", from: "top", at: 0.25 },
  { beat: 28, type: "aimed", from: "right", at: 0.5, count: 3, spreadDeg: 16 },
  { beat: 30, type: "straight", from: "left", at: 0.3 },
];

export const R4_ROUNDS = [
  {
    ...common,
    name: "nhặt bút 1",
    bpm: 100,
    finish: { kind: "page", drawBeats: 32 },
    pencil: { x: 0.25, y: 0.5 },
    events: round1Events,
  },
  {
    ...common,
    name: "nhặt bút 2",
    bpm: 104,
    finish: { kind: "page", drawBeats: 32 },
    pencil: { x: 0.75, y: 0.3 },
    events: round2Events,
  },
  {
    ...common,
    name: "nhặt bút 3",
    bpm: 108,
    finish: { kind: "page", drawBeats: 36 },
    pencil: { x: 0.5, y: 0.8 },
    events: round3Events,
  },
] as const satisfies readonly [Pattern, Pattern, Pattern];
