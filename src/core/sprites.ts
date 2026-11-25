/**
 * Kho sprite: game chỉ biết sprite qua `id`, không biết nó đến từ đâu.
 * Hiện tại sprite là pixel art định nghĩa bằng mảng dữ liệu.
 * Sau này thay bằng PNG: đổi `definePixels(id, ...)` thành `await loadImage(id, url)`,
 * code vẽ (`renderer.sprite(id, x, y)`) giữ nguyên.
 * `scale` (mặc định 1) là số pixel logic trên mỗi pixel nguồn. Placeholder dùng 2 để mỗi
 * pixel dữ liệu thành khối 2×2. PNG vẽ sẵn ở 640×360 thì để scale 1.
 *
 * Một id có thể có nhiều khung hình. `get` trả canvas của khung tại thời điểm hiện tại,
 * nên chỗ vẽ không cần biết animation. Mọi khung cùng kích thước: bóng và chỗ căn không đổi.
 */

/** Dữ liệu pixel art: mỗi ký tự trong `rows` là một pixel nguồn, tra màu qua `palette`. Ký tự "." là trong suốt. */
export interface PixelSpriteData {
  readonly palette: Readonly<Record<string, string>>;
  readonly rows: readonly string[];
  /** Pixel logic trên mỗi pixel nguồn. Mặc định 1. Phải là số nguyên >= 1. */
  readonly scale?: number;
  /**
   * Các khung sau khung `rows`. Cùng chiều cao và bề ngang.
   * Không khai thì sprite đứng một khung.
   */
  readonly frames?: readonly (readonly string[])[];
  /**
   * Số bước mỗi khung đứng yên trước khi sang khung sau. Phần tử 0 là khung `rows`.
   * Thiếu thì mỗi khung một bước. Dùng để nháy mắt ngắn giữa lúc mở mắt lâu.
   */
  readonly holds?: readonly number[];
  /** Giây của một bước. Mặc định 0,2 khi có nhiều khung. Phải > 0. */
  readonly frameSeconds?: number;
  /** Lệch pha (giây) để các sprite không nháy cùng một lúc. Mặc định 0. */
  readonly phaseSeconds?: number;
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
  return {
    palette,
    rows: data.rows,
    ...(data.scale === undefined ? {} : { scale: data.scale }),
    ...(data.frames === undefined ? {} : { frames: data.frames }),
    ...(data.holds === undefined ? {} : { holds: data.holds }),
    ...(data.frameSeconds === undefined ? {} : { frameSeconds: data.frameSeconds }),
    ...(data.phaseSeconds === undefined ? {} : { phaseSeconds: data.phaseSeconds }),
  };
}

/** Một khung đứng yên: bỏ animation, giữ hình và scale. Bản xám của cư dân chưa giải thoát dùng cái này. */
export function stillSprite(data: PixelSpriteData): PixelSpriteData {
  return data.scale === undefined ? { palette: data.palette, rows: data.rows } : { palette: data.palette, rows: data.rows, scale: data.scale };
}

/**
 * Chỉ số khung tại `timeSeconds`. Một khung thì luôn 0.
 * `holds` là số bước mỗi khung; thiếu thì mỗi khung một bước.
 */
export function frameIndex(timeSeconds: number, frameCount: number, frameSeconds: number, holds?: readonly number[]): number {
  if (frameCount <= 1) return 0;
  const step = frameSeconds > 0 ? frameSeconds : 0.2;
  let total = 0;
  const weights: number[] = [];
  for (let i = 0; i < frameCount; i++) {
    const hold = holds?.[i] ?? 1;
    weights.push(hold);
    total += hold;
  }
  if (total <= 0) return 0;
  let t = Math.floor(timeSeconds / step) % total;
  if (t < 0) t += total;
  for (let i = 0; i < frameCount; i++) {
    const weight = weights[i] ?? 1;
    if (t < weight) return i;
    t -= weight;
  }
  return 0;
}

function assertScale(scale: number): void {
  if (!Number.isInteger(scale) || scale < 1) throw new Error(`scale ${scale} phải là số nguyên >= 1`);
}

interface BakedFrame {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
}

interface StoredSprite {
  readonly frames: readonly BakedFrame[];
  readonly width: number;
  readonly height: number;
  readonly frameSeconds: number;
  readonly holds: readonly number[];
  readonly phaseSeconds: number;
}

