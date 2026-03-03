/* ============================================================
   input.js — 키보드 & 캔버스 터치/클릭 입력 처리
   ============================================================ */
import { state } from "./state.js";
import { W, H } from "./constants.js";
import { swap } from "./game-logic.js";
import { doRise } from "./game-lifecycle.js";
import { playSfx, getBgmEl } from "./audio.js";
import { render } from "./ui.js";

/* ─────────────────────────────────────────────────────────────
   캔버스 셀 선택 (renderer.js 의 initCanvas 콜백으로 전달)
───────────────────────────────────────────────────────────── */
export function selectCell(row, col) {
  if (!state.gameStarted || state.gameOver) return;
  state.cursor.y = Math.max(0, Math.min(H - 1, row));
  state.cursor.x = Math.max(0, Math.min(W - 2, col));
  render();
}

/* ─────────────────────────────────────────────────────────────
   키보드 이벤트 등록
───────────────────────────────────────────────────────────── */
export function setupKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (!state.gameStarted || state.gameOver) return;

    switch (e.key) {
      case "ArrowLeft":
        state.cursor.x = Math.max(0, state.cursor.x - 1);
        playSfx("cursor", {
          volume: 0.18,
          playbackRate: 1 + (Math.random() - 0.5) * 0.08,
        });
        break;
      case "ArrowRight":
        state.cursor.x = Math.min(W - 2, state.cursor.x + 1);
        playSfx("cursor", {
          volume: 0.18,
          playbackRate: 1 + (Math.random() - 0.5) * 0.08,
        });
        break;
      case "ArrowUp":
        state.cursor.y = Math.max(0, state.cursor.y - 1);
        playSfx("cursor", {
          volume: 0.18,
          playbackRate: 1 + (Math.random() - 0.5) * 0.08,
        });
        break;
      case "ArrowDown":
        state.cursor.y = Math.min(H - 1, state.cursor.y + 1);
        playSfx("cursor", {
          volume: 0.18,
          playbackRate: 1 + (Math.random() - 0.5) * 0.08,
        });
        break;
      case " ":
        e.preventDefault();
        if (state.suspendGame) break;
        if (swap(state.cursor.x, state.cursor.y)) {
          state.combo = 0;
        }
        break;
      case "Control":
        e.preventDefault();
        if (!state.suspendGame) doRise();
        break;
    }
    render();
  });

  // 뮤트 토글 — 언제나 동작
  document.addEventListener("keydown", (e) => {
    if (e.key && e.key.toLowerCase() === "m") {
      const el = getBgmEl();
      if (el) el.muted = !el.muted;
    }
  });
}
