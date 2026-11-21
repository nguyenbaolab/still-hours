/**
 * Các con số "cảm giác" của nhịp, đạn và âm thanh. Sửa file này, lưu, trình duyệt tự tải lại.
 * (Cảm giác của người chơi: xem feel.ts.)
 *
 * Đơn vị: "px" là pixel logic (màn hình game 320×180, khung né 200×80).
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
}

export interface BulletFeel {
  /** Tốc độ đạn mặc định (px/giây). Mỗi sự kiện trong pattern có thể tự đặt `speed`. Người chơi đi 90 px/giây. */
  speed: number;
  /** Bán kính va chạm đạn nhỏ (px). Hình vẽ lớn hơn 0,5 px nên đạn trông "to hơn" vùng trúng, như hitbox của bánh răng. */
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
};

export const BULLET_FEEL: BulletFeel = {
  speed: 70,
  radius: 2.5,
  bigRadius: 4,
  damage: 4,
  telegraphBeats: 1,
  telegraphMinSeconds: 0.45,
  telegraphFlashSeconds: 0.08,
  handThickness: 3,
  maxBullets: 256,
};

export const AUDIO_FEEL: AudioFeel = {
  volume: 0.5,
  tickHz: 1800,
  tockHz: 1500,
  softnessHz: 5500,
};
