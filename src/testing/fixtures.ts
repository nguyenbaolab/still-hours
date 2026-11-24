/**
 * Pattern dùng riêng cho test, TÁCH KHỎI pattern thật trong src/data/patterns/ để sửa pattern thử không làm vỡ test.
 * Nếu sửa tempo ở đây thì phải sửa `fixtureBpmAt` cho khớp (nó là bản mô tả độc lập để đối chiếu).
 */
import { simpson } from "./sim";
import type { Pattern } from "../data/pattern-types";

/** Một vòng 32 beat: 100 BPM → tăng dần lên 160 (beat 8–16) → giữ → giảm dần về 100 (beat 20–24) → giữ. */
export const SYNC_FIXTURE: Pattern = {
  name: "fixture đồng bộ",
  bpm: 100,
  lengthBeats: 32,
  loop: true,
  events: [
    { type: "tempo", beat: 8, bpm: 160, overBeats: 8 },
    { type: "tempo", beat: 20, bpm: 100, overBeats: 4 },
    { beat: 0.5, type: "straight", from: "right", at: 0.5, radius: 12 }, // đạn lớn: cảnh báo bắt đầu từ vòng trước
    { beat: 2, type: "straight", from: "right", at: 0.5 },
    { beat: 3, type: "straight", from: "left", at: 0.5 },
    { beat: 4, type: "aimed", from: "top", at: 0.5 },
    { beat: 6, type: "burst", x: 0.5, y: 0.5, count: 8 },
    { beat: 9, type: "straight", from: "left", at: 0.3, radius: 10 },
    { beat: 12, type: "sweep", x: 0.5, y: 0.5, length: 60, startAngleDeg: 0, degreesPerBeat: 45, durationBeats: 4 },
    { beat: 14.5, type: "straight", from: "bottom", at: 0.3 },
    { beat: 18, type: "aimed", from: "right", at: 0.5, count: 3, radius: 10 },
    { beat: 22, type: "burst", x: 0.3, y: 0.5, count: 5, arcDeg: 60 },
  ],
};

/** BPM tại một beat của SYNC_FIXTURE, viết tay độc lập với TempoMap. Liên tục tại mọi điểm nối. */
export function fixtureBpmAt(beat: number): number {
  const c = ((beat % 32) + 32) % 32;
  if (c < 8) return 100;
  if (c < 16) return 100 + 7.5 * (c - 8);
  if (c < 20) return 160;
  if (c < 24) return 160 - 15 * (c - 20);
  return 100;
}

const BLOCK_BEATS = 4; // mọi điểm gãy của tempo đều là bội của 4, nên mỗi khối mượt và Simpson rất chính xác
const blockStart: number[] = [0]; // blockStart[k] = giây tại beat 4k

/** Giây (từ beat 0) mà `beat` diễn ra, bằng tích phân số độc lập của 60 / BPM. Dùng để đối chiếu với TempoMap. */
export function fixtureTime(beat: number): number {
  const wholeBlocks = Math.floor(beat / BLOCK_BEATS);
  while (blockStart.length <= wholeBlocks) {
    const k = blockStart.length - 1;
    const previous = blockStart[k] as number;
    blockStart.push(previous + simpson((x) => 60 / fixtureBpmAt(x), k * BLOCK_BEATS, (k + 1) * BLOCK_BEATS, 400));
  }
  const from = wholeBlocks * BLOCK_BEATS;
  const tail = beat > from ? simpson((x) => 60 / fixtureBpmAt(x), from, beat, 400) : 0;
  return (blockStart[wholeBlocks] as number) + tail;
}

/** Pha né kiểu `page`, không có đạn nào: chỉ để thử bút. 100 BPM, vòng 16 beat, cần vẽ 20 beat. */
export const PAGE_FIXTURE: Pattern = {
  name: "fixture trang",
  bpm: 100,
  lengthBeats: 16,
  loop: true,
  finish: { kind: "page", drawBeats: 20 },
  pencil: { x: 0.25, y: 0.5 },
  events: [],
};

/**
 * Trang không bao giờ vẽ đủ (drawBeats lớn hơn mọi thứ vẽ được trong `maxLoops` vòng) và chỉ có đạn xao nhãng,
 * không có đạn trừ máu. Đạn treo ở bên phải, xa chỗ bút, nên bánh răng đứng yên không bị hút tới bút.
 */
export const PAGE_NEVER_FIXTURE: Pattern = {
  ...PAGE_FIXTURE,
  name: "fixture trang không bao giờ đủ",
  finish: { kind: "page", drawBeats: 500 },
  events: [
    { beat: 6, type: "distraction", from: "top", at: 0.92, hang: true },
    { beat: 12, type: "distraction", from: "right", at: 0.8 },
  ],
};

/** Pha né kiểu `length` không có đạn: 8 beat rồi xong. */
export const LENGTH_FIXTURE: Pattern = {
  name: "fixture độ dài",
  bpm: 100,
  lengthBeats: 8,
  loop: false,
  finish: { kind: "length" },
  events: [],
};

/**
 * Pha né kiểu `exit`, không có đạn: 120 BPM, vòng 8 beat (4 giây). Khe bên phải giữa cạnh, mở ở beat 4 của mỗi vòng:
 * vòng 1 rộng 28 px trong 2 beat, vòng 2 rộng 44 px trong 3 beat, từ vòng 3 rộng 64 px và mở tới hết vòng.
 */
export const EXIT_FIXTURE: Pattern = {
  name: "fixture khe cửa",
  bpm: 120,
  lengthBeats: 8,
  loop: true,
  finish: { kind: "exit", side: "right", at: 0.5, openBeat: 4, widths: [28, 44, 64], openBeats: [2, 3, 999] },
  events: [],
};