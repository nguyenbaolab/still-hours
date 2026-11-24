import { describe, expect, it } from "vitest";
import { Input } from "./input";
import { TouchInput, wantsTouchControls } from "./touch-input";

function press(touch: TouchInput, input: Input, id: number, control: Parameters<TouchInput["pointerDown"]>[1]): void {
  touch.pointerDown(id, control);
  input.poll();
}

describe("wantsTouchControls", () => {
  it("máy chuột thì ẩn, máy cảm ứng thì hiện", () => {
    expect(wantsTouchControls({ coarse: false, maxTouchPoints: 0, ontouchstart: false })).toBe(false);
    expect(wantsTouchControls({ coarse: true, maxTouchPoints: 0, ontouchstart: false })).toBe(true);
    expect(wantsTouchControls({ coarse: false, maxTouchPoints: 1, ontouchstart: false })).toBe(true);
    expect(wantsTouchControls({ coarse: false, maxTouchPoints: 0, ontouchstart: true })).toBe(true);
  });
});

describe("TouchInput", () => {
  function setup() {
    const input = new Input();
    const touch = new TouchInput(input);
    return { input, touch };
  }

  it("nhấn thì hành động xuống đúng một tick, giữ thì vẫn down", () => {
    const { input, touch } = setup();
    press(touch, input, 1, "confirm");
    expect(input.wasPressed("confirm")).toBe(true);
    expect(input.isDown("confirm")).toBe(true);

    input.poll();
    expect(input.wasPressed("confirm")).toBe(false);
    expect(input.isDown("confirm")).toBe(true);
  });

  it("nhả ngón thì hành động hết, id lạ không làm gì", () => {
    const { input, touch } = setup();
    press(touch, input, 1, "left");
    expect(input.move.x).toBe(-1);
    touch.pointerUp(99);
    input.poll();
    expect(input.isDown("left")).toBe(true);

    touch.pointerUp(1);
    input.poll();
    expect(input.isDown("left")).toBe(false);
    expect(input.move.x).toBe(0);
  });

  it("nhiều ngón: vừa đi vừa bấm nút, nhả một ngón không nhả ngón kia", () => {
    const { input, touch } = setup();
    touch.pointerDown(1, "right");
    touch.pointerDown(2, "up");
    touch.pointerDown(3, "cancel");
    input.poll();
    expect(input.move).toEqual({ x: 1, y: -1 });
    expect(input.isDown("cancel")).toBe(true);
    expect(input.wasPressed("right")).toBe(true);
    expect(input.wasPressed("cancel")).toBe(true);

    touch.pointerUp(2);
    input.poll();
    expect(input.move).toEqual({ x: 1, y: 0 });
    expect(input.isDown("cancel")).toBe(true);
    expect(input.isDown("up")).toBe(false);
  });

  it("pointercancel nhả đúng ngón đó", () => {
    const { input, touch } = setup();
    touch.pointerDown(1, "down");
    touch.pointerDown(2, "confirm");
    input.poll();
    touch.pointerCancel(2);
    input.poll();
    expect(input.isDown("confirm")).toBe(false);
    expect(input.isDown("down")).toBe(true);
    expect(input.move.y).toBe(1);
  });

  it("hai ngón cùng một nút: nhả một ngón thì nút vẫn giữ", () => {
    const { input, touch } = setup();
    touch.pointerDown(1, "confirm");
    touch.pointerDown(2, "confirm");
    input.poll();
    touch.pointerUp(1);
    input.poll();
    expect(input.isDown("confirm")).toBe(true);
    touch.pointerUp(2);
    input.poll();
    expect(input.isDown("confirm")).toBe(false);
  });

  it("releaseAll nhả hết, không kẹt sau khi mất focus", () => {
    const { input, touch } = setup();
    touch.pointerDown(1, "left");
    touch.pointerDown(2, "cancel");
    touch.releaseAll();
    input.poll();
    expect(input.isDown("left")).toBe(false);
    expect(input.isDown("cancel")).toBe(false);
    expect(input.move.x).toBe(0);
  });

  it("không đụng nguồn bàn phím: thả ngón không nhả phím đang giữ", () => {
    const { input, touch } = setup();
    input.setActionState("keyboard", "up", true);
    touch.pointerDown(1, "up");
    input.poll();
    touch.pointerUp(1);
    input.poll();
    expect(input.isDown("up")).toBe(true);
    input.setActionState("keyboard", "up", false);
    input.poll();
    expect(input.isDown("up")).toBe(false);
  });
});
