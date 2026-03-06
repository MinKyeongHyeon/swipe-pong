/* ============================================================
   main.js — 진입점: 모듈 조립 & 이벤트 등록
   ============================================================ */
import { state, loadLeaderboard } from "./state.js";
import { H } from "./constants.js";
import { initDom, render, showScreen, dom } from "./ui.js";
import { initCanvas } from "./renderer.js";
import { initAudio, suspendAudio, resumeAudio } from "./audio.js";
import {
  initLifecycle,
  startGame,
  resetGame,
  startRise,
  goToTitle,
  submitScore,
} from "./game-lifecycle.js";
import { generateSafeRow } from "./game-logic.js";
import { setupKeyboard, selectCell, confirmTitleMenu } from "./input.js";
import { applySettings, initSettingsPanel } from "./settings.js";

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
   타이틀 화면 쾔버스 클릭/터치 콜백
───────────────────────────────────────────────────────────── */
function onTitleMenuSelect(index) {
  state.menuCursor = index;
  confirmTitleMenu();
}

/* ─────────────────────────────────────────────────────────────
   60fps 연속 렌더 루프 (타이틀 애니메이션 포함)
───────────────────────────────────────────────────────────── */
function _startRenderLoop() {
  function loop() {
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
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

  // 초기 보드 (바닥 2줄 채우기)
  for (let y = H - 1; y >= Math.max(0, H - 2); y--)
    state.board[y] = generateSafeRow(y);

  // 리더보드 불러오기
  loadLeaderboard();

  // 설정 패널 이벤트 등록 & 저장된 볼륨 적용
  initSettingsPanel();
  applySettings();

  // 버튼 이벤트 등록
  _bindButtons();

  // 타이틀 화면으로 시작
  showScreen("title");

  // 60fps 연속 렌더 루프
  _startRenderLoop();
}

/* ─────────────────────────────────────────────────────────────
   버튼 바인딩
───────────────────────────────────────────────────────────── */
function _bindButtons() {
  // ── 인게임 메뉴 버튼 ───────────────────────────────────────────
  if (dom.menuBtnEl) dom.menuBtnEl.addEventListener("click", openMenuModal);

  // ── 퍼즈 모달 ────────────────────────────────────────────
  if (dom.resumeBtn)
    dom.resumeBtn.addEventListener("click", () => closeMenuModal());

  if (dom.restartBtn)
    dom.restartBtn.addEventListener("click", () => {
      closeMenuModal();
      resetGame();
      startGame();
    });

  if (dom.settingBtn)
    dom.settingBtn.addEventListener("click", () => {
      closeMenuModal();
      showScreen("settings");
    });

  if (dom.titleBtn)
    dom.titleBtn.addEventListener("click", () => {
      closeMenuModal();
      goToTitle();
    });

  if (dom.modalClose)
    dom.modalClose.addEventListener("click", () => closeMenuModal());

  // ── 세팅 패널 Back ───────────────────────────────────────────
  // 타이틀에서 열었으면 → 타이틀로, 게임 중 열었으면 → 퍼즈 모달 복귀
  if (dom.settingsBack)
    dom.settingsBack.addEventListener("click", () => {
      if (state.gameStarted && !state.gameOver) {
        showScreen("game");
        openMenuModal();
      } else {
        goToTitle();
      }
    });

  // ── 리더보드 패널 Back ──────────────────────────────────────
  if (dom.leaderboardBack)
    dom.leaderboardBack.addEventListener("click", () => goToTitle());

  // ── 게임오버 오버레이 ───────────────────────────────────────
  if (dom.submitScoreBtn)
    dom.submitScoreBtn.addEventListener("click", () => {
      const name = dom.nameInput ? dom.nameInput.value.trim() : "";
      submitScore(name, state.score);
    });

  if (dom.nameInput) {
    dom.nameInput.addEventListener("keydown", (e) => {
      e.stopPropagation(); // 게임 키 입력과 충돌 방지
      if (e.key === "Enter") {
        const name = dom.nameInput.value.trim();
        submitScore(name, state.score);
      }
    });
  }

  if (dom.retryBtn)
    dom.retryBtn.addEventListener("click", () => {
      resetGame();
      startGame();
    });

  if (dom.titleFromGameoverBtn)
    dom.titleFromGameoverBtn.addEventListener("click", () => goToTitle());

  // ── Start 버튼 (타이틀로 대체, 임시 호환) ───────────────────
  if (dom.startBtn) {
    dom.startBtn.style.display = "none";
    dom.startBtn.addEventListener("click", () => {
      if (state.screen === "title") startGame();
    });
  }
}

/* ─────────────────────────────────────────────────────────────
   실행
───────────────────────────────────────────────────────────── */
init();
