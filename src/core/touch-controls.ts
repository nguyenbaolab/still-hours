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
  const buttons = new Map<TouchControl, HTMLElement>();
  for (const el of root.querySelectorAll<HTMLElement>("[data-control]")) {
    const name = el.getAttribute("data-control");
    if (name && CONTROL_NAMES.has(name)) buttons.set(name as TouchControl, el);
  }
  const held = new Map<number, TouchControl>();

  const paint = (): void => {
    const down = new Set(held.values());
    for (const [name, el] of buttons) el.classList.toggle("is-down", down.has(name));
  };

  const releasePointer = (pointerId: number): void => {
    held.delete(pointerId);
    touch.pointerUp(pointerId);
    paint();
  };

  root.addEventListener("pointerdown", (event) => {
    const control = controlFrom(event.target);
    if (!control) return;
    event.preventDefault();
    try {
      root.setPointerCapture(event.pointerId);
    } catch {
      // Một số trình duyệt từ chối capture. pointerup trên window vẫn nhả được.
    }
    held.set(event.pointerId, control);
    touch.pointerDown(event.pointerId, control);
    paint();
  });

  const release = (event: PointerEvent): void => {
    releasePointer(event.pointerId);
  };
  root.addEventListener("pointerup", release);
  root.addEventListener("pointercancel", (event) => {
    held.delete(event.pointerId);
    touch.pointerCancel(event.pointerId);
    paint();
  });
  root.addEventListener("lostpointercapture", (event) => releasePointer(event.pointerId));
  // Ngón kết thúc ngoài vùng capture (capture bị từ chối): vẫn nhả.
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", (event) => {
    held.delete(event.pointerId);
    touch.pointerCancel(event.pointerId);
    paint();
  });
  window.addEventListener("blur", () => {
    held.clear();
    touch.releaseAll();
    paint();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    held.clear();
    touch.releaseAll();
    paint();
  });

  root.addEventListener("contextmenu", (event) => event.preventDefault());
  root.addEventListener("selectstart", (event) => event.preventDefault());
  root.addEventListener("touchstart", (event) => event.preventDefault(), { passive: false });
  return touch;
}
