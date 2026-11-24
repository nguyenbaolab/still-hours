/**
 * Các con số "cảm giác" của nhịp, đạn và âm thanh. Sửa file này, lưu, trình duyệt tự tải lại.
 * (Cảm giác của người chơi: xem feel.ts.)
 *
 * Đơn vị: "px" là pixel logic (màn hình game 640×360, khung né 400×160).
 */

export interface RhythmFeel {
  /** BPM mặc định cho pattern nào không tự khai báo `bpm`. 100 BPM = mỗi beat 0,6 giây. */
  defaultBpm: number;
  /** Thời gian dạo đầu (giây) từ lúc bắt đầu trận đến beat 0, để kịp nghe nhịp trước khi đạn đầu tiên. */
  leadInSeconds: number;
  /**
   * Chỉnh lệch hình–tiếng (giây). Game đã tự trừ độ trễ đầu ra mà trình duyệt báo, nhưng mỗi máy một khác
   * (loa Bluetooth trễ nhiều). Thấy đạn xuất hiện SỚM hơn tiếng "tích" → tăng số này (ví dụ 0.05);
   * thấy MUỘN hơn → giảm (có thể âm, ví dụ -0.05).
   */
  visualDelaySeconds: number;
  /**
   * Số beat một nhịp. Hồi hệ số nhịp áp ở đầu nhịp, một bước hằng, không tăng dần trong nhịp.
   * Cư dân 2 (bước 6) dùng chung hệ số này.
   */
  beatsPerBar: number;
}

export interface BulletFeel {
  /** Tốc độ đạn mặc định (px/giây). Mỗi sự kiện trong pattern có thể tự đặt `speed`. Người chơi đi 180 px/giây. */
  speed: number;
  /** Bán kính va chạm đạn nhỏ (px). Hình vẽ lớn hơn 1 px nên đạn trông "to hơn" vùng trúng, như hitbox của bánh răng. */
  radius: number;
  /** Đạn có bán kính từ mức này trở lên được coi là LỚN: bắt buộc có cảnh báo (công bằng). */
  bigRadius: number;
  /** Máu mất khi trúng, nếu sự kiện không tự đặt `damage`. */
  damage: number;
  /** Cảnh báo (nhấp nháy) trước khi đạn nguy hiểm xuất hiện, tính theo beat. */
  telegraphBeats: number;
  /** Nhưng không bao giờ ngắn hơn số giây này (BPM cao thì 1 beat quá ngắn để kịp nhìn). */
  telegraphMinSeconds: number;
  /** Chu kỳ nhấp nháy của cảnh báo (giây cho mỗi lần hiện hoặc ẩn). */
  telegraphFlashSeconds: number;
  /** Độ dày của kim đồng hồ (px). */
  handThickness: number;
  /** Số đạn tối đa cùng lúc (kích thước pool). Hết chỗ thì đạn mới bị bỏ qua. */
  maxBullets: number;
}

export interface AudioFeel {
  /** Âm lượng tổng, 0 đến 1. Nghe liên tục 3 phút nên đừng để cao. */
  volume: number;
  /** Cao độ "tích" (Hz). */
  tickHz: number;
  /** Cao độ "tắc" (Hz). Thấp hơn "tích" một chút (khoảng một quãng ba thứ). */
  tockHz: number;
  /** Tần số cắt cao (Hz): thấp hơn → tiếng "ấm", đục hơn; cao hơn → sắc, chói hơn. */
  softnessHz: number;
}

export const RHYTHM_FEEL: RhythmFeel = {
  defaultBpm: 100,
  leadInSeconds: 2.0,
  visualDelaySeconds: 0,
  beatsPerBar: 4,
};

/**
 * Hệ số nhịp: nhân lên BPM kịch bản, luôn nằm trong (0, 1]. Dùng chung, không gắn một cư dân.
 * Trúng câu hạ ngay từ beat nguyên kế tiếp; câu đi qua hồi một nấc ở đầu nhịp kế.
 * Sàn 0,7 (chốt ở mốc 6.3, trước là 0,8): 100 → 80 BPM nghe chậm nhưng chưa ra "kéo lê", 70 BPM thì rõ. 1 / 0,7 ≈ 1,43:
 * ôm hết mọi câu thì lượt dài nhất 1,43 lần kịch bản; ôm khoảng một nửa thì ≤ ~1,2 lần vì hồi ở mỗi câu đi qua.
 */
export interface PaceFeel {
  floor: number;
  drop: number;
  recover: number;
}

export const PACE_FEEL: PaceFeel = {
  floor: 0.7,
  drop: 0.1,
  recover: 0.1,
};

/**
 * Mặt đồng hồ trễ (cư dân 3, boss lượt 3), ngay ngoài góc phải trên của khung. Kim mờ chỉ giờ thật đã trôi, kim sáng
 * chỉ giờ kịch bản của beat đang nghe; ôm câu thì kim sáng tụt lại. Không chữ, không số.
 */
export interface LagClockFeel {
  radius: number;
  /** Một vòng mặt số = chừng này giây. */
  secondsPerTurn: number;
  /** Màu kim giờ thật (mờ) và kim giờ kịch bản (sáng). */
  realColor: string;
  scriptColor: string;
}

export const LAG_CLOCK_FEEL: LagClockFeel = {
  radius: 14,
  secondsPerTurn: 60,
  realColor: "#6b6252",
  scriptColor: "#f0b429",
};

/** Đạn chữ: một câu ngắn bay qua khung. Trúng không trừ máu, chỉ hạ hệ số nhịp. */
export interface WordFeel {
  fontSize: number;
  /** Bề ngang một ký tự so với cỡ chữ. Font monospace, đủ để không đo chữ trong update. */
  advanceEm: number;
  /** Hitbox = khung chữ nhân hệ số này, cùng nguyên tắc hitbox nhỏ hơn hình vẽ. */
  hitboxScale: number;
  speed: number;
  /** Câu đi hết khung thì tan trong bấy nhiêu giây. */
  fadeSeconds: number;
  /** Câu bị ôm thì nổ trong bấy nhiêu giây. */
  absorbSeconds: number;
  maxWords: number;
  color: string;
}

export const WORD_FEEL: WordFeel = {
  fontSize: 16,
  advanceEm: 0.6,
  hitboxScale: 0.7,
  speed: 100,
  fadeSeconds: 0.4,
  absorbSeconds: 0.28,
  maxWords: 32,
  color: "#d8c4b0",
};

/** Khung chữ và hitbox, tính từ số ký tự. Không gọi measureText. */
export function wordBox(phrase: string, feel: WordFeel = WORD_FEEL): { w: number; h: number; hitW: number; hitH: number } {
  const w = phrase.length * feel.fontSize * feel.advanceEm;
  const h = feel.fontSize;
  return { w, h, hitW: w * feel.hitboxScale, hitH: h * feel.hitboxScale };
}

export const BULLET_FEEL: BulletFeel = {
  speed: 140,
  radius: 5,
  bigRadius: 8,
  damage: 4,
  telegraphBeats: 1,
  telegraphMinSeconds: 0.45,
  telegraphFlashSeconds: 0.08,
  handThickness: 6,
  maxBullets: 256,
};

export const AUDIO_FEEL: AudioFeel = {
  volume: 0.5,
  tickHz: 1800,
  tockHz: 1500,
  softnessHz: 5500,
};
