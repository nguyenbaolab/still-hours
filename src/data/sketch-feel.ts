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

export interface PaperFeel {
  /** 0 = bánh răng chỉ đi lên xuống, khóa đúng cột giữa. */
  horizontalRange: number;
  /** Một vòng giấy dài bao nhiêu beat. Hết vòng thì giấy quay lại. */
  beatsPerPass: number;
  /** Bút chạm giấy khi điểm dưới ngòi cách nét của vòng hiện tại không quá bấy nhiêu px. */
  penRadius: number;
  /** Đuôi nét sau bánh răng lúc chơi (giây). */
  tailSeconds: number;
  /** Tua lại nét đã vẽ lúc lộ tranh (giây). */
  replaySeconds: number;
  /** Độ dày nét lúc lộ tranh, chất sáp màu. */
  crayonWidth: number;
  crayonColor: string;
  /** Cứ bấy nhiêu px dọc nét thì một cặp kim. */
  handSpacing: number;
  /** Độ cao khe giữa hai đầu kim (px). Lớn hơn hitbox. */
  gap: number;
  /** Kim giật theo mỗi beat (px). Khe dịch cả khối, không khép lại. */
  twitch: number;
  /** Bề dày kim (px). */
  handThickness: number;
  /** Chấm khép góc ở hai đầu khe (px). */
  tipRadius: number;
  /** Sợi chỉ thả từ mép trên (px). */
  threadLength: number;
  /** Biên độ đung đưa của đạn xao nhãng (px). */
  swingAmplitude: number;
  /** Đung đưa nhanh bấy nhiêu radian mỗi beat. */
  swingPerBeat: number;
  /** Đạn treo tồn tại bao nhiêu beat. */
  hangBeats: number;
}

export const PAPER_FEEL: PaperFeel = {
  horizontalRange: 0,
  beatsPerPass: 14,
  penRadius: 16,
  tailSeconds: 0.35,
  replaySeconds: 2.8,
  crayonWidth: 9,
  crayonColor: "#f0b429",
  handSpacing: 36,
  gap: 36,
  twitch: 4,
  handThickness: 6,
  tipRadius: 4,
  threadLength: 72,
  swingAmplitude: 40,
  swingPerBeat: 0.85,
  hangBeats: 8,
};
