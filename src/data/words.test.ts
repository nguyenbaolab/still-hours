import { describe, expect, it } from "vitest";
import { NEGATIVE_PHRASES } from "./words";

describe("câu của đạn chữ", () => {
  it("mỗi câu 2–5 chữ, không rỗng, không trùng, không dài quá 20 ký tự", () => {
    expect(new Set(NEGATIVE_PHRASES).size).toBe(NEGATIVE_PHRASES.length);
    for (const phrase of NEGATIVE_PHRASES) {
      const count = phrase.trim().split(/\s+/).length;
      expect(count, phrase).toBeGreaterThanOrEqual(2);
      expect(count, phrase).toBeLessThanOrEqual(5);
      expect(phrase.length, phrase).toBeLessThanOrEqual(20);
    }
  });
});