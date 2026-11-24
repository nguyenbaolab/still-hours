import type { Input } from "./input";

/** Nút trên lớp điều khiển ảo. Trùng tên hành động mà game đã có. */
export const TOUCH_CONTROLS = ["up", "down", "left", "right", "confirm", "cancel"] as const;
export type TouchControl = (typeof TOUCH_CONTROLS)[number];

const SOURCE = "touch";

/** Hiện nút ảo khi thiết bị cảm ứng: con trỏ chính là ngón tay, hoặc máy báo có touch. */
export function wantsTouchControls(env: { coarse: boolean; maxTouchPoints: number; ontouchstart: boolean }): boolean {
  return env.coarse || env.maxTouchPoints > 0 || env.ontouchstart;
}

/**
 * Nguồn cảm ứng của `Input`. Mỗi ngón là một `pointerId` giữ đúng một nút.
 * Thả ngón hoặc `pointercancel` chỉ nhả nút của ngón đó; ngón khác giữ nguyên.
 * Không phát sự kiện bàn phím: gọi `setActionState` cùng chỗ `keydown`/`keyup` đang ghi, nguồn riêng `touch`
 * để không xóa trạng thái bàn phím.
 */
export class TouchInput {
  private readonly pointers = new Map<number, TouchControl>();

  constructor(private readonly input: Input) {}

  /** Ngón `pointerId` vừa đè lên `control`. Cùng id mà đổi nút thì nút cũ được nhả. */
  pointerDown(pointerId: number, control: TouchControl): void {
    this.pointers.set(pointerId, control);
    this.sync();
  }

  /** Ngón rời. Id lạ thì bỏ qua. */
  pointerUp(pointerId: number): void {
    if (!this.pointers.delete(pointerId)) return;
    this.sync();
  }

  /** Trình duyệt hủy ngón (cuộn, cảnh báo, ngón bị hệ thống lấy). Nhả như thả tay. */
  pointerCancel(pointerId: number): void {
    this.pointerUp(pointerId);
  }

  /** Mất focus hoặc rời trang: nhả hết, không để kẹt phím. */
  releaseAll(): void {
    this.pointers.clear();
    this.input.releaseSource(SOURCE);
  }

  private sync(): void {
    const held = new Set(this.pointers.values());
    for (const control of TOUCH_CONTROLS) {
      this.input.setActionState(SOURCE, control, held.has(control));
    }
  }
}
