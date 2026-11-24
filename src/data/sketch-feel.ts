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

/** Cây bút chì và trang vẽ của cô bé (cư dân 4, "Nhặt bút"). */
export interface DrawFeel {
  /** Tâm bánh răng cách tâm bút không quá bấy nhiêu px thì cầm bút. */
  pickupRadius: number;
  /** Sau khi bút rơi, chờ bấy nhiêu giây mới nhặt lại được. */
  pickupDelaySeconds: number;
  /** Bút văng xa bấy nhiêu px khi rơi. */
  dropDistance: number;
  /** Bút rơi không sát mép khung hơn bấy nhiêu px. */
  dropMargin: number;
  /** Bút nằm yên thì lóe sáng mỗi bấy nhiêu beat. */
  glintEveryBeats: number;
  /** Độ đậm của nét lúc chơi (0..1). */
  liveInkAlpha: number;
  /** Quá số đoạn này thì thôi ghi nét, nhưng tiến độ vẫn tính. */
  maxSegments: number;
  /** Beat nghe được của lần chơi đạt bấy nhiêu vòng pattern thì trang tự khép dù chưa vẽ đủ. */
  maxLoops: number;
  /** Bánh răng phải dịch ít nhất bấy nhiêu px trong một tick thì tính là đang vẽ. */
  minMovePerTick: number;
  /** Bán kính mặt đồng hồ của cô bé (px). */
  clockRadius: number;
  /** Câu tự nhủ hiện bấy nhiêu giây. */
  idleLineSeconds: number;
  /** Tối đa bấy nhiêu câu tự nhủ mỗi lượt. */
  idleLineMax: number;
}

export const DRAW_FEEL: DrawFeel = {
  pickupRadius: 14,
  pickupDelaySeconds: 0.3,
  dropDistance: 56,
  dropMargin: 20,
  glintEveryBeats: 4,
  liveInkAlpha: 0.45,
  maxSegments: 6000,
  maxLoops: 3,
  minMovePerTick: 0.5,
  clockRadius: 14,
  idleLineSeconds: 3,
  idleLineMax: 3,
};
