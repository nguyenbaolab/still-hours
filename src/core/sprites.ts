/**
 * Kho sprite: game chỉ biết sprite qua `id`, không biết nó đến từ đâu.
 * Hiện tại sprite là pixel art định nghĩa bằng mảng dữ liệu (placeholder).
 * Sau này thay bằng PNG: đổi `definePixels(id, ...)` thành `await loadImage(id, url)`,
 * code vẽ (`renderer.sprite(id, x, y)`) giữ nguyên.
 */

/** Dữ liệu pixel art: mỗi ký tự trong `rows` là một pixel, tra màu qua `palette`. Ký tự "." là trong suốt. */
export interface PixelSpriteData {
  readonly palette: Readonly<Record<string, string>>;
  readonly rows: readonly string[];
}

interface StoredSprite {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
}

export class SpriteStore {
  private readonly sprites = new Map<string, StoredSprite>();

  /** Dựng sprite từ mảng dữ liệu pixel. */
  definePixels(id: string, data: PixelSpriteData): void {
    const width = Math.max(...data.rows.map((row) => row.length));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = data.rows.length;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D không khả dụng");

    data.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const key = row[x];
        if (key === undefined || key === ".") continue;
        const color = data.palette[key];
        if (color === undefined) throw new Error(`Sprite "${id}": ký tự "${key}" không có trong palette`);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    });

    this.sprites.set(id, { source: canvas, width, height: data.rows.length });
  }

  /** Nạp sprite từ file ảnh (PNG...). Dùng khi đã có asset thật. */
  async loadImage(id: string, url: string): Promise<void> {
    const image = new Image();
    image.src = url;
    await image.decode();
    this.sprites.set(id, { source: image, width: image.naturalWidth, height: image.naturalHeight });
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
