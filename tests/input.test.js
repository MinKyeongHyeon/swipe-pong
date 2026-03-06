/**
 * Part 5 — input.js
 * 순수 함수(selectCell, confirmTitleMenu) 위주 테스트
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../assets/audio.js");
vi.mock("../assets/ui.js");
vi.mock("../assets/renderer.js");
vi.mock("../assets/game-logic.js");
vi.mock("../assets/game-lifecycle.js");

import { state, resetState } from "../assets/state.js";
import { W, H } from "../assets/constants.js";
import { selectCell, confirmTitleMenu } from "../assets/input.js";
import { startGame, goToTitle } from "../assets/game-lifecycle.js";
import { showScreen, render } from "../assets/ui.js";

beforeEach(() => {
  resetState();
  state.screen = "game";
  state.gameOver = false;
  state.gameStarted = true;
  vi.clearAllMocks();
});

/* ─── selectCell ────────────────────────────────────────── */
describe("selectCell(row, col)", () => {
  it("정상 좌표로 cursor가 업데이트된다", () => {
    selectCell(3, 2);
    expect(state.cursor).toEqual({ x: 2, y: 3 });
  });

  it("음수 좌표 → 0으로 클램핑된다", () => {
    selectCell(-5, -10);
    expect(state.cursor.x).toBe(0);
    expect(state.cursor.y).toBe(0);
  });

  it("col 상한 → W-2 로 클램핑된다", () => {
    selectCell(0, W + 99);
    expect(state.cursor.x).toBe(W - 2);
  });

  it("row 상한 → H-1 로 클램핑된다", () => {
    selectCell(H + 99, 0);
    expect(state.cursor.y).toBe(H - 1);
  });

  it("게임 화면이 아닐 때는 cursor를 변경하지 않는다", () => {
    state.screen = "title";
    state.cursor = { x: 2, y: 8 };
    selectCell(5, 5);
    expect(state.cursor).toEqual({ x: 2, y: 8 });
  });

  it("gameOver 상태일 때는 cursor를 변경하지 않는다", () => {
    state.gameOver = true;
    state.cursor = { x: 2, y: 8 };
    selectCell(5, 5);
    expect(state.cursor).toEqual({ x: 2, y: 8 });
  });

  it("selectCell 후 render()가 호출된다", () => {
    selectCell(3, 2);
    expect(render).toHaveBeenCalled();
  });
});

/* ─── confirmTitleMenu ──────────────────────────────────── */
describe("confirmTitleMenu()", () => {
  beforeEach(() => {
    state.screen = "title";
  });

  it("menuCursor=0 → startGame() 호출", () => {
    state.menuCursor = 0;
    confirmTitleMenu();
    expect(startGame).toHaveBeenCalledOnce();
  });

  it("menuCursor=1 → showScreen('leaderboard') 호출", () => {
    state.menuCursor = 1;
    confirmTitleMenu();
    expect(showScreen).toHaveBeenCalledWith("leaderboard");
  });

  it("menuCursor=2 → showScreen('settings') 호출", () => {
    state.menuCursor = 2;
    confirmTitleMenu();
    expect(showScreen).toHaveBeenCalledWith("settings");
  });
});
