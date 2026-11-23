import type { PaperFigure } from "../paper";

/**
 * Tranh trẻ con: mặt trời bên trái, một người, ngôi nhà, một người nữa, tay nắm nhau ở vòng sau.
 * Toạ độ 0..1 của khung 400×160. Mỗi nét có x tăng dần; các nét cùng vòng không chồng khoảng x.
 * Dốc đủ thoải để kịp đi ở 100 BPM, 14 beat một vòng.
 */
export const CHILD_DRAWING: PaperFigure = {
  name: "tranh trẻ con",
  strokes: [
    // Vòng 1: viền trên. Mặt trời, đầu người thứ nhất, mái và tường nhà (chân chạm đất), đầu người thứ hai.
    { pass: 1, points: [{ x: 0.11, y: 0.26 }, { x: 0.155, y: 0.15 }, { x: 0.205, y: 0.125 }, { x: 0.25, y: 0.225 }] },
    { pass: 1, points: [{ x: 0.35, y: 0.325 }, { x: 0.39, y: 0.2 }, { x: 0.435, y: 0.31 }] },
    { pass: 1, points: [{ x: 0.55, y: 0.74 }, { x: 0.615, y: 0.45 }, { x: 0.725, y: 0.25 }, { x: 0.835, y: 0.45 }, { x: 0.9, y: 0.74 }] },
    { pass: 1, points: [{ x: 0.94, y: 0.44 }, { x: 0.97, y: 0.3 }, { x: 0.997, y: 0.42 }] },

    // Vòng 2: viền dưới. Nửa dưới mặt trời và hai đầu, sàn nhà là mặt đất.
    // Khoảng x giữa các nét đủ để kịp đổi độ cao.
    { pass: 2, points: [{ x: 0.08, y: 0.28 }, { x: 0.13, y: 0.4 }, { x: 0.18, y: 0.42 }, { x: 0.22, y: 0.28 }] },
    { pass: 2, points: [{ x: 0.34, y: 0.34 }, { x: 0.4, y: 0.48 }, { x: 0.46, y: 0.34 }] },
    { pass: 2, points: [{ x: 0.58, y: 0.74 }, { x: 0.78, y: 0.76 }] },
    { pass: 2, points: [{ x: 0.9, y: 0.46 }, { x: 0.95, y: 0.6 }, { x: 0.99, y: 0.46 }] },

    // Vòng 3: cửa nhà và hai thân hình tam giác.
    { pass: 3, points: [{ x: 0.36, y: 0.48 }, { x: 0.4, y: 0.71 }, { x: 0.44, y: 0.48 }] },
    { pass: 3, points: [{ x: 0.67, y: 0.74 }, { x: 0.715, y: 0.49 }, { x: 0.785, y: 0.49 }, { x: 0.83, y: 0.74 }] },
    { pass: 3, points: [{ x: 0.925, y: 0.49 }, { x: 0.96, y: 0.72 }, { x: 0.995, y: 0.49 }] },

    // Vòng 4: hai người nắm tay, một nét ngang qua trước nhà.
    { pass: 4, points: [{ x: 0.44, y: 0.6 }, { x: 0.65, y: 0.68 }, { x: 0.925, y: 0.6 }] },
  ],
};
