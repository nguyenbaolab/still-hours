import { DEBUG_JUMP_KEYS } from "../data/keybindings";
import type { ResidentId } from "../data/residents/types";

/**
 * Nhảy cóc để chơi thử (CLAUDE.md, "Phím debug và nhảy cóc"). Hàm thuần: đọc tên đích từ URL hoặc phím số, không đụng
 * vào cảnh. `GameFlow.jump` mới là nơi thực hiện.
 */
export type JumpTarget =
  | { kind: "battle"; id: ResidentId; round: 1 | 2 | 3; phase: "dodge" | "disassemble" }
  | { kind: "town"; before: ResidentId | null }
  | { kind: "intro" }
  | { kind: "ending" }
  | { kind: "title" };

const BATTLE_NAME = /^(r[1-4]|boss)(?:\.([123])(d)?)?$/;
const TOWN_NAME = /^town(?:\.(r[1-4]|boss))?$/;

/** Tên đích: `r1`…`r4`, `boss` (lượt 1, pha né), `r4.2` (lượt 2, pha né), `r4.2d` (lượt 2, pha tháo), `town`, `town.r3`, `intro`, `ending`, `title`. Lạ thì null. */
export function parseJumpName(name: string | null | undefined): JumpTarget | null {
  if (!name) return null;
  const text = name.trim().toLowerCase();
  const battle = BATTLE_NAME.exec(text);
  if (battle) {
    return {
      kind: "battle",
      id: battle[1] as ResidentId,
      round: Number(battle[2] ?? "1") as 1 | 2 | 3,
      phase: battle[3] ? "disassemble" : "dodge",
    };
  }
  const town = TOWN_NAME.exec(text);
  if (town) return { kind: "town", before: (town[1] as ResidentId | undefined) ?? null };
  if (text === "intro" || text === "ending" || text === "title") return { kind: text };
  return null;
}

/** `?jump=...` trong chuỗi truy vấn của URL. Không có hoặc giá trị lạ thì null (chạy bình thường). */
export function parseJump(search: string): JumpTarget | null {
  return parseJumpName(new URLSearchParams(search).get("jump"));
}

/** Đích của một phím số, chỉ khi lớp debug đang bật. */
export function jumpForKey(code: string, debugOn: boolean): JumpTarget | null {
  if (!debugOn) return null;
  return parseJumpName(DEBUG_JUMP_KEYS[code]);
}

/** Các cư dân đứng trước `id` theo thứ tự gặp: nhảy cóc coi họ đã giải thoát. Không có `id` trong `order` thì rỗng. */
export function residentsBefore(id: ResidentId, order: readonly ResidentId[]): ResidentId[] {
  const index = order.indexOf(id);
  return index < 0 ? [] : order.slice(0, index);
}
