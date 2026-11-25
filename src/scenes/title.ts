import type { BackgroundTicker } from "../audio/background-ticker";
import { GAME_HEIGHT, GAME_WIDTH } from "../core/config";
import { ACTIONS, type Input } from "../core/input";
import { doubleFrame, type Renderer } from "../core/renderer";
import type { Scene } from "./scene";

const COLOR = {
  background: "#100e0c",
  footer: "#0c0a09",
  brass: "#e0c48a",
  brassDim: "#8a7f68",
  paper: "#f4efe4",
  title: "#f0e2c4",
  panel: "#1a1612",
  gap: "#2a241c",
} as const;

/** Chỉ cần biết đã mở khóa âm thanh chưa; AudioEngine tự lắng nghe lần tương tác đầu tiên của người dùng. */
export interface AudioGate {
  readonly ready: boolean;
}

/** Phần của kho lưu mà màn bắt đầu cần. Kho thật (mốc 5.2) hiện thực nó; test dùng bản giả. */
export interface SaveInfo {
  /** Có bản lưu dùng được không. */
  exists(): boolean;
  /** Xóa bản lưu cũ. */
  clear(): void;
}

export type TitleResult = "new" | "continue";

type Phase = "press" | "menu" | "confirmReset" | "done";

const MENU = ["Tiếp tục", "Bắt đầu lại"] as const;

/**
 * Màn bắt đầu: bánh răng, "Still Hours", dòng nhấp nháy "Chạm hoặc nhấn phím để bắt đầu". Lần chạm hoặc phím đầu mở khóa
 * âm thanh (trình duyệt chỉ cho phát sau một thao tác), nên màn chờ `audio.ready` và chưa tích tắc trước bước đó. Sau đó: không có bản lưu thì vào thẳng màn
 * mở đầu (`result` = "new"); có bản lưu thì hiện menu "Tiếp tục" / "Bắt đầu lại" (lên/xuống, confirm). "Bắt đầu lại"
 * hỏi thêm một dòng trước khi xóa bản lưu cũ.
 */
export class TitleScene implements Scene {
  readonly countsPlayTime = false;

  private tick = 0;
  private phase: Phase = "press";
  private choice = 0;
  private outcome: TitleResult | null = null;
  /** Âm thanh đã mở khóa từ trước (quay lại màn bắt đầu sau màn kết): phải đợi một phím thật, không tự đi tiếp. */
  private readonly needsKey: boolean;
  private ticker: BackgroundTicker | null = null;

  constructor(
    private readonly audio: AudioGate,
    private readonly input: Input,
    private readonly save: SaveInfo,
    /** Dựng tiếng tích của màn (mỗi giây một tiếng) khi âm thanh đã sẵn sàng. Bỏ trống: màn im lặng. */
    private readonly makeTicker?: () => BackgroundTicker,
  ) {
    this.needsKey = audio.ready;
  }

  /** Người chơi đã chọn xong. */
  get result(): TitleResult | null {
    return this.outcome;
  }

  /** Dòng đang chọn trong menu (0 = Tiếp tục, 1 = Bắt đầu lại). */
  get selected(): number {
    return this.choice;
  }

  get inMenu(): boolean {
    return this.phase === "menu";
  }

  get confirmingReset(): boolean {
    return this.phase === "confirmReset";
  }

  update(): void {
    this.tick++;
    switch (this.phase) {
      case "press": {
        if (!this.audio.ready) break;
        if (this.needsKey && !ACTIONS.some((action) => this.input.wasPressed(action))) break;
        if (this.save.exists()) {
          this.phase = "menu";
          this.choice = 0;
        } else {
          this.finish("new");
        }
        break;
      }
      case "menu": {
        if (this.input.wasPressed("up")) this.choice = (this.choice + MENU.length - 1) % MENU.length;
        else if (this.input.wasPressed("down")) this.choice = (this.choice + 1) % MENU.length;
        else if (this.input.wasPressed("confirm")) {
          if (this.choice === 0) this.finish("continue");
          else this.phase = "confirmReset";
        }
        break;
      }
      case "confirmReset": {
        if (this.input.wasPressed("confirm")) {
          this.save.clear();
          this.finish("new");
        } else if (this.input.wasPressed("cancel")) {
          this.phase = "menu";
        }
        break;
      }
      case "done":
        break;
    }
    // Tích tắc chỉ sau bước chạm/bấm (đã rời màn "nhấn để bắt đầu") và khi âm thanh đã mở khóa.
    if (this.phase !== "done" && this.phase !== "press") {
      if (!this.ticker && this.audio.ready && this.makeTicker) this.ticker = this.makeTicker();
      this.ticker?.update();
    }
  }

