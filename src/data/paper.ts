/** Một điểm trên tranh giấy. Toạ độ là tỉ lệ 0..1 của khung. */
export interface PaperPoint {
  x: number;
  y: number;
}

/**
 * Một nét của một vòng giấy. `x` tăng dần.
 * Các nét cùng `pass` không được chồng khoảng x.
 */
export interface PaperStroke {
  /** Vòng vẽ, bắt đầu từ 1. */
  pass: number;
  points: readonly PaperPoint[];
}

/** Tranh cần vẽ. Không hiện lúc chơi; chỉ quyết định lúc nào bút chạm giấy và khe kim nằm ở đâu. */
export interface PaperFigure {
  name: string;
  strokes: readonly PaperStroke[];
}
