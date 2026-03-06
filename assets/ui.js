/* ============================================================
   ui.js — 렌더링 & DOM 참조
   (game-logic / game-lifecycle을 import하지 않아 순환 의존 없음)
   ============================================================ */
import { state } from "./state.js";
import { CELL_SIZE, GAP_SIZE, PADDING } from "./constants.js";
import {
  renderBoardToCanvas,
  renderTitleScreen,
  renderLeaderboard,
  renderSettingsBackground,
} from "./renderer.js";

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
  startBtn: null, // 코엠트 신규
  leaderboardPanel: null,
  leaderboardList: null,
  finalScoreEl: null,
  nameInput: null,
  submitScoreBtn: null,
  retryBtn: null,
  titleFromGameoverBtn: null,
  leaderboardBack: null,
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
  // 신규
  dom.leaderboardPanel = document.getElementById("leaderboardPanel");
  dom.leaderboardList = document.getElementById("leaderboardList");
  dom.finalScoreEl = document.getElementById("finalScore");
  dom.nameInput = document.getElementById("nameInput");
  dom.submitScoreBtn = document.getElementById("submitScoreBtn");
  dom.retryBtn = document.getElementById("retryBtn");
  dom.titleFromGameoverBtn = document.getElementById("titleFromGameoverBtn");
  dom.leaderboardBack = document.getElementById("leaderboardBack");

  // 이름 입력창: 영숫자 외 문자(한글 포함) 즉시 차단
  if (dom.nameInput) {
    dom.nameInput.addEventListener("input", () => {
      const filtered = dom.nameInput.value.replace(/[^a-zA-Z0-9]/g, "");
      if (filtered !== dom.nameInput.value) {
        dom.nameInput.value = filtered;
      }
    });
  }
}

/* ─────────────────────────────────────────────────────────────
   화면 전환 — showScreen(name)
───────────────────────────────────────────────────────────── */
/**
 * state.screen을 동기화하고 해당 화면의 HTML 패널만 표시한다.
 * 캔버스 실제 그리기는 render()가 담당한다.
 * @param {'title'|'game'|'gameover'|'leaderboard'|'settings'} name
 */
export function showScreen(name) {
  state.screen = name;

  const isGameplay = name === "game" || name === "gameover";

  // 스코어보드: 플레이 중에만 표시
  if (dom.scoreboardEl)
    dom.scoreboardEl.style.display = isGameplay ? "" : "none";

  // 메뉴 버튼: 게임 중에만 표시
  if (dom.menuBtnEl)
    dom.menuBtnEl.style.display = name === "game" ? "" : "none";

  // Start 버튼은 타이틀 메뉴로 대체되었으므로 항상 숨김
  if (dom.startBtn) dom.startBtn.style.display = "none";

  // 리더보드 패널
  if (dom.leaderboardPanel) {
    dom.leaderboardPanel.hidden = name !== "leaderboard";
    if (name === "leaderboard") renderLeaderboardPanel();
  }

  // 세팅 패널
  if (dom.settingsPanel) dom.settingsPanel.hidden = name !== "settings";

  // 게임오버 오버레이
  if (dom.gameOverEl) {
    if (name === "gameover") {
      dom.gameOverEl.style.display = "flex";
      if (dom.finalScoreEl) dom.finalScoreEl.textContent = String(state.score);
      if (dom.nameInput) {
        dom.nameInput.value = "";
        setTimeout(() => dom.nameInput && dom.nameInput.focus(), 80);
      }
    } else {
      dom.gameOverEl.style.display = "none";
    }
  }

  // 퍼즈 모달은 전환 시 항상 닫음
  if (dom.pauseModalEl) dom.pauseModalEl.style.display = "none";
}

/* ─────────────────────────────────────────────────────────────
   리더보드 리스트 DOM 갱신
───────────────────────────────────────────────────────────── */
/** state.leaderboard를 HTML ol에 반영 (화면이 숨겨져 있어도 갱신 가능) */
export function renderLeaderboardPanel() {
  if (!dom.leaderboardList) return;
  const medals = ["🥇", "🥈", "🥉"];
  dom.leaderboardList.innerHTML = state.leaderboard
    .slice(0, 10)
    .map(
      (e, i) =>
        `<li class="lb-row rank-${i + 1}">
          <span class="lb-rank">${medals[i] ?? i + 1}</span>
          <span class="lb-name">${e.name || "???"}</span>
          <span class="lb-score">${e.score}</span>
          <span class="lb-date">${e.date || ""}</span>
        </li>`,
    )
    .join("");
}

/* ─────────────────────────────────────────────────────────────
   메인 렌더 함수
───────────────────────────────────────────────────────────── */
export function render() {
  // 화면별 캔버스 렌더
  if (state.screen === "title") {
    renderTitleScreen(state.menuCursor);
    return;
  }
  if (state.screen === "leaderboard") {
    renderLeaderboard(state.leaderboard);
    return;
  }
  if (state.screen === "settings") {
    renderSettingsBackground();
    return;
  }

  // game / gameover: 보드 캔버스 렌더
  renderBoardToCanvas(
    state.board,
    state.cursor,
    state.removing,
    state.animatingSwap,
  );

  // HUD DOM 갱신 (게임 플레이 중에만)
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
