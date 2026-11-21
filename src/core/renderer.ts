import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from "./config";
import { SpriteStore } from "./sprites";

/**
 * Hệ số phóng pixel-art cho cửa sổ tính bằng pixel thiết bị (`innerWidth * devicePixelRatio`).
 * Cửa sổ đủ lớn thì bội số nguyên làm tròn xuống; nhỏ hơn độ phân giải logic thì thu nhỏ lẻ.
 */
export function pixelArtScale(deviceWidth: number, deviceHeight: number): number {
  const fitScale = Math.min(deviceWidth / GAME_WIDTH, deviceHeight / GAME_HEIGHT);
  return fitScale >= 1 ? Math.floor(fitScale) : fitScale;
}

export interface TextOptions {
  color?: string;
  /** Cỡ chữ theo pixel logic (không phải pixel màn hình). */
  size?: number;
  align?: CanvasTextAlign;
  /** 1 = đục. Dùng cho câu tan dần. */
  alpha?: number;
}

/**
 * Canvas có độ phân giải logic cố định (GAME_WIDTH x GAME_HEIGHT), được phóng to kiểu pixel art:
 * bội số nguyên của pixel thiết bị khi vừa cửa sổ, không làm mờ.
 */
export class Renderer {
  readonly sprites = new SpriteStore();
  /** Hệ số `pixelArtScale` của lần `fit()` gần nhất. Lớp debug đọc số này. */
  pixelScale = 1;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    // Không dùng { alpha: false }: nó bật antialiasing chữ kiểu LCD, gây viền màu trên pixel art.
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D không khả dụng");
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;

    this.fit();
    window.addEventListener("resize", () => this.fit());
  }

  /** Tính lại kích thước hiển thị. Dùng pixel thiết bị (devicePixelRatio) để tỉ lệ nguyên thật sự là nguyên. */
  private fit(): void {
    const dpr = window.devicePixelRatio || 1;
    const scale = pixelArtScale(window.innerWidth * dpr, window.innerHeight * dpr);
    this.pixelScale = scale;
    this.canvas.style.width = `${(GAME_WIDTH * scale) / dpr}px`;
    this.canvas.style.height = `${(GAME_HEIGHT * scale) / dpr}px`;
  }

  clear(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  /** Tô hình chữ nhật. Cạnh được làm tròn về lưới pixel nên vật chuyển động lẻ pixel vẫn sắc nét, không bị mờ viền. */
  rect(x: number, y: number, w: number, h: number, color: string): void {
    const left = Math.round(x);
    const top = Math.round(y);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(left, top, Math.round(x + w) - left, Math.round(y + h) - top);
  }

  /** Viền hình chữ nhật (nằm bên trong khung x, y, w, h). */
  rectOutline(x: number, y: number, w: number, h: number, color: string, thickness = 2): void {
    this.rect(x, y, w, thickness, color);
    this.rect(x, y + h - thickness, w, thickness, color);
    this.rect(x, y + thickness, thickness, h - 2 * thickness, color);
    this.rect(x + w - thickness, y + thickness, thickness, h - 2 * thickness, color);
  }

  /** Đĩa đặc tâm (x, y), bán kính `radius`. Tâm được gióng vào lưới pixel nên đạn di chuyển từng pixel nguyên, không mờ. */
  disc(x: number, y: number, radius: number, color: string): void {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    const r2 = radius * radius;
    this.ctx.fillStyle = color;
    for (let dy = -Math.floor(radius); dy <= Math.floor(radius); dy++) {
      const halfWidth = Math.floor(Math.sqrt(r2 - dy * dy));
      this.ctx.fillRect(cx - halfWidth, cy + dy, 2 * halfWidth + 1, 1);
    }
  }

  /** Vòng tròn rỗng dày `thickness` px, cùng quy ước toạ độ với `disc`. Dùng cho cảnh báo và lớp debug. */
  ring(x: number, y: number, radius: number, color: string, thickness = 2): void {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    const outer = radius * radius;
    const inner = Math.max(0, radius - thickness) ** 2;
    const reach = Math.floor(radius);
    this.ctx.fillStyle = color;
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 <= outer && d2 >= inner) this.ctx.fillRect(cx + dx, cy + dy, 1, 1);
      }
    }
  }

  /** Đoạn thẳng dày `thickness` px. `dash` > 0 thì vẽ nét đứt (mỗi nét và mỗi khoảng trống dài `dash` px). */
  line(x0: number, y0: number, x1: number, y1: number, thickness: number, color: string, dash = 0): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
    const half = thickness / 2;
    this.ctx.fillStyle = color;
    for (let i = 0; i <= steps; i++) {
      if (dash > 0 && Math.floor(i / dash) % 2 === 1) continue;
      const t = i / steps;
      this.ctx.fillRect(Math.round(x0 + dx * t - half), Math.round(y0 + dy * t - half), thickness, thickness);
    }
  }

  /** Từ đây trở đi chỉ vẽ trong hình chữ nhật này, cho tới khi gọi `unclip()`. */
  clip(x: number, y: number, w: number, h: number): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    this.ctx.clip();
  }

  unclip(): void {
    this.ctx.restore();
  }

  /** Nhân lên alpha hiện tại. 1 = giữ nguyên. Dùng khi làm mờ cả khung trong lúc xem tranh. */
  setAlpha(alpha: number): void {
    this.ctx.globalAlpha = alpha;
  }

  /** Vẽ một canvas (nét chì đã chốt) lên đúng pixel logic. */
  image(source: CanvasImageSource, x: number, y: number): void {
    this.ctx.drawImage(source, Math.round(x), Math.round(y));
  }

  text(content: string, x: number, y: number, { color = "#fff", size = 16, align = "left", alpha = 1 }: TextOptions = {}): void {
    const previous = this.ctx.globalAlpha;
    this.ctx.font = `${size}px ${FONT_FAMILY}`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = "top";
    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = previous * alpha;
    this.ctx.fillText(content, x, y);
    this.ctx.globalAlpha = previous;
  }

  /** Vẽ sprite theo id; (x, y) là góc trên trái. Toạ độ được làm tròn để pixel luôn khớp lưới. */
  sprite(id: string, x: number, y: number): void {
    this.ctx.drawImage(this.sprites.get(id), Math.round(x), Math.round(y));
  }
}
