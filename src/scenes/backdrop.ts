import type { Rect } from "../core/math";
import type { Renderer } from "../core/renderer";
import { BACKDROPS } from "../data/backdrops";

/**
 * Vẽ một cảnh nền (`BACKDROPS`) vào `area`, mờ `alpha` (0..1). Hình khối trôi ngang theo `seconds` nếu có `drift`.
 * Cắt trong `area`. Không có cảnh nào tên đó thì không vẽ gì.
 */
export function drawBackdrop(renderer: Renderer, id: string, area: Rect, alpha: number, seconds: number): void {
  const backdrop = BACKDROPS[id];
  if (!backdrop || !(alpha > 0)) return;
  renderer.clip(area.x, area.y, area.w, area.h);
  renderer.setAlpha(alpha);
  renderer.rect(area.x, area.y, area.w, area.h, backdrop.sky);
  for (const shape of backdrop.shapes) {
    const shift = shape.drift ? (((shape.drift * seconds) % 1) + 1) % 1 : 0;
    // Vẽ hai lần lệch một khung để trôi vòng lại không hở.
    for (const wrap of shift === 0 ? [0] : [0, -1]) {
      const offset = shift + wrap;
      if (shape.kind === "rect") {
        renderer.rect(area.x + (shape.x + offset) * area.w, area.y + shape.y * area.h, shape.w * area.w, shape.h * area.h, shape.color);
      } else {
        renderer.disc(area.x + (shape.x + offset) * area.w, area.y + shape.y * area.h, shape.r * area.h, shape.color);
      }
    }
  }
  renderer.setAlpha(1);
  renderer.unclip();
}
