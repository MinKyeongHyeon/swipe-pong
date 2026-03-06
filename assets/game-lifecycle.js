/* ============================================================
   game-lifecycle.js — 게임 시작·리셋·상승·레벨 관리
   ============================================================ */
import { state, resetState, saveLeaderboard } from "./state.js";
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
import { render, dom, showScreen } from "./ui.js";

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
    showScreen("gameover");
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

  showScreen("game");
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
   goToTitle — BGM 정지 후 타이틀 화면으로
───────────────────────────────────────────────────────────── */
export function goToTitle() {
  if (state.riseTimer) {
    clearInterval(state.riseTimer);
    state.riseTimer = null;
  }
  if (state.gravityTimer) {
    clearInterval(state.gravityTimer);
    state.gravityTimer = null;
  }
  if (getSupportsWebAudio()) stopBgmWebAudio({ fadeOut: 0.2 });
  else {
    const el = getBgmEl();
    if (el) {
      try {
        el.pause();
        el.currentTime = 0;
      } catch (e) {}
    }
  }
  resetState();
  showScreen("title");
}

/* ─────────────────────────────────────────────────────────────
   submitScore — 리더보드에 이름/점수 등록
───────────────────────────────────────────────────────────── */
/**
 * @param {string} rawName  입력한 이름 (3자 이네음)
 * @param {number} score
 */
export function submitScore(rawName, score) {
  const trimmed = (rawName || "").trim();
  const sanitized = trimmed
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
  // 내용은 있지만 영숫자가 없는 경우(한글·특수문자 등) → "???" 표시
  // 완전히 빈 입력 → "AAA" 폴백
  const name = sanitized || (trimmed ? "???" : "AAA");

  const entry = {
    name,
    score,
    date: new Date().toLocaleDateString("ko-KR"),
  };

  state.leaderboard.push(entry);
  state.leaderboard.sort((a, b) => b.score - a.score);
  if (state.leaderboard.length > 10)
    state.leaderboard = state.leaderboard.slice(0, 10);

  saveLeaderboard();

  // 하이스코어도 동기화
  if (score > state.highscore) {
    state.highscore = score;
    try {
      localStorage.setItem("swipe-pong-highscore", String(score));
    } catch (e) {}
  }

  showScreen("leaderboard");
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
}

/* ─────────────────────────────────────────────────────────────
   초기화 (main.js 에서 호출)
───────────────────────────────────────────────────────────── */
export function initLifecycle() {
  // game-logic.js 의 updateLevelAndRise 가 startRise 를 호출할 수 있도록 콜백 주입
  setStartRiseCb(startRise);
}
