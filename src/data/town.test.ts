import { describe, expect, it } from "vitest";
import { Input } from "../core/input";
import { TICK_RATE } from "../core/config";
import { FakeAudio } from "../testing/sim";
import { TownScene } from "../scenes/town";
import {
  blockedTiles,
  canReachBeside,
  facingFor,
  isSolidTile,
  moveBody,
  pickInteraction,
  reachableTiles,
  tileKey,
} from "../scenes/town-logic";
import { BACKDROPS } from "./backdrops";
import { DIALOGUES } from "./dialogues";
import { TOWN_FEEL } from "./flow-feel";
import { RESIDENTS } from "./residents";
import type { ResidentId } from "./residents/types";
import { TOWN, TOWN_GATE_ROWS, TOWN_LEGEND, TOWN_NPCS, TOWN_ROWS, TOWN_SIGNS, TOWN_SPOTS } from "./town";

const ORDER: ResidentId[] = ["r1", "r2", "r3", "r4"];
const reachWith = (freed: ResidentId[]): Set<string> =>
  reachableTiles(TOWN, blockedTiles(TOWN_NPCS, freed), TOWN.spawn);

describe("bản đồ thị trấn", () => {
  it("đúng 11 hàng, mỗi hàng dài 64, mọi ký tự có trong legend", () => {
    expect(TOWN_ROWS).toHaveLength(11);
    TOWN_ROWS.forEach((row, y) => {
      expect(row.length, `hàng ${y}`).toBe(64);
      for (const char of row) expect(Object.keys(TOWN_LEGEND), `hàng ${y} ký tự ${char}`).toContain(char);
    });
  });

  it("điểm xuất phát đi được; cư dân, biển, chỗ ngắm cảnh, cửa tháp và cổng đều nằm trên ô hợp lệ", () => {
    const none = new Set<string>();
    expect(isSolidTile(TOWN, TOWN.spawn.x, TOWN.spawn.y, none)).toBe(false);
    for (const spot of TOWN_SPOTS) expect(Object.keys(BACKDROPS)).toContain(spot.backdrop);
    for (const sign of TOWN_SIGNS) expect(Object.keys(DIALOGUES)).toContain(sign.dialogue);
    for (const npc of TOWN_NPCS) {
      expect(npc.gateX).toBeGreaterThan(npc.tile.x);
      for (let y = TOWN_GATE_ROWS.from; y <= TOWN_GATE_ROWS.to; y++) {
        expect(isSolidTile(TOWN, npc.gateX, y, none), `cổng ${npc.id} hàng ${y} là ô đi được khi mở`).toBe(false);
      }
    }
    expect(TOWN_NPCS.map((n) => n.id)).toEqual(ORDER);
  });

  it("khi mọi cổng mở, từ tiệm tới được cạnh mọi cư dân, chỗ ngắm cảnh, biển và cửa tháp", () => {
    const reach = reachWith([...ORDER]);
    expect(reach.has(tileKey(TOWN.spawn.x, TOWN.spawn.y))).toBe(true);
    for (const npc of TOWN_NPCS) expect(canReachBeside(reach, npc.tile), `cư dân ${npc.id}`).toBe(true);
    for (const spot of TOWN_SPOTS) expect(canReachBeside(reach, spot.tile), `chỗ ngắm ${spot.id}`).toBe(true);
    for (const sign of TOWN_SIGNS) expect(canReachBeside(reach, sign.tile), `biển ${sign.id}`).toBe(true);
    expect(canReachBeside(reach, TOWN.tower)).toBe(true);
  });

  it("khi chưa ai được giải thoát thì tới được r1 nhưng không tới được r2; tờ giấy trong tiệm luôn tới được", () => {
    const reach = reachWith([]);
    expect(canReachBeside(reach, TOWN_NPCS[0]!.tile)).toBe(true);
    expect(canReachBeside(reach, TOWN_NPCS[1]!.tile)).toBe(false);
    expect(canReachBeside(reach, TOWN_NPCS[2]!.tile)).toBe(false);
    expect(canReachBeside(reach, TOWN.tower)).toBe(false);
    const note = TOWN_SIGNS.find((s) => s.id === "shopNote")!;
    expect(canReachBeside(reach, note.tile)).toBe(true);
  });

  it("sau mỗi lần giải thoát thì tới được đúng cư dân kế tiếp, chưa tới được người sau nữa", () => {
    for (let freedCount = 0; freedCount < ORDER.length; freedCount++) {
      const reach = reachWith(ORDER.slice(0, freedCount));
      TOWN_NPCS.forEach((npc, i) => {
        // Tới được người thứ (đã giải thoát + 1), không tới được người sau họ.
        expect(canReachBeside(reach, npc.tile), `đã giải thoát ${freedCount}, cư dân ${npc.id}`).toBe(i <= freedCount);
      });
    }
    // r4 giải thoát thì cửa tháp (boss) tới được.
    expect(canReachBeside(reachWith(["r1", "r2", "r3"]), TOWN.tower)).toBe(false);
    expect(canReachBeside(reachWith(["r1", "r2", "r3", "r4"]), TOWN.tower)).toBe(true);
  });
});

