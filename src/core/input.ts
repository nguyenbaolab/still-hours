/**
 * Lớp trừu tượng input: logic game chỉ hỏi "hành động X có đang được giữ không", không biết phím nào,
 * cảm ứng hay tay cầm. Muốn hỗ trợ thiết bị mới, chỉ cần viết một "nguồn" gọi `setActionState(...)`
 * (xem keyboard.ts); không phải sửa logic game.
 */

export const ACTIONS = ["up", "down", "left", "right", "confirm", "cancel", "slow", "debug"] as const;

/**
 * - up/down/left/right: di chuyển.
 * - confirm/cancel: xác nhận/hủy (menu, hội thoại).
 * - slow: giữ để đi chậm khi cần né tỉ mỉ.
 * - debug: bật/tắt lớp debug (chỉ dành cho dev, không cần gán cho cảm ứng/tay cầm).
 */
export type Action = (typeof ACTIONS)[number];

export class Input {
  /** Hướng di chuyển của tick hiện tại, mỗi trục ∈ {-1, 0, 1}. Hai phím ngược nhau triệt tiêu. */
  readonly move = { x: 0, y: 0 };

  /** Các hành động mà từng nguồn (bàn phím, cảm ứng, tay cầm...) đang giữ. */
  private readonly sources = new Map<string, Set<Action>>();
  /** Hành động vừa được nhấn xuống nhưng chưa được `poll()` ghi nhận. Giữ lại để cú nhấn cực ngắn không bị mất. */
  private readonly pending = new Set<Action>();

  /** Ảnh chụp trạng thái, chỉ đổi khi gọi `poll()` nên trong một tick mọi chỗ đọc đều thấy cùng một giá trị. */
  private readonly held = new Set<Action>();
  private readonly pressed = new Set<Action>();

  /** Dành cho nguồn input: báo một hành động đang được giữ (`down = true`) hay đã thả. */
  setActionState(source: string, action: Action, down: boolean): void {
    let actions = this.sources.get(source);
    if (!actions) {
      actions = new Set();
      this.sources.set(source, actions);
    }

    if (down) {
      if (!this.isHeldBySomeSource(action)) this.pending.add(action);
      actions.add(action);
    } else {
      actions.delete(action);
    }
  }

  /** Dành cho nguồn input: thả mọi hành động của nguồn đó (ví dụ khi cửa sổ mất focus, tránh kẹt phím). */
  releaseSource(source: string): void {
    this.sources.get(source)?.clear();
  }

  /** Gọi đúng một lần ở đầu mỗi tick, trước khi update logic. */
  poll(): void {
    this.held.clear();
    for (const actions of this.sources.values()) {
      for (const action of actions) this.held.add(action);
    }

    this.pressed.clear();
    for (const action of this.pending) this.pressed.add(action);
    this.pending.clear();

    this.move.x = Number(this.held.has("right")) - Number(this.held.has("left"));
    this.move.y = Number(this.held.has("down")) - Number(this.held.has("up"));
  }

  /** Hành động đang được giữ trong tick này. */
  isDown(action: Action): boolean {
    return this.held.has(action);
  }

  /** Hành động vừa được nhấn xuống (chỉ đúng ở tick đầu tiên sau khi nhấn). */
  wasPressed(action: Action): boolean {
    return this.pressed.has(action);
  }

  private isHeldBySomeSource(action: Action): boolean {
    for (const actions of this.sources.values()) {
      if (actions.has(action)) return true;
    }
    return false;
  }
}
