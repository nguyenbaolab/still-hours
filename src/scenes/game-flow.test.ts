import { afterEach, describe, expect, it } from "vitest";
import { DEBUG } from "../core/debug";
import { PageState } from "../battle/page";
import { TICK_RATE } from "../core/config";
import { decodeDrawing, newSave, SAVE_KEY, SaveStore, serializeSave, type SaveData, type StorageLike } from "../core/save";
import { Input, type Action } from "../core/input";
import { BATTLE_LAYOUT } from "../data/battle-layout";
import { SKETCH_FEEL } from "../data/sketch-feel";
import { RESIDENTS } from "../data/residents";
import type { ResidentData, ResidentId } from "../data/residents/types";
import { TOWN, TOWN_LEGEND, TOWN_NPCS, type Tile } from "../data/town";
import { FakeAudio } from "../testing/sim";
import { GameFlow, townSpawnFor, type BattleLike } from "./game-flow";
import { blockedTiles, FACING, isSolidTile, reachableTiles, tileKey, type Facing } from "./town-logic";
import type { TownScene } from "./town";

const measure = (text: string, size: number): number => text.length * (size / 2);
const T = 32;

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

/** Trận giả "thắng ngay": xong sau vài tick. Cư dân 4 có trang với vài nét. */
class FakeBattle implements BattleLike {
  finished = false;
  private ticks = 0;
  constructor(
    readonly resident: ResidentData,
    readonly page: PageState | null,
  ) {}
  update(): void {
    if (++this.ticks > 5) this.finished = true;
  }
  render(): void {}
}

function drawnPage(): PageState {
  const page = new PageState(SKETCH_FEEL);
  const { arena } = BATTLE_LAYOUT;
  for (let i = 0; i < 12; i++) page.sketch.sample(arena.x + 20 + i * 10, arena.y + 40 + (i % 3) * 20, false);
  page.sketch.lift();
  for (let i = 0; i < 6; i++) page.sketch.sample(arena.x + 200 + i * 12, arena.y + 100, false);
  return page;
}

function setup(initial?: SaveData | string) {
  const input = new Input();
  const audio = new FakeAudio(5, 0.03);
  const storage = memoryStorage();
  if (typeof initial === "string") storage.setItem(SAVE_KEY, initial);
  else if (initial) storage.setItem(SAVE_KEY, serializeSave(initial));
  const store = new SaveStore(storage, () => DEBUG.session);
  const battles: ResidentId[] = [];
  const startSteps: number[] = [];
  const flow = new GameFlow({
    input,
    audio,
    measure,
    store,
    residents: RESIDENTS,
    makeBattle: (resident, startStep = 0) => {
      battles.push(resident.id);
      startSteps.push(startStep);
      return new FakeBattle(resident, resident.id === "r4" ? drawnPage() : null);
    },
  });
  let tickCount = 0;
  const step = (actions: readonly Action[] = []): void => {
    for (const a of ["up", "down", "left", "right", "confirm"] as const) input.setActionState("test", a, actions.includes(a));
    input.poll();
    flow.update();
    audio.t += 1 / TICK_RATE;
    tickCount++;
  };
  return { input, audio, storage, store, flow, battles, startSteps, step, ticks: () => tickCount };
}

type Rig = ReturnType<typeof setup>;

// ── Bot đi bộ trong thị trấn: BFS theo ô, rồi đứng cạnh cư dân, quay mặt vào họ, bấm Z. ──────────────────────

const GOALS: Record<ResidentId, { stand: Tile; face: Facing }> = {
  r1: { stand: { x: 14, y: 5 }, face: "up" },
  r2: { stand: { x: 26, y: 5 }, face: "right" },
  r3: { stand: { x: 38, y: 5 }, face: "down" },
  r4: { stand: { x: 48, y: 4 }, face: "up" },
  boss: { stand: { x: 61, y: 3 }, face: "up" },
};

function pathTo(rig: Rig, from: Tile, to: Tile): Tile[] {
  const blocked = blockedTiles(TOWN_NPCS, rig.flow.freed);
  const prev = new Map<string, Tile | null>([[tileKey(from.x, from.y), null]]);
  const queue: Tile[] = [from];
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head] as Tile;
    if (at.x === to.x && at.y === to.y) break;
    for (const f of Object.values(FACING)) {
      const next = { x: at.x + f.x, y: at.y + f.y };
      const key = tileKey(next.x, next.y);
      if (prev.has(key) || isSolidTile(TOWN, next.x, next.y, blocked)) continue;
      prev.set(key, at);
      queue.push(next);
    }
  }
  const path: Tile[] = [];
  for (let at: Tile | null | undefined = to; at; at = prev.get(tileKey(at.x, at.y))) path.unshift(at);
  return path;
}

