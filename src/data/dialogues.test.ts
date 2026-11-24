import { describe, expect, it } from "vitest";
import { DIALOGUES, SPEAKERS, type DialogueId } from "./dialogues";
import { DIALOGUE_FEEL } from "./flow-feel";

describe("dữ liệu hội thoại", () => {
  const entries = Object.entries(DIALOGUES) as [DialogueId, readonly { speaker: string; text: string }[]][];

  it("mỗi đoạn có ít nhất một dòng", () => {
    for (const [id, lines] of entries) expect(lines.length, id).toBeGreaterThan(0);
  });

  it("mọi dòng không rỗng, ≤ maxChars ký tự, người nói có thật", () => {
    for (const [id, lines] of entries) {
      for (const line of lines) {
        expect(line.text.trim().length, `${id}: dòng rỗng`).toBeGreaterThan(0);
        expect(line.text.length, `${id}: "${line.text}"`).toBeLessThanOrEqual(DIALOGUE_FEEL.maxChars);
        expect(Object.keys(SPEAKERS), `${id}: người nói ${line.speaker}`).toContain(line.speaker);
      }
    }
  });

  it('câu "Vẫn chưa muộn." chỉ dành cho màn kết, không xuất hiện trong hội thoại', () => {
    for (const [id, lines] of entries) {
      for (const line of lines) expect(line.text.toLowerCase(), id).not.toContain("chưa muộn");
    }
  });

  it("người chơi không bao giờ nói: không có người nói là người thợ", () => {
    expect(Object.keys(SPEAKERS)).not.toContain("keeper");
  });
});
