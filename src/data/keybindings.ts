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
