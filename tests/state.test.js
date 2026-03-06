/**
 * Part 3 — state.js
 * localStorage는 jsdom이 제공하므로 별도 stub 불필요
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  state,
  resetState,
  saveLeaderboard,
  loadLeaderboard,
} from "../assets/state.js";
import { W, H, BASE_RISE_INTERVAL } from "../assets/constants.js";

beforeEach(() => {
  // leaderboard·highscore 포함 완전 초기화
  resetState();
  state.leaderboard = [];
  state.highscore = 0;
  state.screen = "title";
  localStorage.clear();
});

/* ─── resetState ─────────────────────────────── */
describe("resetState()", () => {
  it("board가 H×W의 null 배열로 초기화된다", () => {
    state.board[0][0] = "R";
    resetState();
    expect(state.board).toHaveLength(H);
    expect(state.board[0]).toHaveLength(W);
    state.board.forEach((row) =>
      row.forEach((cell) => expect(cell).toBeNull()),
    );
  });

  it("score, combo, level이 0으로 초기화된다", () => {
    state.score = 999;
    state.combo = 5;
    state.level = 10;
    resetState();
    expect(state.score).toBe(0);
    expect(state.combo).toBe(0);
    expect(state.level).toBe(0);
  });

  it("cursor가 기본 위치로 초기화된다", () => {
    state.cursor = { x: 5, y: 11 };
    resetState();
    expect(state.cursor).toEqual({ x: 2, y: 8 });
  });

  it("gameOver, gameStarted, suspendGame이 false로 초기화된다", () => {
    state.gameOver = true;
    state.gameStarted = true;
    state.suspendGame = true;
    resetState();
    expect(state.gameOver).toBe(false);
    expect(state.gameStarted).toBe(false);
    expect(state.suspendGame).toBe(false);
  });

  it("riseInterval이 BASE_RISE_INTERVAL로 초기화된다", () => {
    state.riseInterval = 500;
    resetState();
    expect(state.riseInterval).toBe(BASE_RISE_INTERVAL);
  });

  it("leaderboard와 highscore는 resetState 후에도 유지된다", () => {
    state.leaderboard = [{ name: "AAA", score: 100, date: "2026. 3. 6." }];
    state.highscore = 100;
    resetState();
    expect(state.leaderboard).toHaveLength(1);
    expect(state.highscore).toBe(100);
  });

  it("실행 중인 타이머가 있으면 clearInterval된다", () => {
    state.riseTimer = setInterval(() => {}, 9999);
    state.gravityTimer = setInterval(() => {}, 9999);
    resetState();
    expect(state.riseTimer).toBeNull();
    expect(state.gravityTimer).toBeNull();
  });
});

/* ─── saveLeaderboard / loadLeaderboard ─────────────────── */
describe("saveLeaderboard()", () => {
  it("state.leaderboard를 localStorage에 JSON으로 저장한다", () => {
    state.leaderboard = [{ name: "TST", score: 42, date: "2026. 3. 6." }];
    saveLeaderboard();
    const raw = localStorage.getItem("swipe-pong-leaderboard");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw)).toEqual(state.leaderboard);
  });
});

describe("loadLeaderboard()", () => {
  it("정상 JSON이면 state.leaderboard에 반영된다", () => {
    const data = [{ name: "ZZZ", score: 99, date: "2026. 3. 6." }];
    localStorage.setItem("swipe-pong-leaderboard", JSON.stringify(data));
    loadLeaderboard();
    expect(state.leaderboard).toEqual(data);
  });

  it("10개 초과 데이터는 상위 10개로 슬라이싱한다", () => {
    const data = Array.from({ length: 15 }, (_, i) => ({
      name: "A" + i,
      score: i,
      date: "",
    }));
    localStorage.setItem("swipe-pong-leaderboard", JSON.stringify(data));
    loadLeaderboard();
    expect(state.leaderboard).toHaveLength(10);
  });

  it("손상된 JSON이면 빈 배열 폴백, 예외 없음", () => {
    localStorage.setItem("swipe-pong-leaderboard", "{NOT_VALID_JSON{{");
    expect(() => loadLeaderboard()).not.toThrow();
    expect(state.leaderboard).toEqual([]);
  });

  it("localStorage가 비어 있으면 빈 배열", () => {
    loadLeaderboard();
    expect(state.leaderboard).toEqual([]);
  });

  it("배열이 아닌 값(객체 등)이면 빈 배열 폴백", () => {
    localStorage.setItem("swipe-pong-leaderboard", JSON.stringify({ a: 1 }));
    loadLeaderboard();
    expect(state.leaderboard).toEqual([]);
  });
});
