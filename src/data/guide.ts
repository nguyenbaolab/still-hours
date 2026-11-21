/** Một điểm trên hình cần vẽ. Toạ độ là tỉ lệ 0..1 của khung né. */
export interface GuidePoint {
  x: number;
  y: number;
  /** Beat mà đốm sáng tới điểm này. */
  beat: number;
  /**
   * Khúc kết thúc tại điểm này là khúc chi tiết.
   * Đốm sáng trên khúc đó không được nhanh hơn tốc độ đi chậm.
   */
  detail?: boolean;
}

/** Đường gấp khúc đốm sáng đi theo. Không vẽ cả hình lúc chơi. */
export interface GuideFigure {
  name: string;
  points: readonly GuidePoint[];
}
