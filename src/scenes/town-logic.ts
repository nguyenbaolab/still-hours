import type { ResidentId } from "../data/residents/types";
import { TOWN_GATE_ROWS, type Tile, type TownMap, type TownNpc } from "../data/town";

/** Logic thuần của thị trấn: ô, va chạm, đường đi, chọn đối tượng tương tác. Không vẽ, không biết đầu vào. */

export type Facing = "up" | "down" | "left" | "right";

export const FACING: Readonly<Record<Facing, { x: number; y: number }>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const tileKey = (x: number, y: number): string => `${x},${y}`;

/** Ký tự của ô. Ngoài bản đồ coi như tường. */
export function tileChar(map: TownMap, tx: number, ty: number): string {
  const row = map.rows[ty];
  if (row === undefined) return "#";
  return row[tx] ?? "#";
}

/** Ô cứng: ký tự cứng, hoặc nằm trong `blocked` (cổng đóng, chỗ cư dân đứng). Ký tự lạ coi như cứng. */
export function isSolidTile(map: TownMap, tx: number, ty: number, blocked: ReadonlySet<string>): boolean {
  if (blocked.has(tileKey(tx, ty))) return true;
  const def = map.legend[tileChar(map, tx, ty)];
  return def === undefined ? true : def.solid;
}

/** Các ô cứng thêm vào bản đồ: chỗ mọi cư dân đứng, và cột cổng của cư dân chưa được giải thoát. */
export function blockedTiles(npcs: readonly TownNpc[], freed: readonly ResidentId[]): Set<string> {
  const blocked = new Set<string>();
  for (const npc of npcs) {
    blocked.add(tileKey(npc.tile.x, npc.tile.y));
    if (freed.includes(npc.id)) continue;
    for (let y = TOWN_GATE_ROWS.from; y <= TOWN_GATE_ROWS.to; y++) blocked.add(tileKey(npc.gateX, y));
  }
  return blocked;
}

export interface BodySize {
  w: number;
  h: number;
}

function overlapsSolid(
  map: TownMap,
  blocked: ReadonlySet<string>,
  x: number,
  y: number,
  size: BodySize,
  tile: number,
): boolean {
  const left = Math.floor((x - size.w / 2) / tile);
  const right = Math.floor((x + size.w / 2 - 1e-6) / tile);
  const top = Math.floor((y - size.h / 2) / tile);
  const bottom = Math.floor((y + size.h / 2 - 1e-6) / tile);
  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (isSolidTile(map, tx, ty, blocked)) return true;
    }
  }
  return false;
}

/**
 * Đi (dx, dy) từ (x, y) với thân hình chữ nhật `size` tâm ở (x, y). Hai trục tách riêng: đi chéo vào góc thì trượt dọc
 * tường chứ không xuyên qua ô cứng. Bước quá dài thì chia nhỏ để không nhảy qua tường.
 */
export function moveBody(
  map: TownMap,
  blocked: ReadonlySet<string>,
  from: Tile,
  dx: number,
  dy: number,
  size: BodySize,
  tile: number,
): Tile {
  let { x, y } = from;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (tile / 4)));
  const sx = dx / steps;
  const sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    if (sx !== 0 && !overlapsSolid(map, blocked, x + sx, y, size, tile)) x += sx;
    if (sy !== 0 && !overlapsSolid(map, blocked, x, y + sy, size, tile)) y += sy;
  }
  return { x, y };
}

/** Mọi ô đi tới được từ `start` theo bốn hướng (BFS). Bắt đầu từ ô cứng thì không tới đâu cả. */
export function reachableTiles(map: TownMap, blocked: ReadonlySet<string>, start: Tile): Set<string> {
  const seen = new Set<string>();
  if (isSolidTile(map, start.x, start.y, blocked)) return seen;
  const queue: Tile[] = [start];
  seen.add(tileKey(start.x, start.y));
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head] as Tile;
    for (const f of Object.values(FACING)) {
      const nx = at.x + f.x;
      const ny = at.y + f.y;
      const k = tileKey(nx, ny);
      if (seen.has(k) || isSolidTile(map, nx, ny, blocked)) continue;
      seen.add(k);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}

/** Có đứng cạnh `target` (một trong bốn ô kề) được không, tức là chạm tới được nó để tương tác. */
export function canReachBeside(reachable: ReadonlySet<string>, target: Tile): boolean {
  return Object.values(FACING).some((f) => reachable.has(tileKey(target.x + f.x, target.y + f.y)));
}

export interface Positioned {
  x: number;
  y: number;
}

/**
 * Đối tượng tương tác mà Z chọn: nằm trong `range` px (tâm tới tâm) và ở phía trước theo hướng đang nhìn;
 * nhiều đối tượng thì cái gần nhất thắng.
 */
export function pickInteraction<T extends Positioned>(
  objects: readonly T[],
  px: number,
  py: number,
  facing: Facing,
  range: number,
): T | null {
  const f = FACING[facing];
  let best: T | null = null;
  let bestDistance = Infinity;
  for (const object of objects) {
    const ox = object.x - px;
    const oy = object.y - py;
    const distance = Math.hypot(ox, oy);
    if (distance > range) continue;
    if (ox * f.x + oy * f.y <= 0) continue;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = object;
    }
  }
  return best;
}

/** Hướng nhìn theo hướng đi (trục lớn hơn thắng; bằng nhau thì ngang). Không đi thì giữ hướng cũ. */
export function facingFor(dx: number, dy: number, previous: Facing): Facing {
  if (dx === 0 && dy === 0) return previous;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

/** Lớp thị trấn nào đang bật theo danh sách cư dân đã giải thoát (xem `TOWN_AMBIENCE`). */
export interface AmbienceLayers {
  windows: boolean;
  sky: boolean;
  birds: boolean;
  wall: boolean;
}

export function ambienceFor(freed: readonly ResidentId[]): AmbienceLayers {
  return {
    windows: freed.includes("r1"),
    sky: freed.includes("r2"),
    birds: freed.includes("r3"),
    wall: freed.includes("r4"),
  };
}

/** Giây tới tiếng chim kế tiếp, với `rand` trong [0, 1). */
export function birdDelay(rand: number, minSeconds: number, maxSeconds: number): number {
  return minSeconds + Math.min(0.999999, Math.max(0, rand)) * (maxSeconds - minSeconds);
}