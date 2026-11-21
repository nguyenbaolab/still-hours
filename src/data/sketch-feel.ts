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
  /** Mỗi lần chạm đạn xao nhãng, tẩy bấy nhiêu px đường đi, từ nét mới nhất. */
  eraseLength: number;
  /** Cục gôm chạy ngược theo đường nhanh bấy nhiêu (px/giây). */
  eraserSpeed: number;
  /** Vết tẩy còn đậm bao nhiêu. 0 = biến mất hẳn. */
  erasedAlpha: number;
  /** Cuối vòng, chỉ còn bức tranh trong bấy nhiêu giây. */
  revealSeconds: number;
  color: string;
  eraserColor: string;
}

export interface DistractionFeel {
  /** px/giây, kéo bánh răng về phía đạn. 0 = tắt. */
  pull: number;
  speed: number;
  /** Bán kính va chạm (px). Nhỏ hơn sprite. */
  radius: number;
  sprite: string;
  max: number;
}

export const SKETCH_FEEL: SketchFeel = {
  width: 3,
  slowWidth: 6,
  sampleDistance: 8,
  slowSampleDistance: 3,
  eraseLength: 120,
  eraserSpeed: 360,
  erasedAlpha: 0.16,
  revealSeconds: 3.5,
  color: "#e6e0d4",
  eraserColor: "#f2c1c8",
};

export const DISTRACTION_FEEL: DistractionFeel = {
  pull: 24,
  speed: 90,
  radius: 5,
  sprite: "distraction",
  max: 32,
};
