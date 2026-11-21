/**
 * ĐỊNH DẠNG PATTERN ĐẠN. Một pattern là danh sách sự kiện theo beat; thêm pattern mới = thêm dữ liệu
 * (xem patterns/), không sửa code engine. Thêm LOẠI đạn mới = thêm một kiểu ở đây + một handler trong
 * src/battle/spawners.ts.
 *
 * Quy ước:
 * - `beat` là lúc đạn XUẤT HIỆN (hoặc tempo đổi). Beat có thể lẻ (1.5 = nửa beat sau beat 1).
 * - Vị trí trong khung là TỈ LỆ 0..1 (x: 0 = mép trái, 1 = mép phải; y: 0 = mép trên, 1 = mép dưới), nên đổi
 *   kích thước khung không làm hỏng pattern. Độ dài, tốc độ tính bằng px, px/giây.
 * - Góc tính bằng độ: 0° = sang phải, 90° = xuống dưới (trục y hướng xuống), -90° = lên trên.
 * - Chỗ nào không khai báo thì lấy mặc định ở rhythm-feel.ts.
 */

export type Side = "left" | "right" | "top" | "bottom";

interface EventBase {
  /** Beat đạn xuất hiện, từ 0 đến `lengthBeats` (không gồm). */
  beat: number;
  /**
   * Cảnh báo nhấp nháy trước khi xuất hiện, tính theo beat. Bỏ trống = mặc định: có (BULLET_FEEL.telegraphBeats)
   * với đạn lớn/nguy hiểm, không có với đạn nhỏ. Đạn lớn/nguy hiểm KHÔNG được đặt 0 (pattern bị từ chối).
   */
  telegraphBeats?: number;
}

interface BulletOptions {
  /** Tốc độ (px/giây). */
  speed?: number;
  /** Bán kính va chạm (px). Từ BULLET_FEEL.bigRadius trở lên là đạn lớn. */
  radius?: number;
  /** Máu mất khi trúng. */
  damage?: number;
}

/** Đạn bay thẳng từ một cạnh khung vào trong, vuông góc với cạnh. `count` viên xếp thành hàng dọc theo cạnh. */
export interface StraightEvent extends EventBase, BulletOptions {
  type: "straight";
  /** Cạnh xuất phát. */
  from: Side;
  /** Vị trí dọc theo cạnh (0..1). */
  at: number;
  /** Số viên trong hàng (mặc định 1). */
  count?: number;
  /** Khoảng cách giữa các viên, tính theo tỉ lệ độ dài cạnh (mặc định 0.2). */
  spacing?: number;
}

/** Đạn từ một điểm trên cạnh khung, nhắm vào vị trí người chơi. `count` > 1 thì xòe hình quạt quanh hướng nhắm. */
export interface AimedEvent extends EventBase, BulletOptions {
  type: "aimed";
  from: Side;
  at: number;
  /** Số viên (mặc định 1). */
  count?: number;
  /** Góc giữa hai viên cạnh nhau, độ (mặc định 15). */
  spreadDeg?: number;
}

/** Đạn tỏa ra từ một điểm trong khung: `arcDeg` 360 là vòng tròn, nhỏ hơn là hình quạt. Luôn có cảnh báo. */
export interface BurstEvent extends EventBase, BulletOptions {
  type: "burst";
  /** Điểm tỏa ra, tỉ lệ trong khung. */
  x: number;
  y: number;
  /** Số viên. */
  count: number;
  /** Hướng giữa của quạt, độ (mặc định 0). Bị bỏ qua nếu `aimed`. */
  angleDeg?: number;
  /** Độ rộng cung, độ (mặc định 360 = cả vòng tròn). */
  arcDeg?: number;
  /** Hướng giữa của quạt nhắm vào người chơi (khóa lúc bắt đầu cảnh báo). */
  aimed?: boolean;
}

/** Kim đồng hồ quét quay quanh một tâm. Quay theo BEAT nên tempo tăng thì kim quay nhanh theo. Luôn có cảnh báo. */
export interface SweepEvent extends EventBase {
  type: "sweep";
  /** Tâm quay, tỉ lệ trong khung. */
  x: number;
  y: number;
  /** Chiều dài kim (px). */
  length: number;
  /** Góc ban đầu của kim đầu tiên (độ). */
  startAngleDeg: number;
  /** Tốc độ quay (độ mỗi beat); dương = quay theo chiều kim đồng hồ trên màn hình. */
  degreesPerBeat: number;
  /** Kim tồn tại trong bao nhiêu beat. */
  durationBeats: number;
  /** Số kim, chia đều quanh tâm (mặc định 1). */
  hands?: number;
  /** Máu mất khi trúng. */
  damage?: number;
}

/** Đổi BPM kể từ `beat`: tức thì, hoặc tăng/giảm dần trong `overBeats` beat. */
export interface TempoEvent {
  type: "tempo";
  beat: number;
  bpm: number;
  /** 0 hoặc bỏ trống = đổi ngay. */
  overBeats?: number;
}

export type BulletEvent = StraightEvent | AimedEvent | BurstEvent | SweepEvent;
export type PatternEvent = BulletEvent | TempoEvent;

export interface Pattern {
  name: string;
  /** BPM lúc bắt đầu mỗi vòng. Bỏ trống = RHYTHM_FEEL.defaultBpm. */
  bpm?: number;
  /** Độ dài một vòng, tính theo beat. */
  lengthBeats: number;
  /** Hết vòng thì lặp lại (BPM trở về `bpm` ở đầu vòng mới). */
  loop: boolean;
  events: readonly PatternEvent[];
}
