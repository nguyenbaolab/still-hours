import { afterEach, describe, expect, it, vi } from "vitest";
import { GAME_EVENTS, GameEvents, gameEvents, isGameEventName, type ScoreEvent } from "./game-events";

const score = (total: number): ScoreEvent => ({
  resident: "r1",
  round: 1,
  phase: "dodge",
  reason: "milestone",
  points: 5,
  total,
  detail: 0.25,
});

describe("GameEvents: đăng ký, hủy, phát", () => {
  it("on nhận payload đúng kiểu và theo thứ tự đăng ký; chỉ nghe đúng tên", () => {
    const events = new GameEvents();
    const order: string[] = [];
    events.on("score", (e) => order.push(`a${e.total}`));
    events.on("score", (e) => order.push(`b${e.total}`));
    events.on("mistake", () => order.push("sai"));
    events.emit("score", score(5));
    events.emit("score", score(10));
    expect(order).toEqual(["a5", "b5", "a10", "b10"]);
  });

  it("on trả về hàm hủy; gọi hai lần không sao; off cũng hủy được", () => {
    const events = new GameEvents();
    const seen: number[] = [];
    const handler = (e: ScoreEvent): void => {
      seen.push(e.total);
    };
    const unsubscribe = events.on("score", handler);
    events.emit("score", score(1));
    unsubscribe();
    unsubscribe();
    events.emit("score", score(2));
    expect(seen).toEqual([1]);

    events.on("score", handler);
    events.off("score", handler);
    events.emit("score", score(3));
    expect(seen).toEqual([1]);
    expect(events.listenerCount()).toBe(0);
  });

  it("off với handler chưa đăng ký không làm gì", () => {
    const events = new GameEvents();
    expect(() => events.off("clear", () => {})).not.toThrow();
  });

  it("once chỉ nghe một lần, và hủy được trước khi sự kiện tới", () => {
    const events = new GameEvents();
    const seen: number[] = [];
    events.once("score", (e) => seen.push(e.total));
    events.emit("score", score(1));
    events.emit("score", score(2));
    expect(seen).toEqual([1]);

    const cancel = events.once("score", (e) => seen.push(e.total * 100));
    cancel();
    events.emit("score", score(3));
    expect(seen).toEqual([1]);
  });

  it("đăng ký hoặc hủy trong lúc đang phát chỉ có tác dụng từ lần phát sau", () => {
    const events = new GameEvents();
    const seen: string[] = [];
    let unsubscribeSecond: () => void = () => {};
    events.on("score", () => {
      seen.push("first");
      unsubscribeSecond();
      events.on("score", () => seen.push("late"));
    });
    unsubscribeSecond = events.on("score", () => seen.push("second"));
    events.emit("score", score(1));
    expect(seen).toEqual(["first", "second"]);
    events.emit("score", score(2));
    expect(seen).toEqual(["first", "second", "first", "late"]);
  });

  it("một handler ném lỗi không chặn handler khác và không ném ra ngoài", () => {
    const events = new GameEvents();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const seen: number[] = [];
    events.on("score", () => {
      throw new Error("hỏng");
    });
    events.on("score", (e) => seen.push(e.total));
    expect(() => events.emit("score", score(7))).not.toThrow();
    expect(seen).toEqual([7]);
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it("listenerCount và clear", () => {
    const events = new GameEvents();
    events.on("score", () => {});
    events.on("score", () => {});
    events.on("stuck", () => {});
    expect(events.listenerCount("score")).toBe(2);
    expect(events.listenerCount()).toBe(3);
    events.clear("score");
    expect(events.listenerCount("score")).toBe(0);
    expect(events.listenerCount()).toBe(1);
    events.clear();
    expect(events.listenerCount()).toBe(0);
  });

  it("phát khi không ai nghe thì không làm gì", () => {
    const events = new GameEvents();
    expect(() => events.emit("nearWin", { resident: null, round: 1, phase: "dodge", progress: 0.8 })).not.toThrow();
  });
});

describe("tên sự kiện", () => {
  it("đủ năm tên cố định, mỗi tên bằng chính khóa của nó", () => {
    expect(Object.keys(GAME_EVENTS).sort()).toEqual(["clear", "mistake", "nearWin", "score", "stuck"]);
    for (const [key, value] of Object.entries(GAME_EVENTS)) expect(value).toBe(key);
  });

  it("isGameEventName phân biệt tên thật và tên lạ", () => {
    expect(isGameEventName("score")).toBe(true);
    expect(isGameEventName("nearWin")).toBe(true);
    expect(isGameEventName("win")).toBe(false);
    expect(isGameEventName("")).toBe(false);
  });
});

describe("gameEvents dùng chung", () => {
  afterEach(() => gameEvents.clear());

  it("là một bản GameEvents dùng được ngay", () => {
    const seen: number[] = [];
    gameEvents.on(GAME_EVENTS.score, (e) => seen.push(e.total));
    gameEvents.emit("score", score(9));
    expect(seen).toEqual([9]);
  });
});
