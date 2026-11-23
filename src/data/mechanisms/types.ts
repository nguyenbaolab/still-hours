/** Một cỗ máy để tháo. Dữ liệu thuần; pha tháo lắp chỉ diễn giải. */

export type Operation = "unscrew" | "lift" | "unhook";

export interface PartBox {
  /** Góc trên trái, tỉ lệ 0..1 của vùng tháo. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Part {
  id: string;
  /** Id trong kho sprite. */
  sprite: string;
  /** Tâm bộ phận, tỉ lệ 0..1 của vùng tháo. Con trỏ dùng điểm này. */
  x: number;
  y: number;
  /** Vùng chọn, vẽ viền khi đang trỏ. */
  hit: PartBox;
  /** Id các bộ phận phải tháo trước. */
  blockedBy: readonly string[];
  operation: Operation;
  /** Một câu ngắn tiếng Việt. Có thì hiện sau khi tháo xong. */
  memory?: string;
  /** Tháo xong bộ phận này thì pha kết thúc. Đúng một bộ phận trong máy. */
  core?: boolean;
}

export interface Mechanism {
  name: string;
  bpm: number;
  /** false = vặn và gỡ không cần đúng nhịp. Nhấc vẫn giữ đủ số beat. */
  rhythmic: boolean;
  parts: readonly Part[];
}
