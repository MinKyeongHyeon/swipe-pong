/* ============================================================
   game-lifecycle.js — 게임 시작·리셋·상승·레벨 관리
   ============================================================ */
import { state, resetState } from "./state.js";
import { W, H } from "./constants.js";
import {
  generateSafeRow,
  resolve,
  setStartRiseCb,
  levelToInterval,
} from "./game-logic.js";
import {
  getSupportsWebAudio,
  getBgmEl,
  isBgmDecoded,
  ensureAudioCtx,
  decodeBgm,
  playBgmWebAudio,
  stopBgmWebAudio,
} from "./audio.js";
import { render, dom } from "./ui.js";

/* main.js에서 initLifecycle() 후 사용 가능 */

/* ─────────────────────────────────────────────────────────────
   상승 (rise)
───────────────────────────────────────────────────────────── */
export function startRise() {
  if (state.riseTimer) clearInterval(state.riseTimer);
  state.riseTimer = setInterval(() => doRise(), state.riseInterval);
}

export function doRise() {
  console.log("doRise");
  if (state.gameOver || state.suspendGame) return;

  if (state.board[0].some((v) => v !== null)) {
    state.gameOver = true;
    if (getSupportsWebAudio()) stopBgmWebAudio({ fadeOut: 0.25 });
    else {
      const el = getBgmEl();
      if (el) el.pause();
    }
    render();
    return;
  }

  for (let y = 0; y < H - 1; y++) state.board[y] = state.board[y + 1].slice();
  state.board[H - 1] = generateSafeRow(H - 1);
  state.cursor.y = Math.max(0, state.cursor.y - 1);

  resolve();
  render();
}

/* ─────────────────────────────────────────────────────────────
   startGame
───────────────────────────────────────────────────────────── */
export function startGame() {
  console.log("startGame called", state.gameStarted);
  if (state.gameStarted) return;
  state.gameStarted = true;

  if (dom.startBtn) dom.startBtn.style.display = "none";
  state.gameOver = false;

  // BGM 재생 (유저 제스처 내 호출)
  if (getSupportsWebAudio()) {
    try {
      const ctx = ensureAudioCtx();
      if (ctx.state === "suspended") ctx.resume();
      if (isBgmDecoded()) {
        playBgmWebAudio({ fadeIn: 0.35 });
      } else {
        decodeBgm("assets/bgm.wav")
          .then(() => {
            try {
              const c = ensureAudioCtx();
              if (c.state === "suspended") c.resume();
            } catch (e) {}
            playBgmWebAudio({ fadeIn: 0.35 });
          })
          .catch((e) => console.warn("bgm load failed", e));
      }
    } catch (e) {
      console.warn("web audio play error", e);
    }
  } else {
    const el = getBgmEl();
    if (el) {
      try {
        el.currentTime = 0;
        const p = el.play();
        if (p && p.catch) p.catch((e) => console.warn("bgm play blocked", e));
      } catch (e) {
        console.warn("bgm play error", e);
      }
    }
  }

  if (state.riseTimer) clearInterval(state.riseTimer);
  startRise();
  render();
}

/* ─────────────────────────────────────────────────────────────
   resetGame
───────────────────────────────────────────────────────────── */
export function resetGame() {
  resetState();

  // 초기 행 생성
  state.board[H - 1] = generateSafeRow(H - 1);
  state.board[H - 2] = generateSafeRow(H - 2);

  state.riseInterval = levelToInterval(0);

  // BGM 정지
  if (getSupportsWebAudio()) stopBgmWebAudio({ fadeOut: 0 });
  const el = getBgmEl();
  if (el) {
    try {
      el.pause();
      el.currentTime = 0;
    } catch (e) {}
  }

  // 점수 UI 즉시 리셋
  const scoreEl = document.getElementById("score-value");
  if (scoreEl) scoreEl.textContent = "0";

  render();

  // 타이틀 화면으로 돌아가기
  if (dom.startBtn) dom.startBtn.style.display = "inline-block";
}

/* ─────────────────────────────────────────────────────────────
   초기화 (main.js 에서 호출)
───────────────────────────────────────────────────────────── */
export function initLifecycle() {
  // game-logic.js 의 updateLevelAndRise 가 startRise 를 호출할 수 있도록 콜백 주입
  setStartRiseCb(startRise);
}
