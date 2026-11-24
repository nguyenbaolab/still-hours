import type { Pattern } from "../pattern-types";

/**
 * Lượt tạm cho cư dân chưa có pattern thật (mốc 5.5): lấy một pattern có sẵn, bỏ tempo, cắt còn `endBeat` beat đầu,
 * `loop: false`, `finish: length`. Hai beat cuối để trống (tác giả pattern để trống 2 beat cuối). Bước 6 thay từng người
 * bằng pattern thật và không còn dùng hàm này.
 */
export function placeholderRound(name: string, base: Pattern, lengthBeats = 20): Pattern {
  return {
    name,
    bpm: base.bpm ?? 100,
    lengthBeats,
    loop: false,
    finish: { kind: "length" },
    events: base.events.filter((e) => e.type !== "tempo" && e.beat < lengthBeats - 2),
  };
}

/** Ba lượt tạm từ cùng một pattern gốc, dài dần: 18, 20, 22 beat. */
export function placeholderRounds(name: string, base: Pattern): readonly [Pattern, Pattern, Pattern] {
  return [
    placeholderRound(`${name} 1`, base, 18),
    placeholderRound(`${name} 2`, base, 20),
    placeholderRound(`${name} 3`, base, 22),
  ];
}
