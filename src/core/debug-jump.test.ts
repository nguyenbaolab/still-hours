import { describe, expect, it } from "vitest";
import { jumpForKey, parseJump, parseJumpName, residentsBefore } from "./debug-jump";
import { DEBUG_JUMP_KEYS } from "../data/keybindings";

describe("parseJump (?jump=)", () => {
  it("r1…r4 và boss vào trận từ lượt 1, pha né", () => {
    for (const id of ["r1", "r2", "r3", "r4", "boss"] as const) {
      expect(parseJump(`?jump=${id}`)).toEqual({ kind: "battle", id, round: 1, phase: "dodge" });
    }
  });

  it("r4.2 là lượt 2 pha né; r4.2d là lượt 2 pha tháo; r2.3d là lượt 3 pha tháo", () => {
    expect(parseJump("?jump=r4.2")).toEqual({ kind: "battle", id: "r4", round: 2, phase: "dodge" });
    expect(parseJump("?jump=r4.2d")).toEqual({ kind: "battle", id: "r4", round: 2, phase: "disassemble" });
    expect(parseJump("?jump=r2.3d")).toEqual({ kind: "battle", id: "r2", round: 3, phase: "disassemble" });
  });

  it("town, town.r3, intro, ending", () => {
    expect(parseJump("?jump=town")).toEqual({ kind: "town", before: null });
    expect(parseJump("?jump=town.r3")).toEqual({ kind: "town", before: "r3" });
    expect(parseJump("?jump=intro")).toEqual({ kind: "intro" });
    expect(parseJump("?jump=ending")).toEqual({ kind: "ending" });
  });

  it("đọc đúng khi có tham số khác; không phân biệt hoa thường", () => {
    expect(parseJump("?a=1&jump=R3.2D&b=2")).toEqual({ kind: "battle", id: "r3", round: 2, phase: "disassemble" });
  });

  it("giá trị lạ, thiếu hoặc rỗng thì null", () => {
    for (const bad of ["", "?", "?jump=", "?jump=r5", "?jump=r4.4", "?jump=r4.0", "?jump=r4.2x", "?jump=town.r5", "?jump=abc", "?jump=r4.2dd", "?jump=%20"]) {
      expect(parseJump(bad), bad).toBeNull();
    }
    expect(parseJumpName(null)).toBeNull();
    expect(parseJumpName(undefined)).toBeNull();
  });
});

describe("phím số nhảy cóc", () => {
  it("chỉ hoạt động khi lớp debug bật", () => {
    expect(jumpForKey("Digit3", false)).toBeNull();
    expect(jumpForKey("Digit3", true)).toEqual({ kind: "battle", id: "r3", round: 1, phase: "dodge" });
  });

  it("1–4 cư dân, 5 boss, 6 thị trấn ở tiệm, 7 màn kết, 0 màn bắt đầu; phím khác không làm gì", () => {
    expect(jumpForKey("Digit5", true)).toEqual({ kind: "battle", id: "boss", round: 1, phase: "dodge" });
    expect(jumpForKey("Digit6", true)).toEqual({ kind: "town", before: null });
    expect(jumpForKey("Digit7", true)).toEqual({ kind: "ending" });
    expect(jumpForKey("Digit0", true)).toEqual({ kind: "title" });
    expect(jumpForKey("Digit8", true)).toBeNull();
    expect(jumpForKey("KeyZ", true)).toBeNull();
  });

  it("mọi phím trong bảng đều ra một đích hợp lệ", () => {
    for (const [code, name] of Object.entries(DEBUG_JUMP_KEYS)) expect(parseJumpName(name), code).not.toBeNull();
  });
});

describe("residentsBefore", () => {
  const order = ["r1", "r2", "r3", "r4", "boss"] as const;
  it("cư dân đứng trước đích theo thứ tự gặp", () => {
    expect(residentsBefore("r1", order)).toEqual([]);
    expect(residentsBefore("r3", order)).toEqual(["r1", "r2"]);
    expect(residentsBefore("boss", order)).toEqual(["r1", "r2", "r3", "r4"]);
  });
});
