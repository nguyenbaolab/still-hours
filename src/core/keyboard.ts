import { ACTIONS, type Action, type Input } from "./input";

const SOURCE = "keyboard";

/** Nguồn input từ bàn phím: dịch phím vật lý thành hành động theo bảng `bindings`. */
export function attachKeyboard(input: Input, bindings: Readonly<Record<Action, readonly string[]>>): void {
  // Một mã phím chỉ ứng với một hành động; nếu bảng gán trùng thì mục khai báo sau thắng.
  const actionOfCode = new Map<string, Action>();
  for (const action of ACTIONS) {
    for (const code of bindings[action]) actionOfCode.set(code, action);
  }

  const downCodes = new Set<string>();
  const sync = (action: Action): void => {
    input.setActionState(SOURCE, action, bindings[action].some((code) => downCodes.has(code)));
  };

  window.addEventListener("keydown", (event) => {
    // Để nguyên tổ hợp phím của trình duyệt (Ctrl+S, Ctrl+W, Alt+←...); Shift thì vẫn dùng được vì là phím "đi chậm".
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const action = actionOfCode.get(event.code);
    if (!action) return;
    event.preventDefault(); // chặn cuộn trang bằng mũi tên, F1 mở trợ giúp trình duyệt...
    downCodes.add(event.code);
    sync(action);
  });

  window.addEventListener("keyup", (event) => {
    const action = actionOfCode.get(event.code);
    if (!action) return;
    downCodes.delete(event.code);
    sync(action);
  });

  // Mất focus (Alt+Tab, bấm ra ngoài...) thì trình duyệt không gửi keyup: thả hết để khỏi bị kẹt phím.
  window.addEventListener("blur", () => {
    downCodes.clear();
    input.releaseSource(SOURCE);
  });
}