describe("va chạm và tương tác", () => {
  const none = new Set<string>();
  const size = TOWN_FEEL.hitbox;
  const T = TOWN_FEEL.tile;

  it("không đi xuyên ô cứng, kể cả khi đi chéo vào góc", () => {
    // Trong tiệm: tường bắc (hàng 2), tường tây (cột 0). Góc trên trái sàn là ô (1,3).
    let pos = { x: 2.5 * T, y: 3.5 * T };
    for (let i = 0; i < 200; i++) pos = moveBody(TOWN, none, pos, -2.4, -2.4, size, T);
    expect(pos.x - size.w / 2).toBeGreaterThanOrEqual(1 * T - 1e-6);
    expect(pos.y - size.h / 2).toBeGreaterThanOrEqual(3 * T - 1e-6);
    // Bước rất dài cũng không nhảy qua tường.
    const far = moveBody(TOWN, none, { x: 2.5 * T, y: 5.5 * T }, -300, 0, size, T);
    expect(far.x - size.w / 2).toBeGreaterThanOrEqual(1 * T - 1e-6);
  });

  it("trượt dọc tường khi đi chéo", () => {
    const start = { x: 5.5 * T, y: 3 * T + size.h / 2 };
    const moved = moveBody(TOWN, none, start, 2.4, -2.4, size, T);
    expect(moved.x).toBeGreaterThan(start.x);
    expect(moved.y).toBeCloseTo(start.y, 6);
  });

  it("cổng đóng chặn, mở thì qua", () => {
    const gate = TOWN_NPCS[0]!.gateX;
    const blocked = blockedTiles(TOWN_NPCS, []);
    let pos = { x: (gate - 1 + 0.5) * T, y: 5.5 * T };
    for (let i = 0; i < 100; i++) pos = moveBody(TOWN, blocked, pos, 2.33, 0, size, T);
    expect(pos.x + size.w / 2).toBeLessThanOrEqual(gate * T + 1e-6);

    const open = blockedTiles(TOWN_NPCS, ["r1"]);
    pos = { x: (gate - 1 + 0.5) * T, y: 5.5 * T };
    for (let i = 0; i < 100; i++) pos = moveBody(TOWN, open, pos, 2.33, 0, size, T);
    expect(pos.x).toBeGreaterThan((gate + 1) * T);
  });

  it("tương tác chọn đối tượng gần nhất theo hướng đang nhìn, trong tầm", () => {
    const objects = [
      { id: "gần", x: 100, y: 80 },
      { id: "xa", x: 100, y: 55 },
      { id: "sau", x: 100, y: 120 },
      { id: "ngoài tầm", x: 100, y: 10 },
    ];
    expect(pickInteraction(objects, 100, 100, "up", TOWN_FEEL.interactRange)?.id).toBe("gần");
    expect(pickInteraction(objects, 100, 100, "down", TOWN_FEEL.interactRange)?.id).toBe("sau");
    expect(pickInteraction(objects, 100, 100, "left", TOWN_FEEL.interactRange)).toBeNull();
    expect(pickInteraction(objects, 100, 190, "up", TOWN_FEEL.interactRange)).toBeNull();
  });

  it("hướng nhìn theo hướng đi, giữ hướng cũ khi đứng yên", () => {
    expect(facingFor(1, 0, "down")).toBe("right");
    expect(facingFor(-1, 0.5, "down")).toBe("left");
    expect(facingFor(0.2, 1, "down")).toBe("down");
    expect(facingFor(0, -1, "down")).toBe("up");
    expect(facingFor(0, 0, "left")).toBe("left");
  });
});

