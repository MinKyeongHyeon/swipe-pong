/**
 * Part 2 — game-logic.js
 * Canvas/Audio/DOM 의존 모듈을 vi.mock()으로 격리
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// DOM·Canvas·Audio 의존 모듈 전체 auto-mock
vi.mock("../assets/audio.js");
vi.mock("../assets/ui.js");
vi.mock("../assets/renderer.js");

import { state, resetState } from "../assets/state.js";
import { W, H } from "../assets/constants.js";
import { generateSafeRow, findMatches } from "../assets/game-logic.js";

beforeEach(() => {
  resetState();
  state.leaderboard = [];
  // board를 완전히 null로 초기화
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      state.board[y][x] = null;
    }
  }
});

/* ─── generateSafeRow ───────────────────────────────────── */
describe("generateSafeRow(y)", () => {
  it("반환 배열 길이가 W(6)이다", () => {
    const row = generateSafeRow(H - 1);
    expect(row).toHaveLength(W);
  });

  it("모든 셀이 null이 아닌 색상 문자열이다", () => {
    const row = generateSafeRow(H - 1);
    row.forEach((cell) => expect(cell).toMatch(/^[RGBYPK]$/));
  });

  it("가로 3연속 같은 색이 없다 (100회 반복)", () => {
    for (let trial = 0; trial < 100; trial++) {
      const row = generateSafeRow(H - 1);
      for (let x = 2; x < W; x++) {
        expect(
          row[x] === row[x - 1] && row[x] === row[x - 2],
          `trial=${trial} x=${x}: 가로 3연속 '${row[x]}' 발생`,
        ).toBe(false);
      }
    }
  });

  it("세로 3연속 같은 색이 없다 — 직전 2행과 충돌하지 않는다", () => {
    // 직전 두 행을 고정값으로 세팅
    state.board[H - 3] = ["R", "G", "B", "Y", "R", "G"];
    state.board[H - 2] = ["R", "G", "B", "Y", "R", "G"];

    for (let trial = 0; trial < 50; trial++) {
      const row = generateSafeRow(H - 1);
      for (let x = 0; x < W; x++) {
        expect(
          row[x] === state.board[H - 2][x] && row[x] === state.board[H - 3][x],
          `trial=${trial} x=${x}: 세로 3연속 '${row[x]}' 발생`,
        ).toBe(false);
      }
    }
  });
});

/* ─── findMatches ───────────────────────────────────────── */
describe("findMatches()", () => {
  it("보드가 비어 있으면 빈 배열 반환", () => {
    expect(findMatches()).toEqual([]);
  });

  it("가로 3연속을 감지하고 좌표를 반환한다", () => {
    // y=5 행에 R R R 배치
    state.board[5][0] = "R";
    state.board[5][1] = "R";
    state.board[5][2] = "R";

    const matches = findMatches();
    const matchSet = new Set(matches.map(([x, y]) => `${x},${y}`));

    expect(matchSet.has("0,5")).toBe(true);
    expect(matchSet.has("1,5")).toBe(true);
    expect(matchSet.has("2,5")).toBe(true);
  });

  it("가로 4연속이면 4개 모두 포함된다", () => {
    state.board[3][0] = "G";
    state.board[3][1] = "G";
    state.board[3][2] = "G";
    state.board[3][3] = "G";

    const matches = findMatches();
    const matchSet = new Set(matches.map(([x, y]) => `${x},${y}`));

    [0, 1, 2, 3].forEach((x) => expect(matchSet.has(`${x},3`)).toBe(true));
  });

  it("세로 3연속을 감지하고 좌표를 반환한다", () => {
    // x=2 열에 B B B 배치
    state.board[4][2] = "B";
    state.board[5][2] = "B";
    state.board[6][2] = "B";

    const matches = findMatches();
    const matchSet = new Set(matches.map(([x, y]) => `${x},${y}`));

    expect(matchSet.has("2,4")).toBe(true);
    expect(matchSet.has("2,5")).toBe(true);
    expect(matchSet.has("2,6")).toBe(true);
  });

  it("가로 2연속만 있으면 매치 없음", () => {
    state.board[0][0] = "Y";
    state.board[0][1] = "Y";
    expect(findMatches()).toEqual([]);
  });

  it("세로 2연속만 있으면 매치 없음", () => {
    state.board[0][0] = "P";
    state.board[1][0] = "P";
    expect(findMatches()).toEqual([]);
  });

  it("가로·세로 매치가 동시에 있으면 둘 다 포함된다", () => {
    // 가로: y=2 에 R R R
    state.board[2][0] = "R";
    state.board[2][1] = "R";
    state.board[2][2] = "R";
    // 세로: x=0 에 R R R (y=2,3,4)
    state.board[3][0] = "R";
    state.board[4][0] = "R";

    const matches = findMatches();
    const matchSet = new Set(matches.map(([x, y]) => `${x},${y}`));

    // 가로 3개
    expect(matchSet.has("1,2")).toBe(true);
    expect(matchSet.has("2,2")).toBe(true);
    // 세로 3개 (0,2), (0,3), (0,4)
    expect(matchSet.has("0,3")).toBe(true);
    expect(matchSet.has("0,4")).toBe(true);
  });
});
