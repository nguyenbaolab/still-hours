/**
 * Cảm giác nét chì của cô bé, và đạn xao nhãng. Pixel logic trên màn 640×360.
 * Lực hút là ý tưởng cần thử: 0 tắt. Đang kéo bánh răng về phía đạn.
 */

export interface SketchFeel {
  /** Độ dày nét khi đi bình thường (px). */
  width: number;
  /** Độ dày nét khi giữ Shift. Đậm hơn. */
  slowWidth: number;
  /** Hai điểm lấy mẫu cách nhau ít nhất bấy nhiêu px. Đứng yên thì không có đoạn mới. */
  sampleDistance: number;
  /** Giữ Shift thì lấy mẫu dày hơn, nét mịn hơn. */
  slowSampleDistance: number;
  /** Tua lại nét đã vẽ lúc lộ tranh (giây). */
  replaySeconds: number;
  /** Sau khi tua xong, chỉ còn bức tranh trong bấy nhiêu giây. */
  revealSeconds: number;
  /** Độ dày nét lúc lộ tranh, chất sáp màu. */
  crayonWidth: number;
  crayonColor: string;
  /** Màu nét chì lúc chơi. */
  color: string;
}

export interface DistractionFeel {
  /** px/giây, kéo bánh răng về phía đạn. 0 = tắt. */
  pull: number;
  speed: number;
  /** Bán kính va chạm (px). Nhỏ hơn sprite. */
  radius: number;
  sprite: string;
  max: number;
  /** Sợi chỉ thả từ mép trên (px). */
  threadLength: number;
  /** Biên độ đung đưa của đạn treo (px). */
  swingAmplitude: number;
  /** Đung đưa nhanh bấy nhiêu radian mỗi beat. */
  swingPerBeat: number;
  /** Đạn treo tồn tại bao nhiêu beat. */
  hangBeats: number;
}

export const SKETCH_FEEL: SketchFeel = {
  width: 3,
  slowWidth: 6,
  sampleDistance: 8,
  slowSampleDistance: 3,
  replaySeconds: 2.8,
  revealSeconds: 3.5,
  crayonWidth: 9,
  crayonColor: "#f0b429",
  color: "#e6e0d4",
};

export const DISTRACTION_FEEL: DistractionFeel = {
  pull: 24,
  speed: 90,
  radius: 5,
  sprite: "distraction",
  max: 32,
  threadLength: 72,
  swingAmplitude: 40,
  swingPerBeat: 0.85,
  hangBeats: 8,
};
