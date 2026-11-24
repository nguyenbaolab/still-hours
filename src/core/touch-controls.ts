import type { Input } from "./input";
import { TOUCH_CONTROLS, TouchInput, type TouchControl } from "./touch-input";

const CONTROL_NAMES: ReadonlySet<string> = new Set(TOUCH_CONTROLS);

function controlFrom(target: EventTarget | null): TouchControl | null {
  if (!(target instanceof Element)) return null;
  const name = target.closest("[data-control]")?.getAttribute("data-control");
  return name && CONTROL_NAMES.has(name) ? (name as TouchControl) : null;
}

/**
 * Gắn Pointer Events lên vùng nút ảo. `pointerdown` chặn thao tác mặc định của trình duyệt (kéo để cuộn, chọn chữ).
 * Capture trên vùng nút để `pointerup` vẫn tới khi ngón trượt ra ngoài nút. `pointercancel` và mất focus thì nhả.
 */
export function mountTouchControls(root: HTMLElement, input: Input): TouchInput {
  const touch = new TouchInput(input);

  root.addEventListener("pointerdown", (event) => {
    const control = controlFrom(event.target);
    if (!control) return;
    event.preventDefault();
    try {
      root.setPointerCapture(event.pointerId);
    } catch {
      // Một số trình duyệt từ chối capture. pointerup trên window vẫn nhả được.
    }
    touch.pointerDown(event.pointerId, control);
  });

  const release = (event: PointerEvent): void => {
    touch.pointerUp(event.pointerId);
  };
  root.addEventListener("pointerup", release);
  root.addEventListener("pointercancel", (event) => touch.pointerCancel(event.pointerId));
  root.addEventListener("lostpointercapture", (event) => touch.pointerUp(event.pointerId));
  // Ngón kết thúc ngoài vùng capture (capture bị từ chối): vẫn nhả.
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", (event) => touch.pointerCancel(event.pointerId));
  window.addEventListener("blur", () => touch.releaseAll());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) touch.releaseAll();
  });

  root.addEventListener("contextmenu", (event) => event.preventDefault());
  root.addEventListener("selectstart", (event) => event.preventDefault());
  root.addEventListener("touchstart", (event) => event.preventDefault(), { passive: false });
  return touch;
}
