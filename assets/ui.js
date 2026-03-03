/* ============================================================
   ui.js — 렌더링 & DOM 참조
   (game-logic / game-lifecycle을 import하지 않아 순환 의존 없음)
   ============================================================ */
import { state } from "./state.js";
import { CELL_SIZE, GAP_SIZE, PADDING } from "./constants.js";
import { renderBoardToCanvas } from "./renderer.js";

/* ── DOM 참조 (initDom() 후 사용 가능) ─────────────────── */
export const dom = {
  boardEl: null,
  scoreboardEl: null,
  gameOverEl: null,
  menuBtnEl: null,
  pauseModalEl: null,
  resumeBtn: null,
  restartBtn: null,
  settingBtn: null,
  titleBtn: null,
  modalClose: null,
  settingsPanel: null,
  settingsBack: null,
  bgmVol: null,
  sfxVol: null,
  startBtn: null,
};

export function initDom() {
  dom.boardEl = document.getElementById("board");
  dom.scoreboardEl = document.getElementById("scoreboard");
  dom.gameOverEl = document.getElementById("gameover");
  dom.menuBtnEl = document.getElementById("menu");
  dom.pauseModalEl = document.getElementById("pauseModal");
  dom.resumeBtn = document.getElementById("resumeBtn");
  dom.restartBtn = document.getElementById("restartBtn");
  dom.settingBtn = document.getElementById("settingBtn");
  dom.titleBtn = document.getElementById("titleBtn");
  dom.modalClose = document.getElementById("modalClose");
  dom.settingsPanel = document.getElementById("settingsPanel");
  dom.settingsBack = document.getElementById("settingsBack");
  dom.bgmVol = document.getElementById("bgmVol");
  dom.sfxVol = document.getElementById("sfxVol");
  dom.startBtn = document.getElementById("start");
}

/* ─────────────────────────────────────────────────────────────
   메인 렌더 함수
───────────────────────────────────────────────────────────── */
export function render() {
  // 캔버스 렌더
  renderBoardToCanvas(
    state.board,
    state.cursor,
    state.removing,
    state.animatingSwap,
  );

  // DOM 에러 오버레이용 try/catch
  try {
    if (dom.boardEl) dom.boardEl.innerHTML = "";
  } catch (err) {
    console.error("render error", err);
    if (dom.gameOverEl) {
      dom.gameOverEl.style.display = "flex";
      dom.gameOverEl.textContent =
        "ERROR: " + (err && err.message ? err.message : String(err));
    }
    return;
  }

  // 스왑 애니메이션 플로팅 오버레이
  if (state.animatingSwap && state.animatingSwap.active && dom.boardEl) {
    const sa = state.animatingSwap;
    const a = document.createElement("div");
    a.className = `floating ${sa.aColor || ""}`;
    const aLeft = (sa.curA && sa.curA.left) || sa.leftA || 0;
    const aTop = (sa.curA && sa.curA.top) || sa.topA || 0;
    a.style.left = aLeft + "px";
    a.style.top = aTop + "px";
    a.style.zIndex = "10";
    dom.boardEl.appendChild(a);

    const b = document.createElement("div");
    b.className = `floating ${sa.bColor || ""}`;
    const bLeft = (sa.curB && sa.curB.left) || sa.leftB || 0;
    const bTop = (sa.curB && sa.curB.top) || sa.topB || 0;
    b.style.left = bLeft + "px";
    b.style.top = bTop + "px";
    b.style.zIndex = "11";
    dom.boardEl.appendChild(b);
  }

  // 게임오버 오버레이
  if (dom.gameOverEl)
    dom.gameOverEl.style.display = state.gameOver ? "flex" : "none";

  // Start / Restart 버튼 표시
  if (dom.startBtn) {
    if (state.gameOver) {
      dom.startBtn.style.display = "inline-block";
      dom.startBtn.textContent = "Restart";
    } else if (!state.gameStarted) {
      dom.startBtn.style.display = "inline-block";
      dom.startBtn.textContent = "Start";
    } else {
      dom.startBtn.style.display = "none";
      dom.startBtn.textContent = "Start";
    }
  }

  // 점수 UI
  const scoreEl = document.getElementById("score-value");
  if (scoreEl) scoreEl.textContent = String(state.score);
  const hsEl = document.getElementById("highscore-value");
  if (hsEl) hsEl.textContent = String(state.highscore);
  const levelEl = document.getElementById("level-value");
  if (levelEl) levelEl.textContent = String(state.level);

  // 콤보 오버레이
  const comboEl = document.getElementById("combo");
  if (comboEl) {
    if (state.combo > 1) {
      comboEl.style.display = "block";
      comboEl.textContent = state.combo + " COMBO";
    } else {
      comboEl.style.display = "none";
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   유틸
───────────────────────────────────────────────────────────── */
export function getCellPos(x, y) {
  const colW = CELL_SIZE + GAP_SIZE;
  return { left: PADDING + x * colW, top: PADDING + y * colW };
}
