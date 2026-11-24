import type { Renderer } from "../core/renderer";

/** Một màn hình/pha của game. Máy trạng thái chuyển giữa các cảnh sẽ có ở bước 5; hiện main.ts tự đổi cảnh. */
export interface Scene {
  /** Một bước logic (đúng TICK_RATE lần mỗi giây, sau input.poll()). Không vẽ. */
  update(): void;
  /** Vẽ một khung hình. `alpha` ∈ [0, 1) để nội suy giữa tick trước và tick hiện tại. Không đổi trạng thái game. */
  render(renderer: Renderer, alpha: number): void;
  /** `false` = tick của cảnh này không tính vào thời gian chơi (màn bắt đầu). Bỏ trống = có tính. */
  readonly countsPlayTime?: boolean;
  /** Cảnh sắp bị thay: dọn âm thanh nền (hủy tiếng tích đã hẹn, tắt gió). Bỏ trống nếu không có gì để dọn. */
  leave?(): void;
}
