import type { Mechanism, PartBox } from "./types";

function hit(x: number, y: number, w: number, h: number): PartBox {
  return { x: x - w / 2, y: y - h / 2, w, h };
}

/**
 * Cỗ máy tạm 3 tầng cho cư dân chưa có máy thật (mốc 5.5). Tầng 1: ba ốc. Tầng 2: mặt, tấm che, chốt. Tầng 3: hai
 * bánh răng, lò xo, bánh lắc (core). `memories`: câu ở ốc cuối, chốt, lò xo, core. Bước 6 thay bằng máy thật.
 */
export function placeholderMechanism(
  name: string,
  feel: { bpm: number; rhythmic: boolean; showHint?: boolean },
  memories: readonly [string, string, string, string],
): Mechanism {
  return {
    name,
    bpm: feel.bpm,
    rhythmic: feel.rhythmic,
    ...(feel.showHint ? { showHint: true } : {}),
    parts: [
      { id: "screw-a", sprite: "screw", x: 0.2, y: 0.18, hit: hit(0.2, 0.18, 0.12, 0.16), blockedBy: [], operation: "unscrew", stage: 1 },
      { id: "screw-b", sprite: "screw", x: 0.5, y: 0.18, hit: hit(0.5, 0.18, 0.12, 0.16), blockedBy: [], operation: "unscrew", stage: 1 },
      {
        id: "screw-c",
        sprite: "screw",
        x: 0.8,
        y: 0.18,
        hit: hit(0.8, 0.18, 0.12, 0.16),
        blockedBy: [],
        operation: "unscrew",
        stage: 1,
        memory: memories[0],
      },
      {
        id: "face",
        sprite: "clock-face",
        x: 0.25,
        y: 0.46,
        hit: hit(0.25, 0.46, 0.2, 0.24),
        blockedBy: ["screw-a", "screw-b", "screw-c"],
        operation: "lift",
        stage: 2,
      },
      { id: "plate", sprite: "cover", x: 0.55, y: 0.46, hit: hit(0.55, 0.46, 0.24, 0.2), blockedBy: ["face"], operation: "lift", stage: 2 },
      {
        id: "pin",
        sprite: "cog",
        x: 0.85,
        y: 0.46,
        hit: hit(0.85, 0.46, 0.12, 0.16),
        blockedBy: ["plate"],
        operation: "unhook",
        stage: 2,
        memory: memories[1],
      },
      { id: "cog-a", sprite: "cog", x: 0.3, y: 0.74, hit: hit(0.3, 0.74, 0.16, 0.18), blockedBy: ["pin"], operation: "unhook", stage: 3 },
      { id: "cog-b", sprite: "cog", x: 0.54, y: 0.74, hit: hit(0.54, 0.74, 0.16, 0.18), blockedBy: ["pin"], operation: "unhook", stage: 3 },
      {
        id: "spring",
        sprite: "spring",
        x: 0.8,
        y: 0.74,
        hit: hit(0.8, 0.74, 0.16, 0.18),
        blockedBy: ["cog-a", "cog-b"],
        operation: "lift",
        stage: 3,
        memory: memories[2],
      },
      {
        id: "balance",
        sprite: "balance",
        x: 0.5,
        y: 0.9,
        hit: hit(0.5, 0.9, 0.18, 0.16),
        blockedBy: ["spring"],
        operation: "unhook",
        stage: 3,
        core: true,
        memory: memories[3],
      },
    ],
  };
}
