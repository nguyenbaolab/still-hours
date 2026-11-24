import type { AudioPort } from "../audio/audio-engine";
import { GAME_HEIGHT, GAME_WIDTH, TICK_RATE } from "../core/config";
import { DEBUG } from "../core/debug";
import type { Input } from "../core/input";
import type { Renderer } from "../core/renderer";
import { FLOW_FEEL } from "../data/flow-feel";
import type { Scene } from "./scene";

type Mode = "idle" | "out" | "in";

const COLOR = { fade: "#000000", hint: "#8a7f68", debug: "#e0524a" } as const;

/**
 * Giữ cảnh hiện tại và chuyển cảnh có mờ đen `FLOW_FEEL.fadeSeconds`. Cũng giữ những việc chung của mọi cảnh:
 * cờ debug (F1), tắt/bật tiếng (M) và nhãn "tắt tiếng", và đếm thời gian chơi theo tick.
 *
 * Chuyển cảnh: cảnh cũ đứng yên và mờ đi; mờ xong thì cảnh mới được dựng (gọi `make`) và chỉ từ lúc đó mới được `update`,
 * rồi mờ vào. Nhờ vậy đồng hồ nhịp của cảnh mới (nếu có) bắt đầu sau khi màn đã đen.
 */
export class Director {
  /** Giây đã chơi: cộng 1/TICK_RATE mỗi tick của mọi cảnh có tính (xem `Scene.countsPlayTime`). */
  playSeconds = 0;

  private mode: Mode = "idle";
  private clock = 0;
  private pending: (() => Scene) | null = null;

  constructor(
    private readonly input: Input,
    private readonly audio: AudioPort,
    private current: Scene,
  ) {}

  get scene(): Scene {
    return this.current;
  }

  get transitioning(): boolean {
    return this.mode !== "idle";
  }

  /** Mờ đen rồi đổi sang cảnh do `make` dựng. Đang chuyển thì lấy cảnh mới nhất làm đích. */
  fadeTo(make: () => Scene): void {
    this.pending = make;
    if (this.mode === "out") return;
    // Đang mờ vào thì mờ ra tiếp từ mức đen hiện tại, không nhảy.
    this.clock = this.mode === "in" ? Math.max(0, FLOW_FEEL.fadeSeconds - this.clock) : 0;
    this.mode = "out";
  }

  /** Đổi cảnh ngay, không mờ (lúc khởi động hoặc nhảy cóc). */
  cut(scene: Scene): void {
    this.current = scene;
    this.mode = "idle";
    this.pending = null;
    this.clock = 0;
  }

  update(): void {
    if (this.input.wasPressed("debug")) DEBUG.on = !DEBUG.on;
    if (this.input.wasPressed("mute")) this.audio.toggleMute();

    const dt = 1 / TICK_RATE;
    if (this.current.countsPlayTime !== false) this.playSeconds += dt;

    switch (this.mode) {
      case "idle":
        this.current.update();
        return;
      case "out": {
        this.clock += dt;
        if (this.clock >= FLOW_FEEL.fadeSeconds && this.pending) {
          const make = this.pending;
          this.pending = null;
          this.current = make();
          this.mode = "in";
          this.clock = 0;
        }
        return;
      }
      case "in": {
        this.current.update();
        this.clock += dt;
        if (this.clock >= FLOW_FEEL.fadeSeconds) {
          this.mode = "idle";
          this.clock = 0;
        }
        return;
      }
    }
  }

  /** Độ phủ đen, 0..1. */
  get cover(): number {
    if (this.mode === "out") return Math.min(1, this.clock / FLOW_FEEL.fadeSeconds);
    if (this.mode === "in") return Math.max(0, 1 - this.clock / FLOW_FEEL.fadeSeconds);
    return 0;
  }

  render(renderer: Renderer, alpha: number): void {
    this.current.render(renderer, alpha);
    const cover = this.cover;
    if (cover > 0) {
      renderer.setAlpha(cover);
      renderer.rect(0, 0, GAME_WIDTH, GAME_HEIGHT, COLOR.fade);
      renderer.setAlpha(1);
    }
    if (this.audio.muted) {
      renderer.text("tắt tiếng (M)", GAME_WIDTH - 8, 8, { size: 16, align: "right", color: COLOR.hint });
    }
    if (DEBUG.session) {
      renderer.text("DEBUG · không lưu", GAME_WIDTH - 8, 28, { size: 16, align: "right", color: COLOR.debug });
    }
  }
}