describe("TownScene", () => {
  function setup(freed: ResidentId[], spawn?: { x: number; y: number }) {
    const input = new Input();
    const audio = new FakeAudio(5, 0);
    const scene = new TownScene(TOWN, RESIDENTS, spawn ? { freed, spawn } : { freed }, input, audio, (text) => text.length * 10);
    const tick = (keys: Partial<Record<"up" | "down" | "left" | "right" | "confirm", boolean>> = {}): void => {
      for (const a of ["up", "down", "left", "right", "confirm"] as const) input.setActionState("t", a, keys[a] ?? false);
      input.poll();
      scene.update();
    };
    return { scene, tick };
  }

  it("đi từ tiệm ra phố; cổng r1 đóng chặn ở cột 16", () => {
    const s = setup([]);
    for (let i = 0; i < TICK_RATE * 6; i++) s.tick({ right: true });
    expect(s.scene.position.x).toBeLessThan(16 * TOWN_FEEL.tile);
    expect(s.scene.position.x).toBeGreaterThan(14 * TOWN_FEEL.tile);
    expect(s.scene.closedGates).toEqual([16, 28, 42, 51]);
  });

  it("đã giải thoát r1 thì cổng 16 mở, đi tiếp tới cổng 28", () => {
    const s = setup(["r1"], { x: 15, y: 5 });
    for (let i = 0; i < TICK_RATE * 12; i++) s.tick({ right: true });
    expect(s.scene.position.x).toBeGreaterThan(20 * TOWN_FEEL.tile);
    expect(s.scene.position.x).toBeLessThan(28 * TOWN_FEEL.tile);
    expect(s.scene.closedGates).toEqual([28, 42, 51]);
  });

  it("camera trôi ngang và bị kẹp trong bản đồ", () => {
    const s = setup([]);
    expect(s.scene.cameraX).toBe(0);
    const late = setup(["r1", "r2", "r3", "r4"], { x: 62, y: 5 });
    expect(late.scene.cameraX).toBe(64 * TOWN_FEEL.tile - 640);
  });

  it("Z vào cư dân chưa giải thoát: hội thoại mở, đọc xong thì yêu cầu vào trận", () => {
    const s = setup([], { x: 48, y: 4 });
    for (let i = 0; i < 5; i++) s.tick({ up: true });
    expect(s.scene.facingDirection).toBe("up");
    // Cổng 51 đóng, nhưng r4 ở (48,3) đứng ngay trước mặt.
    s.tick({ confirm: true });
    expect(s.scene.state).toBe("dialogue");
    expect(s.scene.request).toBeNull();
    for (let i = 0; i < 400 && s.scene.state === "dialogue"; i++) s.tick({ confirm: i % 2 === 0 });
    expect(s.scene.state).toBe("walk");
    expect(s.scene.request).toEqual({ kind: "battle", id: "r4" });
    s.scene.clearRequest();
    expect(s.scene.request).toBeNull();
  });

  it("cư dân đã giải thoát chỉ nói một câu, không vào trận", () => {
    const s = setup(["r4"], { x: 48, y: 4 });
    for (let i = 0; i < 5; i++) s.tick({ up: true });
    s.tick({ confirm: true });
    expect(s.scene.state).toBe("dialogue");
    for (let i = 0; i < 400 && s.scene.state === "dialogue"; i++) s.tick({ confirm: i % 2 === 0 });
    expect(s.scene.request).toBeNull();
  });

  it("chỗ ngắm cảnh: Z thì ngồi, bấm phím di chuyển thì đứng dậy", () => {
    const s = setup([], { x: 23, y: 4 });
    for (let i = 0; i < 5; i++) s.tick({ up: true });
    s.tick({ confirm: true });
    expect(s.scene.state).toBe("spot");
    for (let i = 0; i < TICK_RATE * 2; i++) s.tick();
    expect(s.scene.state).toBe("spot");
    s.tick({ left: true });
    expect(s.scene.state).toBe("walk");
  });

  it("biển: Z thì đọc, hết thì về đi lại, không yêu cầu gì", () => {
    const s = setup([], { x: 36, y: 4 });
    for (let i = 0; i < 5; i++) s.tick({ up: true });
    s.tick({ confirm: true });
    expect(s.scene.state).toBe("dialogue");
    for (let i = 0; i < 300 && s.scene.state === "dialogue"; i++) s.tick({ confirm: i % 2 === 0 });
    expect(s.scene.state).toBe("walk");
    expect(s.scene.request).toBeNull();
  });
});