/** Phím cho tick này khi đang đi trong thị trấn tới cư dân kế tiếp. */
function townBot(rig: Rig, goal: { stand: Tile; face: Facing }, n: number): Action[] {
  const scene = rig.flow.scene as TownScene;
  const p = scene.position;
  const tile = { x: Math.floor(p.x / T), y: Math.floor(p.y / T) };
  const axis = (tx: number, ty: number): Action[] | null => {
    const dx = tx - p.x;
    const dy = ty - p.y;
    if (Math.abs(dx) > 2.4) return [dx > 0 ? "right" : "left"];
    if (Math.abs(dy) > 2.4) return [dy > 0 ? "down" : "up"];
    return null;
  };
  if (tile.x !== goal.stand.x || tile.y !== goal.stand.y) {
    const path = pathTo(rig, tile, goal.stand);
    const next = path[1] as Tile;
    // Đổi ô theo chiều ngang thì căn hàng (y) trước rồi mới đi; chiều dọc thì căn cột (x) trước. Khỏi kẹt ở mép ô cứng.
    const horizontalStep = next.x !== tile.x;
    const squared = axis(horizontalStep ? p.x : (tile.x + 0.5) * T, horizontalStep ? (tile.y + 0.5) * T : p.y);
    return squared ?? axis((next.x + 0.5) * T, (next.y + 0.5) * T) ?? [];
  }
  // Căn thẳng hàng theo trục vuông góc với hướng đẩy; trục đẩy thì để trôi về phía cư dân.
  const horizontal = goal.face === "left" || goal.face === "right";
  const aligned = axis(horizontal ? p.x : (goal.stand.x + 0.5) * T, horizontal ? (goal.stand.y + 0.5) * T : p.y);
  if (aligned) return aligned;
  if (scene.facingDirection !== goal.face) return [goal.face];
  // Đẩy nhẹ vào cư dân cho tới khi sát (tầm tương tác 28 px), rồi bấm Z.
  return n % 2 === 0 ? ["confirm", goal.face] : [goal.face];
}

/** Chơi tới khi `done()` đúng; trong thị trấn thì bot đi tới cư dân kế tiếp, mọi nơi khác bấm Z cách quãng. */
function drive(rig: Rig, done: () => boolean, maxSeconds = 600): void {
  const limit = maxSeconds * TICK_RATE;
  for (let i = 0; i < limit && !done(); i++) {
    const next = RESIDENTS[rig.flow.freed.length];
    if (rig.flow.stageKind === "town" && !rig.flow.director.transitioning && (rig.flow.scene as TownScene).state === "walk" && next) {
      rig.step(townBot(rig, GOALS[next.id], i));
    } else {
      rig.step(i % 10 === 0 ? ["confirm"] : []);
    }
  }
  const where = rig.flow.stageKind + " " + JSON.stringify(rig.flow.stageKind === "town" ? (rig.flow.scene as TownScene).position : null) + " freed=" + rig.flow.freed.join(",") + " phase=" + ((rig.flow.scene as { phase?: string }).phase ?? "") + " transitioning=" + rig.flow.director.transitioning + " t=" + rig.flow.director.playSeconds;
  expect(done(), "chơi hết thời gian cho phép mà chưa tới đích: " + where).toBe(true);
}

const settled = (rig: Rig, kind: string): boolean =>
  rig.flow.stageKind === kind && !rig.flow.director.transitioning;

describe("townSpawnFor", () => {
  it("chưa ai giải thoát thì để trống (tiệm); không thì ngay phía đông cư dân vừa giải thoát", () => {
    expect(townSpawnFor([])).toBeUndefined();
    expect(townSpawnFor(["r1", "r2"])).toEqual({ x: TOWN_NPCS[1]!.tile.x + 1, y: TOWN_NPCS[1]!.tile.y });
  });

  it("ô đó đi được và nối với phần còn lại của phố khi cư dân đó đã giải thoát", () => {
    const order: ResidentId[] = ["r1", "r2", "r3", "r4"];
    order.forEach((id, i) => {
      const freed = order.slice(0, i + 1);
      const tile = townSpawnFor(freed) as Tile;
      const blocked = blockedTiles(TOWN_NPCS, freed);
      expect(isSolidTile(TOWN, tile.x, tile.y, blocked), id).toBe(false);
      expect(TOWN_LEGEND[TOWN.rows[tile.y]![tile.x]!]!.solid, id).toBe(false);
      const reach = reachableTiles(TOWN, blocked, { x: TOWN.spawn.x, y: TOWN.spawn.y });
      expect(reach.has(tileKey(tile.x, tile.y)), `${id} tới được từ tiệm`).toBe(true);
    });
  });
});

