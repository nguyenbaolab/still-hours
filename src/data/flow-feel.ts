/**
 * Cảm giác của luồng game: chuyển cảnh, thua, dọn đạn. Giây.
 * Các số của hội thoại, thị trấn, đứng yên, lưu tiến trình thêm vào đây ở các mốc sau.
 */
export interface FlowFeel {
  /** Mờ đen giữa mọi cảnh và giữa các pha. */
  fadeSeconds: number;
  /** Pha né kiểu `length` xong: đạn còn lại mờ đi trong bấy nhiêu giây, không trừ máu. */
  clearSeconds: number;
  /** Màn thua: bánh răng nứt nằm yên giữa màn tối. */
  loseHoldSeconds: number;
  /** Sau khi vết nứt khép lại (bánh răng lành), chờ bấy nhiêu giây rồi pha né mờ vào lại. */
  mendSeconds: number;
}

export const FLOW_FEEL: FlowFeel = {
  fadeSeconds: 0.4,
  clearSeconds: 0.6,
  loseHoldSeconds: 1.2,
  mendSeconds: 0.35,
};
