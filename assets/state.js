/* ============================================================
   state.js — 가변 게임 상태 (단일 객체, 모든 모듈이 공유)
   ============================================================ */
import { W, H, BASE_RISE_INTERVAL } from "./constants.js";

/** @type {(string|null)[][]} */
const _initialBoard = () =>
  Array.from({ length: H }, () => Array(W).fill(null));

export const state = {
  // 보드
  board: _initialBoard(),
  cursor: { x: 2, y: 8 },

  // 게임 플로우
  gameOver: false,
  gameStarted: false,
  suspendGame: false,

  // 애니메이션
  animatingSwap: { active: false },
  removing: [],

  // 타이머 핸들
  removalTimer: null,
  gravityTimer: null,
  riseTimer: null,
  comboTimeout: null,

  // 중력 복원용 플래그
  gravityWasActive: false,

  // 점수 / 진행
  score: 0,
  combo: 0,
  highscore: 0,
  level: 0,
  riseInterval: BASE_RISE_INTERVAL,
};

/** 상태를 초기값으로 완전 리셋 (resetGame에서 사용) */
export function resetState() {
  state.board = _initialBoard();
  state.cursor = { x: 2, y: 8 };
  state.gameOver = false;
  state.gameStarted = false;
  state.suspendGame = false;
  state.animatingSwap = { active: false };
  state.removing = [];
  if (state.removalTimer) {
    clearInterval(state.removalTimer);
    state.removalTimer = null;
  }
  if (state.gravityTimer) {
    clearInterval(state.gravityTimer);
    state.gravityTimer = null;
  }
  if (state.riseTimer) {
    clearInterval(state.riseTimer);
    state.riseTimer = null;
  }
  if (state.comboTimeout) {
    clearTimeout(state.comboTimeout);
    state.comboTimeout = null;
  }
  state.gravityWasActive = false;
  state.score = 0;
  state.combo = 0;
  state.level = 0;
  state.riseInterval = BASE_RISE_INTERVAL;
  // highscore는 유지
}
