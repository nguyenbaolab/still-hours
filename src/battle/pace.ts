import type { TempoMap } from "../core/tempo-map";
import type { PaceFeel } from "../data/rhythm-feel";

/**
 * Chính sách đổi hệ số nhịp trong một trận. `TempoMap.setPace` chỉ ghi "từ beat này hệ số là bao nhiêu";
 * lớp này quyết định lúc nào hạ và lúc nào hồi. Dùng chung: cư dân 3 hạ khi ôm một câu và hồi khi câu đi qua;
 * cư dân 2 (bước 6) sẽ gọi cùng `setPace` với một chính sách khác.
 *
 * Hạ áp từ beat nguyên kế tiếp. Hồi áp ở đầu nhịp kế, một bước hằng, không tăng dần trong nhịp.
 * Cùng một beat thì hạ trước, rồi hồi, và chỉ gọi `setPace` một lần.
 */
export class Pace {
  /** Hệ số đã áp. Nằm trong [floor, 1]. */
  factor = 1;

  private readonly drops: number[] = [];
  private readonly recoveries: number[] = [];

  constructor(
    private readonly tempo: TempoMap,
    private readonly feel: PaceFeel,
    private readonly beatsPerBar: number,
  ) {}

  /** Ôm một câu tại `beat`: hạ từ beat nguyên kế tiếp. */
  absorb(beat: number): void {
    this.drops.push(Math.floor(beat) + 1);
  }

  /** Một câu đi qua không chạm, quan sát tại `beat`: hồi một nấc ở đầu nhịp kế. */
  release(beat: number): void {
    this.recoveries.push((Math.floor(beat / this.beatsPerBar) + 1) * this.beatsPerBar);
  }

  /** Áp mọi bước đã tới hạn, theo thứ tự beat. */
  update(beat: number): void {
    for (;;) {
      const dropAt = earliest(this.drops);
      const recoverAt = earliest(this.recoveries);
      const next = Math.min(dropAt, recoverAt);
      if (!(next <= beat)) return;

      let factor = this.factor;
      if (dropAt === next) factor = Math.max(this.feel.floor, factor - take(this.drops, next) * this.feel.drop);
      if (recoverAt === next) factor = Math.min(1, factor + take(this.recoveries, next) * this.feel.recover);
      this.factor = factor;
      this.tempo.setPace(next, factor);
    }
  }
}

function earliest(beats: readonly number[]): number {
  let min = Infinity;
  for (const beat of beats) if (beat < min) min = beat;
  return min;
}

/** Lấy hết các mốc đúng `at` và trả về số mốc đó. */
function take(beats: number[], at: number): number {
  let count = 0;
  for (let i = beats.length - 1; i >= 0; i--) {
    if (beats[i] !== at) continue;
    beats.splice(i, 1);
    count++;
  }
  return count;
}
