/**
 * TẤT CẢ con số "cảm giác" của người chơi nằm ở đây. Sửa file này, lưu, trình duyệt tự tải lại.
 *
 * Đơn vị: "px" là pixel logic (màn hình game rộng 640, cao 360; khung né rộng 400, cao 160).
 * Tốc độ tính theo px/giây, thời gian tính theo giây; code tự quy ra theo số tick.
 */
export interface PlayerFeel {
  /** Tốc độ đi bình thường (px/giây). Tăng → nhanh hơn, khó dừng đúng chỗ; giảm → nặng nề, dễ bị đạn đuổi kịp. */
  speed: number;
  /** Tốc độ khi giữ Shift (px/giây). Nên nhỏ hơn `speed` khoảng một nửa để thấy rõ khác biệt. */
  slowSpeed: number;
  /** Cạnh hitbox (hình vuông, px). Hình bánh răng vẽ 18px (dữ liệu 9px, scale 2); hitbox nhỏ hơn thì người chơi thấy mình né sát mà vẫn không bị trúng. */
  hitboxSize: number;
  /** Thời gian bất tử sau khi bị trúng (giây). Trong lúc này bánh răng nhấp nháy và không mất máu thêm. */
  invincibleSeconds: number;
  /** Chu kỳ nhấp nháy khi bất tử (giây cho mỗi lần ẩn hoặc hiện). Chỉ ảnh hưởng hình ảnh. */
  blinkSeconds: number;
  /** Máu tối đa. */
  maxHp: number;
}

export const PLAYER_FEEL: PlayerFeel = {
  speed: 180,
  slowSpeed: 80,
  hitboxSize: 10,
  invincibleSeconds: 1.0,
  blinkSeconds: 0.08,
  maxHp: 20,
};
