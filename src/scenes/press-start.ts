import { GAME_WIDTH } from "../core/config";
import type { Renderer } from "../core/renderer";
import type { Scene } from "./scene";

/** Chỉ cần biết đã mở khóa âm thanh chưa; AudioEngine tự lắng nghe lần tương tác đầu tiên của người dùng. */
export interface AudioGate {
  readonly ready: boolean;
}

/**
 * Màn "Nhấn phím bất kỳ để bắt đầu". Trình duyệt chỉ cho phát âm thanh sau khi người dùng tương tác với trang,
 * nên trận không bắt đầu cho tới khi AudioEngine báo `ready`.
 */
export class PressStartScene implements Scene {
  private tick = 0;

  constructor(private readonly audio: AudioGate) {}

  get ready(): boolean {
    return this.audio.ready;
  }

  update(): void {
    this.tick++;
  }

  render(renderer: Renderer): void {
    const cx = GAME_WIDTH / 2;
    renderer.clear("#0b0908");
    renderer.sprite("gear", cx - 4, 34);
    renderer.text("Still Hours", cx, 52, { size: 24, align: "center", color: "#d8c9a3" });

    // Nhấp nháy chậm: hiện 40 tick, ẩn 20 tick.
    if (this.tick % 60 < 40) {
      renderer.text("Nhấn phím bất kỳ để bắt đầu", cx, 104, { size: 12, align: "center", color: "#ffffff" });
    }

    renderer.text("Mũi tên / WASD: di chuyển     Shift: đi chậm", cx, 138, { size: 8, align: "center", color: "#8a7f68" });
    renderer.text("M: tắt/bật tiếng     F1: debug", cx, 150, { size: 8, align: "center", color: "#8a7f68" });
  }
}
