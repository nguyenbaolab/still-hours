/**
 * Kho sprite: game chỉ biết sprite qua `id`, không biết nó đến từ đâu.
 * Hiện tại sprite là pixel art định nghĩa bằng mảng dữ liệu (placeholder).
 * Sau này thay bằng PNG: đổi `definePixels(id, ...)` thành `await loadImage(id, url)`,
 * code vẽ (`renderer.sprite(id, x, y)`) giữ nguyên.
 * `scale` (mặc định 1) là số pixel logic trên mỗi pixel nguồn. Placeholder dùng 2 để mỗi
 * pixel dữ liệu thành khối 2×2. PNG vẽ sẵn ở 640×360 thì để scale 1.
 */

/** Dữ liệu pixel art: mỗi ký tự trong `rows` là một pixel nguồn, tra màu qua `palette`. Ký tự "." là trong suốt. */
export interface PixelSpriteData {
  readonly palette: Readonly<Record<string, string>>;
  readonly rows: readonly string[];
  /** Pixel logic trên mỗi pixel nguồn. Mặc định 1. Phải là số nguyên >= 1. */
  readonly scale?: number;
}

/** Màu #rrggbb về xám cùng độ sáng (Rec. 601). Chuỗi khác dạng đó thì giữ nguyên. */
export function greyOf(color: string): string {
  const match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(color);
  if (!match) return color;
  const r = parseInt(match[1] as string, 16);
  const g = parseInt(match[2] as string, 16);
  const b = parseInt(match[3] as string, 16);
  const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const hex = y.toString(16).padStart(2, "0");
  return `#${hex}${hex}${hex}`;
}

/** Bản xám của một sprite: cùng hình, mọi màu trong bảng màu thành xám cùng độ sáng. Dùng cho cư dân chưa giải thoát. */
export function greyscaleSprite(data: PixelSpriteData): PixelSpriteData {
  const palette: Record<string, string> = {};
  for (const [key, color] of Object.entries(data.palette)) palette[key] = greyOf(color);
  return data.scale === undefined ? { palette, rows: data.rows } : { palette, rows: data.rows, scale: data.scale };
}

function assertScale(scale: number): void {
  if (!Number.isInteger(scale) || scale < 1) throw new Error(`scale ${scale} phải là số nguyên >= 1`);
}

interface StoredSprite {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
}

export class SpriteStore {
  private readonly sprites = new Map<string, StoredSprite>();

  /** Dựng sprite từ mảng dữ liệu pixel. `scale` được nung vào ảnh, nên `sprite()` vẽ 1:1 không cần biết scale. */
  definePixels(id: string, data: PixelSpriteData): void {
    const scale = data.scale ?? 1;
    assertScale(scale);
    const srcWidth = Math.max(...data.rows.map((row) => row.length));
    const width = srcWidth * scale;
    const height = data.rows.length * scale;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D không khả dụng");

    data.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const key = row[x];
        if (key === undefined || key === ".") continue;
        const color = data.palette[key];
        if (color === undefined) throw new Error(`Sprite "${id}": ký tự "${key}" không có trong palette`);
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    });

    this.sprites.set(id, { source: canvas, width, height });
  }

  /**
   * Nạp sprite từ file ảnh (PNG...). `scale` mặc định 1: ảnh đã đúng pixel logic.
   * Scale khác 1 thì phóng gần nhất vào một canvas, `sprite()` vẫn vẽ 1:1.
   */
  async loadImage(id: string, url: string, scale = 1): Promise<void> {
    assertScale(scale);
    const image = new Image();
    image.src = url;
    await image.decode();
    if (scale === 1) {
      this.sprites.set(id, { source: image, width: image.naturalWidth, height: image.naturalHeight });
      return;
    }
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D không khả dụng");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, width, height);
    this.sprites.set(id, { source: canvas, width, height });
  }

  get(id: string): CanvasImageSource {
    return this.require(id).source;
  }

  /** Kích thước sprite theo pixel logic. */
  size(id: string): { width: number; height: number } {
    const { width, height } = this.require(id);
    return { width, height };
  }

  private require(id: string): StoredSprite {
    const sprite = this.sprites.get(id);
    if (!sprite) throw new Error(`Không có sprite "${id}"`);
    return sprite;
  }
}