export class SpriteStore {
  private readonly sprites = new Map<string, StoredSprite>();

  constructor(private readonly now: () => number = () => performance.now() / 1000) {}

  /** Dựng sprite từ mảng dữ liệu pixel. `scale` được nung vào ảnh, nên `sprite()` vẽ 1:1 không cần biết scale. */
  definePixels(id: string, data: PixelSpriteData): void {
    const scale = data.scale ?? 1;
    assertScale(scale);
    const pictures = [data.rows, ...(data.frames ?? [])];
    const baked = pictures.map((rows, index) => this.bake(id, index, data.palette, rows, scale));
    const first = baked[0];
    if (!first) throw new Error(`Sprite "${id}": không có khung hình`);
    for (const frame of baked) {
      if (frame.width !== first.width || frame.height !== first.height) {
        throw new Error(`Sprite "${id}": khung hình lệch kích thước`);
      }
    }
    const frameSeconds = data.frameSeconds ?? 0.2;
    if (baked.length > 1 && (!Number.isFinite(frameSeconds) || frameSeconds <= 0)) {
      throw new Error(`Sprite "${id}": frameSeconds phải > 0`);
    }
    const holds = weightsFor(id, baked.length, data.holds);
    const phaseSeconds = data.phaseSeconds ?? 0;
    if (!Number.isFinite(phaseSeconds)) throw new Error(`Sprite "${id}": phaseSeconds không hợp lệ`);
    this.sprites.set(id, { frames: baked, width: first.width, height: first.height, frameSeconds, holds, phaseSeconds });
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
      this.sprites.set(id, singleFrame(image, image.naturalWidth, image.naturalHeight));
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
    this.sprites.set(id, singleFrame(canvas, width, height));
  }

  /** Canvas của khung hình tại thời điểm hiện tại. Sprite một khung thì luôn cùng một ảnh. */
  get(id: string): CanvasImageSource {
    const sprite = this.require(id);
    const index = frameIndex(this.now() + sprite.phaseSeconds, sprite.frames.length, sprite.frameSeconds, sprite.holds);
    const frame = sprite.frames[index];
    if (!frame) throw new Error(`Không có khung ${index} của sprite "${id}"`);
    return frame.source;
  }

  /** Kích thước sprite theo pixel logic. Mọi khung hình cùng kích thước này. */
  size(id: string): { width: number; height: number } {
    const sprite = this.require(id);
    return { width: sprite.width, height: sprite.height };
  }

  private bake(
    id: string,
    index: number,
    palette: Readonly<Record<string, string>>,
    rows: readonly string[],
    scale: number,
  ): BakedFrame {
    if (rows.length === 0) throw new Error(`Sprite "${id}": khung ${index} rỗng`);
    const srcWidth = rows[0]?.length ?? 0;
    if (srcWidth === 0) throw new Error(`Sprite "${id}": khung ${index} rỗng`);
    for (const row of rows) {
      if (row.length !== srcWidth) throw new Error(`Sprite "${id}": khung ${index} không đều hàng`);
    }
    const width = srcWidth * scale;
    const height = rows.length * scale;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D không khả dụng");
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const key = row[x];
        if (key === undefined || key === ".") continue;
        const color = palette[key];
        if (color === undefined) throw new Error(`Sprite "${id}": ký tự "${key}" không có trong palette`);
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    });
    return { source: canvas, width, height };
  }

  private require(id: string): StoredSprite {
    const sprite = this.sprites.get(id);
    if (!sprite) throw new Error(`Không có sprite "${id}"`);
    return sprite;
  }
}

function weightsFor(id: string, count: number, holds: readonly number[] | undefined): number[] {
  if (holds && holds.length > count) throw new Error(`Sprite "${id}": holds dài hơn số khung`);
  const weights: number[] = [];
  for (let i = 0; i < count; i++) {
    const hold = holds?.[i] ?? 1;
    if (!Number.isInteger(hold) || hold < 1) throw new Error(`Sprite "${id}": holds phải là số nguyên >= 1`);
    weights.push(hold);
  }
  return weights;
}

function singleFrame(source: CanvasImageSource, width: number, height: number): StoredSprite {
  return { frames: [{ source, width, height }], width, height, frameSeconds: 0.2, holds: [1], phaseSeconds: 0 };
}