describe("GameFlow: từ đầu tới cuối", () => {
  it("Title → Intro → Town → (trận → lưu → Town) × 5 → Ending → Title; freed tăng đúng thứ tự, lưu sau mỗi cư dân, xóa ở cuối", () => {
    const rig = setup();
    expect(rig.flow.stageKind).toBe("title");

    drive(rig, () => rig.flow.stageKind === "intro");
    // Đang ở cảnh mở, chưa có bản lưu (chỉ lưu khi xong cảnh mở).
    expect(rig.store.exists()).toBe(false);

    drive(rig, () => settled(rig, "town"));
    expect(rig.store.load()?.seenIntro).toBe(true);
    expect(rig.store.load()?.freed).toEqual([]);

    const seenFreed: ResidentId[][] = [];
    let last = 0;
    drive(rig, () => {
      if (rig.flow.freed.length !== last) {
        last = rig.flow.freed.length;
        const save = rig.store.load();
        expect(save, "có bản lưu sau mỗi cư dân").not.toBeNull();
        expect(save?.freed).toEqual([...rig.flow.freed]);
        expect(save?.finished).toBe(rig.flow.freed.length === 5);
        seenFreed.push([...rig.flow.freed]);
      }
      return rig.flow.stageKind === "ending";
    });
    expect(rig.battles).toEqual(["r1", "r2", "r3", "r4", "boss"]);
    expect(seenFreed.map((f) => f[f.length - 1])).toEqual(["r1", "r2", "r3", "r4", "boss"]);

    // Màn kết xong thì bản lưu bị xóa và về màn bắt đầu (màn bắt đầu chờ một phím thật mới đi tiếp).
    drive(rig, () => rig.flow.stageKind === "title");
    expect(rig.store.exists()).toBe(false);
    expect(rig.flow.freed).toEqual([]);
    // Âm thanh đã mở khóa từ trước: không tự đi tiếp vào ván mới khi chưa ai bấm gì.
    for (let i = 0; i < 300; i++) rig.step();
    expect(rig.flow.stageKind).toBe("title");
  });

  it("tranh của Linh được giản lược và lưu cùng bản lưu của r4", () => {
    const rig = setup();
    drive(rig, () => rig.flow.freed.includes("r4") && rig.store.load()?.freed.includes("r4") === true);
    const drawing = rig.store.load()?.drawing;
    expect(drawing).not.toBeNull();
    const strokes = decodeDrawing(drawing as number[]);
    expect(strokes.length).toBe(2);
    for (const stroke of strokes) {
      for (const p of stroke) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(400);
      }
    }
  });
});

describe("GameFlow: Tiếp tục", () => {
  const afterR2: SaveData = { ...newSave(), seenIntro: true, freed: ["r1", "r2"], playSeconds: 100 };

  it("sau khi giải thoát r2: đứng ngay đông r2, cổng r1 và r2 đã mở, thời gian chơi nối tiếp", () => {
    const rig = setup(afterR2);
    // Menu có "Tiếp tục" / "Bắt đầu lại": confirm chọn "Tiếp tục".
    drive(rig, () => settled(rig, "town"));
    const scene = rig.flow.scene as TownScene;
    const tile = townSpawnFor(["r1", "r2"]) as Tile;
    expect(Math.floor(scene.position.x / T)).toBe(tile.x);
    expect(Math.floor(scene.position.y / T)).toBe(tile.y);
    expect(tile).toEqual({ x: 28, y: 5 });
    const gates = scene.closedGates;
    expect(gates).not.toContain(16);
    expect(gates).not.toContain(28);
    expect(gates).toContain(42);
    expect(gates).toContain(51);
    expect(rig.flow.freed).toEqual(["r1", "r2"]);
    expect(rig.flow.director.playSeconds).toBeGreaterThanOrEqual(100);
    expect(rig.flow.director.playSeconds).toBeLessThan(110);
  });

  it("chơi tiếp từ đó tới hết: chỉ đánh r3, r4, boss", () => {
    const rig = setup(afterR2);
    drive(rig, () => rig.flow.stageKind === "ending");
    expect(rig.battles).toEqual(["r3", "r4", "boss"]);
  });

  it("bản lưu đã `finished` thì vào thẳng màn kết", () => {
    const rig = setup({ ...afterR2, freed: ["r1", "r2", "r3", "r4", "boss"], finished: true });
    drive(rig, () => rig.flow.stageKind === "ending");
    expect(rig.battles).toEqual([]);
  });

  it("bản lưu hỏng thì coi như không có: vào thẳng cảnh mở, không crash", () => {
    const rig = setup("{không phải json");
    drive(rig, () => rig.flow.stageKind === "intro");
    expect(rig.flow.freed).toEqual([]);
  });

  it("bản lưu có nhưng chưa xem cảnh mở thì vẫn chiếu cảnh mở", () => {
    const rig = setup({ ...newSave(), seenIntro: false });
    drive(rig, () => rig.flow.stageKind === "intro");
  });
});

