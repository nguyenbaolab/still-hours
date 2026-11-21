/**
 * TẠM THỜI (bước 1: di chuyển + va chạm + máu). Vật cản để thử va chạm.
 * Bước 2 sẽ thay bằng đạn thật theo beat (pattern đạn nằm trong src/data/) và xóa file này.
 */
export interface TempObstacleData {
  /** Vị trí góc trên trái, tính từ góc trên trái của khung né (px). */
  x: number;
  y: number;
  /** Kích thước (px). */
  w: number;
  h: number;
  /** Vận tốc (px/giây). Vật cản nảy lại khi chạm mép khung. 0 = đứng yên. */
  vx: number;
  vy: number;
  /** Máu mất mỗi lần trúng. */
  damage: number;
}

export const TEMP_OBSTACLES: readonly TempObstacleData[] = [
  // Thanh đứng yên bên trái: dùng để thử lướt sát mép (hitbox nhỏ hơn hình vẽ nên bánh răng có thể chồng nhẹ mà không trúng).
  { x: 40, y: 20, w: 8, h: 40, vx: 0, vy: 0, damage: 4 },
  // Khối chạy ngang.
  { x: 70, y: 10, w: 10, h: 10, vx: 70, vy: 0, damage: 4 },
  // Khối chạy dọc.
  { x: 150, y: 0, w: 10, h: 10, vx: 0, vy: 50, damage: 4 },
  // Khối nảy chéo.
  { x: 170, y: 60, w: 8, h: 8, vx: 45, vy: 30, damage: 4 },
];