  private finish(result: TitleResult): void {
    this.phase = "done";
    this.outcome = result;
    this.leave();
  }

  /** Rời màn: hủy tiếng tích đã hẹn. */
  leave(): void {
    this.ticker?.stop();
    this.ticker = null;
  }

  render(renderer: Renderer): void {
    const cx = GAME_WIDTH / 2;
    renderer.clear(COLOR.background);
    this.drawBezel(renderer);

    const gear = renderer.sprites.size("gear");
    const gearY = 52;
    const gearCy = gearY + gear.height / 2;
    renderer.ring(cx, gearCy, 28, COLOR.gap, 2);
    renderer.ring(cx, gearCy, 22, COLOR.brass, 1);
    renderer.sprite("gear", cx - gear.width / 2, gearY);
    renderer.text("Still Hours", cx, 96, { size: 48, align: "center", color: COLOR.title });
    renderer.rect(cx - 72, 150, 144, 2, COLOR.brass);

    if (this.phase === "press" || this.phase === "done") {
      // Nhấp nháy chậm: hiện 40 tick, ẩn 20 tick.
      if (this.tick % 60 < 40) {
        renderer.text("Chạm hoặc nhấn phím để bắt đầu", cx, 196, { size: 24, align: "center", color: COLOR.paper });
        renderer.rect(cx - 28, 226, 56, 2, COLOR.brass);
      }
    } else if (this.phase === "menu") {
      doubleFrame(renderer, cx - 132, 176, 264, 78, COLOR.brass, COLOR.gap, COLOR.panel);
      MENU.forEach((label, i) => {
        const on = i === this.choice;
        const y = 188 + i * 32;
        if (on) renderer.rect(cx - 116, y - 2, 3, 24, COLOR.brass);
        renderer.text(`${on ? "> " : "  "}${label}`, cx, y, {
          size: 24,
          align: "center",
          color: on ? COLOR.paper : COLOR.brassDim,
        });
      });
    } else {
      doubleFrame(renderer, cx - 156, 176, 312, 78, COLOR.brass, COLOR.gap, COLOR.panel);
      renderer.text("Xóa tiến trình cũ?", cx, 190, { size: 24, align: "center", color: COLOR.paper });
      renderer.text("Xác nhận: có · Huỷ: không", cx, 222, { size: 20, align: "center", color: COLOR.brass });
    }

    renderer.rect(0, 262, GAME_WIDTH, GAME_HEIGHT - 262, COLOR.footer);
    renderer.rect(0, 262, GAME_WIDTH, 2, COLOR.gap);
    renderer.text("Mũi tên / WASD: di chuyển     Shift: đi chậm     Z: xác nhận", cx, 276, {
      size: 16,
      align: "center",
      color: COLOR.brassDim,
    });
    renderer.text("X: giữ để tua chữ     M: tắt/bật tiếng     F1: debug", cx, 300, {
      size: 16,
      align: "center",
      color: COLOR.brassDim,
    });
  }

  /** Khung viền bậc quanh ô hướng dẫn (0,0,76×76), xuống tới chân trang. */
  private drawBezel(renderer: Renderer): void {
    const c = COLOR.brass;
    renderer.rect(80, 8, GAME_WIDTH - 92, 2, c);
    renderer.rect(78, 8, 2, 72, c);
    renderer.rect(8, 78, 72, 2, c);
    renderer.rect(8, 78, 2, 184, c);
    renderer.rect(GAME_WIDTH - 12, 8, 2, 254, c);
    renderer.rect(GAME_WIDTH - 24, 8, 14, 2, c);
    renderer.rect(GAME_WIDTH - 12, 8, 2, 14, c);
  }
}
