/**
 * Part 4 — game-lifecycle.js (submitScore)
 * 한글 입력 버그 재현 및 수정 검증 포함
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../assets/audio.js");
vi.mock("../assets/ui.js");
vi.mock("../assets/renderer.js");
vi.mock("../assets/game-logic.js");

import { state, resetState } from "../assets/state.js";
import { submitScore } from "../assets/game-lifecycle.js";

beforeEach(() => {
  resetState();
  state.leaderboard = [];
  state.highscore = 0;
  localStorage.clear();
});

/* ─── 이름 정규화 ─────────────────────────────────────────── */
describe("submitScore() — 이름 정규화", () => {
  it("영문 소문자는 대문자로 변환된다", () => {
    submitScore("abc", 10);
    expect(state.leaderboard[0].name).toBe("ABC");
  });

  it("3자 이상 영문은 앞 3자로 슬라이싱한다", () => {
    submitScore("abcdefg", 10);
    expect(state.leaderboard[0].name).toBe("ABC");
  });

  it("숫자 포함 이름을 허용한다", () => {
    submitScore("a1b", 10);
    expect(state.leaderboard[0].name).toBe("A1B");
  });

  it("빈 문자열 → 'AAA' 폴백", () => {
    submitScore("", 10);
    expect(state.leaderboard[0].name).toBe("AAA");
  });

  it("공백만 입력 → 'AAA' 폴백", () => {
    submitScore("   ", 10);
    expect(state.leaderboard[0].name).toBe("AAA");
  });

  // ── 버그 재현 및 수정 검증 ──────────────────────────────
  it("[BUG FIX] 한글 입력 → 'AAA' 가 아닌 '???' 로 저장된다", () => {
    submitScore("홍길동", 10);
    // 수정 전: "AAA" (버그)  /  수정 후: "???" (언어 불가 표시)
    expect(state.leaderboard[0].name).toBe("???");
    expect(state.leaderboard[0].name).not.toBe("AAA");
  });

  it("[BUG FIX] 특수문자만 입력 → 'AAA' 가 아닌 '???' 로 저장된다", () => {
    submitScore("!@#", 10);
    expect(state.leaderboard[0].name).toBe("???");
    expect(state.leaderboard[0].name).not.toBe("AAA");
  });

  it("[BUG FIX] 한글 + 영문 혼용 → 영문 부분만 추출된다", () => {
    submitScore("홍ab길", 10);
    expect(state.leaderboard[0].name).toBe("AB");
  });
});

/* ─── 점수 정렬 & 상한 ───────────────────────────────────── */
describe("submitScore() — 정렬 및 상한", () => {
  it("점수가 높은 순으로 정렬된다", () => {
    submitScore("LOW", 10);
    submitScore("HIG", 999);
    submitScore("MID", 500);

    expect(state.leaderboard[0].name).toBe("HIG");
    expect(state.leaderboard[1].name).toBe("MID");
    expect(state.leaderboard[2].name).toBe("LOW");
  });

  it("11번째 등록 시 상위 10개만 유지된다", () => {
    for (let i = 0; i < 11; i++) {
      submitScore("P" + i, (10 - i) * 10); // 100, 90, 80, ...
    }
    expect(state.leaderboard).toHaveLength(10);
  });

  it("하이스코어가 갱신된다", () => {
    submitScore("ACE", 9999);
    expect(state.highscore).toBe(9999);
  });

  it("기존 하이스코어보다 낮으면 갱신하지 않는다", () => {
    state.highscore = 5000;
    submitScore("LOW", 100);
    expect(state.highscore).toBe(5000);
  });

  it("날짜 문자열이 포함된다", () => {
    submitScore("DAT", 1);
    expect(state.leaderboard[0].date).toBeTruthy();
  });
});
