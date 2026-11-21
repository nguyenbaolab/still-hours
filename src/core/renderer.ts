import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from "./config";
import { SpriteStore } from "./sprites";

export interface TextOptions {
  color?: string;
  /** Cỡ chữ theo pixel logic (không phải pixel màn hình). */
  size?: number;
  align?: CanvasTextAlign;
}

/**
 * Canvas có độ phân giải logic cố định (GAME_WIDTH x GAME_HEIGHT), được phóng to kiểu pixel art:
 * bội số nguyên của pixel thiết bị khi vừa cửa sổ, không làm mờ.
 */
export class Renderer {
  readonly sprites = new SpriteStore();
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
    const fitScale = Math.min(
      (window.innerWidth * dpr) / GAME_WIDTH,
      (window.innerHeight * dpr) / GAME_HEIGHT,
    );
    // Cửa sổ nhỏ hơn độ phân giải logic thì đành thu nhỏ lẻ; còn lại luôn làm tròn xuống số nguyên.
    const scale = fitScale >= 1 ? Math.floor(fitScale) : fitScale;
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
  rectOutline(x: number, y: number, w: number, h: number, color: string, thickness = 1): void {
    this.rect(x, y, w, thickness, color);
    this.rect(x, y + h - thickness, w, thickness, color);
    this.rect(x, y + thickness, thickness, h - 2 * thickness, color);
    this.rect(x + w - thickness, y + thickness, thickness, h - 2 * thickness, color);
  }

  text(content: string, x: number, y: number, { color = "#fff", size = 8, align = "left" }: TextOptions = {}): void {
    this.ctx.font = `${size}px ${FONT_FAMILY}`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = "top";
    this.ctx.fillStyle = color;
    this.ctx.fillText(content, x, y);
  }

  /** Vẽ sprite theo id; (x, y) là góc trên trái. Toạ độ được làm tròn để pixel luôn khớp lưới. */
  sprite(id: string, x: number, y: number): void {
    this.ctx.drawImage(this.sprites.get(id), Math.round(x), Math.round(y));
  }
}
