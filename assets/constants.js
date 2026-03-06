/* ============================================================
   constants.js — 게임 전역 상수
   ============================================================ */

export const W = 6;
export const H = 12;
export const COLORS = ["R", "G", "B", "Y", "P", "K"];

// 레벨별 활성 색상 — 레벨이 오를수록 색 점진 추가
// Level  0-11 : 4색 (R G B Y)
// Level 12-23 : 5색 (+ P 보라)
// Level 24+   : 6색 (+ K 시안)
export function getActiveColors(level) {
  if (level >= 24) return COLORS;
  if (level >= 12) return COLORS.slice(0, 5);
  return COLORS.slice(0, 4);
}

export const BASE_RISE_INTERVAL = 3500;

export const CELL_SIZE = 40;
export const GAP_SIZE = 2;
export const PADDING = 6;

export const REMOVAL_INTERVAL = 90; // ms per frame
export const REMOVAL_FRAMES = 4; // 0..3, 마지막 프레임 뒤에 제거

export const GLOBAL_SFX_DB = -6;
export const GLOBAL_SFX_GAIN = Math.pow(10, GLOBAL_SFX_DB / 20); // ~0.501

// ── 테트리스식 레벨 디자인 ─────────────────────────────────
// Level = floor(score / POINTS_PER_LEVEL)  → 단순 나눗셈
// Interval = BASE_RISE_INTERVAL - level * INTERVAL_STEP  → 단순 선형
//
// Level  0 : 3500ms   Level 20 : 2000ms
// Level  5 : 3125ms   Level 30 : 1250ms
// Level 10 : 2750ms   Level 40 :  500ms (MIN)
// Level 12 : 2600ms   → 5색 추가 (score 4800)
// Level 24 : 1700ms   → 6색 추가 (score 9600)
export const POINTS_PER_LEVEL = 400; // 레벨업에 필요한 점수
export const INTERVAL_STEP = 75; // 레벨당 인터벌 감소량(ms), 레벨 40에서 MIN 도달
export const MIN_INTERVAL = 500;
