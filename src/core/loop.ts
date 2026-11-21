import { TICK_RATE } from "./config";

export interface LoopCallbacks {
  /** Chạy đúng TICK_RATE lần mỗi giây, bất kể tốc độ khung hình. Chỉ chứa logic, không vẽ. */
  update(): void;
  /** Chạy mỗi khung hình. `alpha` ∈ [0, 1) là phần bước update đang dở, dùng để nội suy khi vẽ. */
  render(alpha: number): void;
}

/** Một khung hình tối đa bù bấy nhiêu ms; tránh "vòng xoáy chết" khi tab bị treo hoặc vừa quay lại. */
const MAX_FRAME_MS = 250;

/** Bắt đầu vòng lặp fixed timestep. Trả về hàm để dừng vòng lặp. */
export function startLoop({ update, render }: LoopCallbacks): () => void {
  const stepMs = 1000 / TICK_RATE;
  let accumulator = 0;
  let last = performance.now();
  let rafId = 0;

  const frame = (now: number): void => {
    accumulator += Math.min(now - last, MAX_FRAME_MS);
    last = now;

    while (accumulator >= stepMs) {
      update();
      accumulator -= stepMs;
    }

    render(accumulator / stepMs);
    rafId = requestAnimationFrame(frame);
  };

  rafId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(rafId);
}
