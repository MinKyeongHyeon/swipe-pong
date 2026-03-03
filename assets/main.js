/* ============================================================
   main.js — 진입점: 모듈 조립 & 이벤트 등록
   ============================================================ */
import { state } from "./state.js";
import { H } from "./constants.js";
import { initDom, render, dom } from "./ui.js";
import { initCanvas } from "./renderer.js";
import { initAudio, suspendAudio, resumeAudio, setBgmVolume } from "./audio.js";
import {
  initLifecycle,
  startGame,
  resetGame,
  startRise,
} from "./game-lifecycle.js";
import { generateSafeRow } from "./game-logic.js";
import { setupKeyboard, selectCell } from "./input.js";

/* ─────────────────────────────────────────────────────────────
   모달 로컬 상태
───────────────────────────────────────────────────────────── */
let menuWasRunningRise = false;
let htmlBgmWasPlaying = false;
let lastFocusedBeforeModal = null;

function openMenuModal() {
  if (!dom.pauseModalEl) return;

  menuWasRunningRise = !!state.riseTimer;
  if (state.riseTimer) {
    clearInterval(state.riseTimer);
    state.riseTimer = null;
  }
  state.suspendGame = true;

  htmlBgmWasPlaying = suspendAudio();

  dom.pauseModalEl.style.display = "flex";
  dom.pauseModalEl.setAttribute("aria-hidden", "false");
  if (dom.boardEl) dom.boardEl.setAttribute("aria-hidden", "true");
  if (dom.scoreboardEl) dom.scoreboardEl.setAttribute("aria-hidden", "true");

  try {
    lastFocusedBeforeModal = document.activeElement;
    if (dom.resumeBtn && typeof dom.resumeBtn.focus === "function")
      dom.resumeBtn.focus();
  } catch (e) {}
}

function closeMenuModal() {
  if (!dom.pauseModalEl) return;

  dom.pauseModalEl.style.display = "none";
  dom.pauseModalEl.setAttribute("aria-hidden", "true");

  resumeAudio(htmlBgmWasPlaying);
  htmlBgmWasPlaying = false;

  if (menuWasRunningRise) startRise();
  state.suspendGame = false;

  if (dom.boardEl) dom.boardEl.removeAttribute("aria-hidden");
  if (dom.scoreboardEl) dom.scoreboardEl.removeAttribute("aria-hidden");

  try {
    if (
      lastFocusedBeforeModal &&
      typeof lastFocusedBeforeModal.focus === "function"
    ) {
      lastFocusedBeforeModal.focus();
      lastFocusedBeforeModal = null;
    }
  } catch (e) {}
}

/* ─────────────────────────────────────────────────────────────
   초기화
───────────────────────────────────────────────────────────── */
function init() {
  console.log("swipe-pong main.js loaded");

  // DOM 참조 수집
  initDom();

  // 오디오 초기화 (BGM + SFX 사전 로드)
  initAudio();

  // 게임 라이프사이클 초기화 (startRise 콜백 주입)
  initLifecycle();

  // 캔버스 렌더러 초기화 (selectCell 콜백 전달)
  initCanvas(selectCell);

  // 키보드 입력 등록
  setupKeyboard();

  // localStorage 에서 최고점 불러오기
  try {
    const hs = localStorage.getItem("swipe-pong-highscore");
    if (hs !== null) state.highscore = Math.max(0, parseInt(hs, 10) || 0);
  } catch (e) {
    console.warn("localStorage not available", e);
  }

  // 초기 보드 (바닥 4줄 채우기)
  for (let y = H - 1; y >= Math.max(0, H - 4); y--)
    state.board[y] = generateSafeRow(y);

  // 버튼 이벤트 등록
  _bindButtons();

  // 볼륨 슬라이더
  _bindSliders();

  // 초기 렌더
  render();
}

/* ─────────────────────────────────────────────────────────────
   버튼 바인딩
───────────────────────────────────────────────────────────── */
function _bindButtons() {
  // Start / Restart
  if (dom.startBtn) {
    dom.startBtn.style.pointerEvents = "auto";
    dom.startBtn.addEventListener("click", (e) => {
      console.log("start clicked event", e.type);
      if (state.gameOver) {
        resetGame();
        startGame();
      } else {
        startGame();
      }
    });
  }

  // Menu
  if (dom.menuBtnEl) dom.menuBtnEl.addEventListener("click", openMenuModal);

  // Modal 내부 버튼
  if (dom.resumeBtn)
    dom.resumeBtn.addEventListener("click", () => closeMenuModal());
  if (dom.restartBtn)
    dom.restartBtn.addEventListener("click", () => {
      dom.pauseModalEl.style.display = "none";
      state.suspendGame = false;
      resetGame();
      startGame();
    });
  if (dom.settingBtn)
    dom.settingBtn.addEventListener("click", () => {
      if (dom.settingsPanel) dom.settingsPanel.style.display = "block";
    });
  if (dom.settingsBack)
    dom.settingsBack.addEventListener("click", () => {
      if (dom.settingsPanel) dom.settingsPanel.style.display = "none";
    });
  if (dom.titleBtn)
    dom.titleBtn.addEventListener("click", () => {
      if (dom.pauseModalEl) dom.pauseModalEl.style.display = "none";
      state.suspendGame = false;
      resetGame();
    });
  if (dom.modalClose)
    dom.modalClose.addEventListener("click", () => closeMenuModal());
}

/* ─────────────────────────────────────────────────────────────
   볼륨 슬라이더 바인딩
───────────────────────────────────────────────────────────── */
function _bindSliders() {
  if (dom.bgmVol) {
    dom.bgmVol.addEventListener("input", (e) => {
      setBgmVolume(parseFloat(e.target.value));
    });
  }
  if (dom.sfxVol) {
    dom.sfxVol.addEventListener("input", (e) => {
      window.__SFX_USER_MULT = parseFloat(e.target.value);
    });
  }
}

/* ─────────────────────────────────────────────────────────────
   실행
───────────────────────────────────────────────────────────── */
init();
