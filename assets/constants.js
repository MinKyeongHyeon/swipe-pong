/* ============================================================
   constants.js — 게임 전역 상수
   ============================================================ */

export const W = 6;
export const H = 12;
export const COLORS = ["R", "G", "B", "Y", "P", "K"];

// 레벨별 활성 색상 — 레벨이 오를수록 색 점진 추가
// Level  0-3 : 4색 (R G B Y)
// Level  4-7 : 5색 (+ P 보라)
// Level  8+  : 6색 (+ K 핑크)
export function getActiveColors(level) {
  if (level >= 8) return COLORS;
  if (level >= 4) return COLORS.slice(0, 5);
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

// 레벨별 누적 점수 임계값 — 간격이 점점 좁아지는 비선형 구조
export const LEVEL_THRESHOLDS = (function () {
  const gaps = [1000, 800, 600, 500];
  const t = [];
  let acc = 0;
  for (let i = 0; i < gaps.length; i++) {
    acc += gaps[i];
    t.push(acc);
  }
  return t; // 이후 레벨은 150pt 간격으로 무한 확장
})();

// 레벨별 rise 인터벌(ms) — 초반 급감, 후반 완만
export const LEVEL_INTERVALS = [
  3500, 3000, 2550, 2150, 1800, 1500, 1250, 1000, 750, 500,
];
export const MIN_INTERVAL = 500;
