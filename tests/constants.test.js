/**
 * Part 1 — constants.js + game-logic.js 유틸
 * levelToInterval·scoreToLevel 은 game-logic.js 소재이므로
 * DOM·Audio 모듈을 vi.mock()으로 격리 후 import
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("../assets/audio.js");
vi.mock("../assets/ui.js");
vi.mock("../assets/renderer.js");

import {
  getActiveColors,
  BASE_RISE_INTERVAL,
  MIN_INTERVAL,
  POINTS_PER_LEVEL,
  W,
  H,
  COLORS,
} from "../assets/constants.js";
import { levelToInterval, scoreToLevel } from "../assets/game-logic.js";

describe("getActiveColors", () => {
  it("레벨 0~11 : 4색 [R, G, B, Y] 반환", () => {
    expect(getActiveColors(0)).toEqual(["R", "G", "B", "Y"]);
    expect(getActiveColors(11)).toEqual(["R", "G", "B", "Y"]);
  });

  it("레벨 12~23 : 5색 반환 (P 포함)", () => {
    const colors = getActiveColors(12);
    expect(colors).toHaveLength(5);
    expect(colors).toContain("P");
    expect(getActiveColors(23)).toHaveLength(5);
  });

  it("레벨 24+ : 6색 전부 반환 (K 포함)", () => {
    const colors = getActiveColors(24);
    expect(colors).toHaveLength(6);
    expect(colors).toContain("K");
    expect(getActiveColors(100)).toEqual(COLORS);
  });
});

describe("levelToInterval", () => {
  it("레벨 0 → BASE_RISE_INTERVAL(3500ms)", () => {
    expect(levelToInterval(0)).toBe(BASE_RISE_INTERVAL);
  });

  it("레벨이 높아질수록 인터벌 감소", () => {
    expect(levelToInterval(10)).toBeLessThan(levelToInterval(0));
  });

  it("극단적으로 높은 레벨에서도 MIN_INTERVAL(500ms) 하한 유지", () => {
    expect(levelToInterval(1000)).toBe(MIN_INTERVAL);
    expect(levelToInterval(40)).toBe(MIN_INTERVAL);
  });
});

describe("scoreToLevel", () => {
  it("점수 0 → 레벨 0", () => {
    expect(scoreToLevel(0)).toBe(0);
  });

  it(`점수 ${POINTS_PER_LEVEL} → 레벨 1`, () => {
    expect(scoreToLevel(POINTS_PER_LEVEL)).toBe(1);
  });

  it("레벨업 경계값 미만은 이전 레벨 유지", () => {
    expect(scoreToLevel(POINTS_PER_LEVEL - 1)).toBe(0);
  });

  it("점수 800 → 레벨 2 (POINTS_PER_LEVEL=400 기준)", () => {
    expect(scoreToLevel(800)).toBe(2);
  });
});

describe("상수 기본값 확인", () => {
  it("보드 너비(W) = 6", () => {
    expect(W).toBe(6);
  });

  it("보드 높이(H) = 12", () => {
    expect(H).toBe(12);
  });

  it("POINTS_PER_LEVEL 양수", () => {
    expect(POINTS_PER_LEVEL).toBeGreaterThan(0);
  });
});
