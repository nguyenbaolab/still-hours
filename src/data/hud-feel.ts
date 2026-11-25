/**
 * Tiến độ, sao, gợi ý và điểm của trận. Pixel logic 640×360; giây là giây nghe được.
 *
 * "Điểm" (CLAUDE.md chưa có, định nghĩa ở đây): tháo xong một bộ phận = `points.part`; pha né qua mỗi mốc tiến độ trong
 * `milestones` = `points.milestone`. Điểm chỉ để phát sự kiện `score` (xem docs/events.md); game không hiện tổng điểm.
 *
 * Vùng góc trên trái (x < 120, y < 96) dành cho nhân vật hướng dẫn: không vẽ gì ở đó (kiểm bằng test `progress-hud`).
 */

export interface HudFeel {
  points: { part: number; milestone: number };
  /** Các mốc tiến độ (0..1) của pha né mà mỗi lần qua là một lần ghi điểm. */
  milestones: readonly number[];
  /** Tiến độ từ mức này trở lên là "gần thắng". */
  nearWinFraction: number;
  /**
   * Sao theo máu còn lại lúc thắng pha né (tỉ lệ máu tối đa): từ `three` trở lên được 3 sao, từ `two` được 2, còn lại 1.
   * Thắng là luôn có ít nhất 1 sao.
   */
  stars: { three: number; two: number };
  /** Thua bấy nhiêu lần ở cùng một lượt né thì hiện gợi ý riêng theo loại pha. */
  hintAfterLosses: number;
  /** Thua bấy nhiêu lần thì phát sự kiện `stuck` (từ đó mỗi lần thua phát một lần nữa). */
  stuckAfterLosses: number;
  /** Thua bấy nhiêu lần thì hiện thêm gợi ý chung (Shift, cảnh báo). */
  generalHintAfterLosses: number;
  /** Pha tháo: bấy nhiêu giây không tháo thêm được gì (không có nấc vặn, không tháo xong bộ phận) thì hiện gợi ý và phát `stuck`. */
  idleSeconds: number;
  /** Gợi ý hiện dần trong bấy nhiêu giây. */
  hintFadeSeconds: number;
  /** Màn thắng lượt: bảng sao hiện ở pha tháo ngay sau đó trong bấy nhiêu giây đầu. */
  starsBannerSeconds: number;
}

export const HUD_FEEL: HudFeel = {
  points: { part: 10, milestone: 5 },
  milestones: [0.25, 0.5, 0.75],
  nearWinFraction: 0.75,
  stars: { three: 0.75, two: 0.4 },
  hintAfterLosses: 2,
  stuckAfterLosses: 3,
  generalHintAfterLosses: 4,
  idleSeconds: 12,
  hintFadeSeconds: 0.6,
  starsBannerSeconds: 3,
};

/** Vị trí các phần tử HUD (pixel logic). Hàng thanh tiến độ nằm trên khung né, ngoài vùng của nhân vật hướng dẫn. */
export interface HudLayout {
  /** Thanh tiến độ, sát mép trên màn (trên cả khung né lẫn bàn tháo, bàn tháo bắt đầu từ y = 24). Bắt đầu từ x = 120. */
  bar: { x: number; y: number; w: number; h: number };
  /** Nhãn "Lượt 1/3" nằm trên thanh. */
  labelY: number;
  /** Gợi ý: mép trên dòng đầu (dưới thanh máu của pha né, dưới câu ký ức của pha tháo). */
  hintY: number;
  /** Mỗi ngôi sao là lưới 7×7 điểm ảnh; đây là cạnh một điểm ảnh (px). Ngôi sao rộng 7 × số này. */
  starPixel: number;
  /** Khoảng cách giữa hai ngôi sao trong một nhóm, và giữa hai nhóm (px). */
  starGap: number;
  groupGap: number;
}

export const HUD_LAYOUT: HudLayout = {
  bar: { x: 120, y: 20, w: 400, h: 4 },
  labelY: 2,
  hintY: 318,
  starPixel: 2,
  starGap: 2,
  groupGap: 10,
};

/** Giới hạn vùng dành cho nhân vật hướng dẫn: không vẽ HUD trong hình chữ nhật này. */
export const GUIDE_ZONE = { x: 0, y: 0, w: 120, h: 96 } as const;

export const HUD_COLOR = {
  barBack: "#2a2520",
  barFill: "#f0b429",
  barNear: "#f2d23c",
  label: "#b9ad92",
  star: "#f2d23c",
  starEmpty: "#3a342c",
  hint: "#d8c9a3",
} as const;

/** Gợi ý khi kẹt. Tiếng Việt, ngắn, một dòng ≤ ~60 ký tự (cỡ chữ 16). */
export const HINTS = {
  /** Gợi ý riêng theo loại pha né. */
  dodge: {
    pencil: "Chạm vào cây bút để cầm, rồi cứ đi là có nét. Tránh những thứ lấp lánh.",
    still: "Đứng yên một lúc thì nhịp chậm lại và đạn thưa ra.",
    exit: "Một đoạn viền khung sẽ nhấp nháy rồi mở. Bước ra khỏi khung qua đó.",
    word: "Câu chữ không mất máu, chỉ làm chậm nhịp. Cứ né đạn trước.",
    plain: "Đạn nhấp nháy báo trước chỗ nó xuất hiện. Đứng ở chỗ trống.",
  },
  /** Gợi ý chung, hiện thêm khi thua nhiều. */
  dodgeGeneral: "Giữ Shift để đi chậm, né sát hơn. Hitbox nhỏ hơn hình bánh răng.",
  disassemble: {
    blocked: "Bộ phận đang sáng chặn nó. Chọn bộ phận đó và tháo trước.",
    unscrewRhythmic: "Bấm Z đúng lúc nghe tiếng tích hoặc tắc. Mỗi con ốc cần vài lần.",
    unscrew: "Bấm Z vài lần để vặn con ốc.",
    lift: "Giữ Z cho tới khi thanh nhỏ dưới bộ phận đầy.",
    unhookRhythmic: "Bấm Z một lần, đúng lúc nghe tiếng tích hoặc tắc.",
    unhook: "Bấm Z một lần để gỡ.",
    move: "Mũi tên để chọn bộ phận khác.",
  },
} as const;