describe("GameFlow: nhảy cóc", () => {
  afterEach(() => {
    DEBUG.on = false;
    DEBUG.session = false;
  });

  it("nhảy vào r3: r1 và r2 coi như đã giải thoát, vào thẳng trận r3 lượt 1", () => {
    const rig = setup();
    rig.flow.queueJump({ kind: "battle", id: "r3", round: 1, phase: "dodge" });
    drive(rig, () => rig.flow.stageKind === "battle");
    expect(rig.battles).toEqual(["r3"]);
    expect(rig.startSteps).toEqual([0]);
    expect(rig.flow.freed).toEqual(["r1", "r2"]);
    expect(DEBUG.session).toBe(true);
  });

  it("r4.2d: vào giữa trận ở bước tháo của lượt 2 (bước 3)", () => {
    const rig = setup();
    rig.flow.queueJump({ kind: "battle", id: "r4", round: 2, phase: "disassemble" });
    drive(rig, () => rig.flow.stageKind === "battle");
    expect(rig.startSteps).toEqual([3]);
  });

  it("phiên nhảy cóc không bao giờ ghi bản lưu, kể cả khi trận xong và cả khi đã có bản lưu thật", () => {
    const real: SaveData = { ...newSave(), seenIntro: true, freed: ["r1"], playSeconds: 50 };
    const rig = setup(real);
    const before = rig.storage.data.get(SAVE_KEY);
    rig.flow.queueJump({ kind: "battle", id: "r2", round: 1, phase: "dodge" });
    drive(rig, () => rig.flow.stageKind === "town");
    expect(rig.battles).toEqual(["r2"]);
    expect(rig.flow.freed).toEqual(["r1", "r2"]);
    expect(rig.storage.data.get(SAVE_KEY)).toBe(before);

    const empty = setup();
    empty.flow.queueJump({ kind: "battle", id: "r3", round: 1, phase: "dodge" });
    drive(empty, () => empty.flow.stageKind === "town");
    expect(empty.storage.data.size).toBe(0);
  });

  it("town.r3: ở thị trấn, r1 và r2 đã được giải thoát, đứng ngay đông r2", () => {
    const rig = setup();
    rig.flow.queueJump({ kind: "town", before: "r3" });
    drive(rig, () => rig.flow.stageKind === "town");
    const scene = rig.flow.scene as TownScene;
    const tile = townSpawnFor(["r1", "r2"]) as Tile;
    expect(Math.floor(scene.position.x / T)).toBe(tile.x);
    expect(rig.flow.freed).toEqual(["r1", "r2"]);
  });

  it("town (không `before`) đứng ở tiệm, không ai giải thoát; ending và intro vào đúng cảnh", () => {
    const rig = setup();
    rig.flow.queueJump({ kind: "town", before: null });
    drive(rig, () => rig.flow.stageKind === "town");
    expect(rig.flow.freed).toEqual([]);
    rig.flow.queueJump({ kind: "ending" });
    drive(rig, () => rig.flow.stageKind === "ending");
    expect(rig.flow.freed).toEqual(["r1", "r2", "r3", "r4", "boss"]);
    rig.flow.queueJump({ kind: "intro" });
    drive(rig, () => rig.flow.stageKind === "intro");
    expect(rig.storage.data.size).toBe(0);
  });

  it("phím số chỉ nhảy khi lớp debug bật", () => {
    const rig = setup();
    expect(rig.flow.handleKey("Digit3")).toBe(false);
    expect(DEBUG.session).toBe(false);
    DEBUG.on = true;
    expect(rig.flow.handleKey("Digit3")).toBe(true);
    expect(DEBUG.session).toBe(true);
    drive(rig, () => rig.flow.stageKind === "battle");
    expect(rig.battles).toEqual(["r3"]);
  });
});
