import type { Action } from "../core/input";

/**
 * Gán phím cho từng hành động. Dùng `KeyboardEvent.code` (vị trí phím vật lý) nên WASD vẫn đúng
 * dù bố cục bàn phím là gì. Muốn đổi phím hoặc thêm phím phụ, sửa ở đây.
 * Tên mã phím: https://developer.mozilla.org/docs/Web/API/UI_Events/Keyboard_event_code_values
 */
export const KEY_BINDINGS: Readonly<Record<Action, readonly string[]>> = {
  up: ["ArrowUp", "KeyW"],
  down: ["ArrowDown", "KeyS"],
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  confirm: ["KeyZ", "Enter"],
  cancel: ["KeyX", "Escape"],
  slow: ["ShiftLeft", "ShiftRight"],
  debug: ["F1"],
  mute: ["KeyM"],
};

/**
 * Phím nhảy cóc khi lớp debug (F1) đang bật: `KeyboardEvent.code` → tên đích (cùng dạng với `?jump=`, xem
 * `core/debug-jump.ts`). Không đi qua `Input` vì không phải logic game.
 */
export const DEBUG_JUMP_KEYS: Readonly<Record<string, string>> = {
  Digit1: "r1",
  Digit2: "r2",
  Digit3: "r3",
  Digit4: "r4",
  Digit5: "boss",
  Digit6: "town",
  Digit7: "ending",
  Digit0: "title",
};
