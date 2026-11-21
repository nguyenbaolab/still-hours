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
