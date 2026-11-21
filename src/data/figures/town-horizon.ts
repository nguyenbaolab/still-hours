import type { GuideFigure } from "../guide";

/**
 * Chân trời thị trấn, một nét từ trái sang phải, vừa khung 400×160.
 * Mái nhà hai bên đi khoảng 22 px/giây. Tháp đồng hồ ở giữa là khúc chi tiết, khoảng 14 px/giây.
 * 100 BPM, điểm cuối ở beat 55,9 ≈ 34 giây; vòng pattern 60 beat thì tranh lộ ngay sau đó.
 */
export const TOWN_HORIZON: GuideFigure = {
  name: "chân trời",
  points: [
    { x: 0.03, y: 0.75, beat: 0 },
    { x: 0.14, y: 0.75, beat: 3.33 },
    { x: 0.175, y: 0.6, beat: 5.44 },
    { x: 0.27, y: 0.6, beat: 8.32 },
    { x: 0.305, y: 0.75, beat: 10.42 },
    { x: 0.42, y: 0.75, beat: 13.91 },
    { x: 0.45, y: 0.65, beat: 15.42 },
    { x: 0.525, y: 0.65, beat: 17.69 },
    { x: 0.555, y: 0.75, beat: 19.21 },
    { x: 0.62, y: 0.75, beat: 21.18 },
    { x: 0.64, y: 0.225, beat: 31.22, detail: true },
    { x: 0.67, y: 0.138, beat: 33.42, detail: true },
    { x: 0.75, y: 0.138, beat: 37.23, detail: true },
    { x: 0.78, y: 0.225, beat: 39.42, detail: true },
    { x: 0.8, y: 0.75, beat: 49.47, detail: true },
    { x: 0.9, y: 0.75, beat: 52.5 },
    { x: 0.93, y: 0.625, beat: 54.27 },
    { x: 0.98, y: 0.675, beat: 55.9 },
  ],
};
