/* ============================================================
   renderer.js — GameBoy Advance 캔버스 렌더러 & 입력 어댑터
   (retro.js를 ES6 named-export 모듈로 리팩터)
   ============================================================ */
"use strict";

/* ── 상수 ─────────────────────────────────────────────────── */
const CELL_SIZE = 40;
const COLS = 6;
const ROWS = 12;
const SCALE = 2;
const GAP = 2; // 셀 간 여백 (px)
const PAD = 4; // 보드 패딩 (px)

/* ── GameBoy Advance 팔레트 ─────────────────────────────── */
export const PAL = {
  bg: "#0D0D1A",
  board: "#1A1A30",
  empty: "#222244",
  cursor: "#FFFFFF",
  cursorGlow: "rgba(255,255,255,0.22)",
  text: "#F8F8FF",
  shadow: "#08080F",
  removeFlash: "#FFFFFF",
};

const TILE_COLORS = {
  R: {
    base: "#FF3030",
    shine: "rgba(255,160,160,0.45)",
    shadow: "rgba(100,0,0,0.55)",
  },
  G: {
    base: "#00D040",
    shine: "rgba(120,255,160,0.40)",
    shadow: "rgba(0,60,10,0.55)",
  },
  B: {
    base: "#2070FF",
    shine: "rgba(130,180,255,0.45)",
    shadow: "rgba(0,10,100,0.55)",
  },
  Y: {
    base: "#FFD000",
    shine: "rgba(255,240,140,0.45)",
    shadow: "rgba(100,60,0,0.55)",
  },
  P: {
    base: "#C030FF",
    shine: "rgba(220,140,255,0.45)",
    shadow: "rgba(60,0,100,0.55)",
  },
  K: {
    base: "#FF2D78",
    shine: "rgba(255,160,200,0.45)",
    shadow: "rgba(100,0,40,0.55)",
  },
};

/* ── 내부 상태 ───────────────────────────────────────────── */
let canvas = null;
let ctx = null;
const logW = COLS * (CELL_SIZE + GAP) + PAD * 2;
const logH = ROWS * (CELL_SIZE + GAP) + PAD * 2;
let animHandle = null;
let _frame = 0;

/* ─────────────────────────────────────────────────────────────
   1. 초기화
───────────────────────────────────────────────────────────── */
/**
 * @param {function(number, number): void} onCellSelect
 *   캔버스 클릭/터치 시 호출될 콜백 (row, col)
 */
export function initCanvas(onCellSelect) {
  canvas = document.getElementById("game-canvas");

  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "game-canvas";

    const wrap = document.createElement("div");
    wrap.className = "canvas-wrap";
    wrap.appendChild(canvas);

    const gameEl = document.getElementById("game");
    if (gameEl) {
      const boardEl = document.getElementById("board");
      if (boardEl) {
        gameEl.insertBefore(wrap, boardEl);
      } else {
        gameEl.appendChild(wrap);
      }
    } else {
      document.body.appendChild(wrap);
    }
  } else {
    if (
      !canvas.parentElement ||
      !canvas.parentElement.classList.contains("canvas-wrap")
    ) {
      const wrap = document.createElement("div");
      wrap.className = "canvas-wrap";
      canvas.parentElement.insertBefore(wrap, canvas);
      wrap.appendChild(canvas);
    }
  }

  canvas.width = logW;
  canvas.height = logH;
  canvas.style.width = logW * SCALE + "px";
  canvas.style.height = logH * SCALE + "px";

  ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  _attachInputAdapter(onCellSelect);

  console.log("[renderer] GBA canvas initialized", logW, "x", logH);
}

/* ─────────────────────────────────────────────────────────────
   2. 보드 렌더링
───────────────────────────────────────────────────────────── */
export function renderBoardToCanvas(board, cursor, removing, swapAnim) {
  if (!ctx) return;
  _frame++;

  ctx.fillStyle = PAL.shadow;
  ctx.fillRect(0, 0, logW, logH);
  ctx.fillStyle = PAL.board;
  ctx.fillRect(PAD - 1, PAD - 1, logW - (PAD - 1) * 2, logH - (PAD - 1) * 2);

  const remMap = {};
  if (removing && removing.length) {
    removing.forEach(function (r) {
      remMap[r.y + "," + r.x] = r;
    });
  }

  const swapActive = swapAnim && swapAnim.active;
  const swapRow = swapActive ? swapAnim.y : -1;
  const swapColA = swapActive ? swapAnim.x : -1;
  const swapColB = swapActive ? swapAnim.x + 1 : -1;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const tile = board && board[row] ? board[row][col] : null;
      const px = PAD + col * (CELL_SIZE + GAP);
      const py = PAD + row * (CELL_SIZE + GAP);
      const key = row + "," + col;

      const isCursor =
        cursor &&
        row === cursor.y &&
        (col === cursor.x || col === cursor.x + 1);

      const rem = remMap[key];

      if (rem) {
        ctx.fillStyle =
          rem.frame % 2 === 1
            ? PAL.removeFlash
            : tile
              ? TILE_COLORS[tile].base
              : PAL.empty;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
      } else if (tile) {
        const tc = TILE_COLORS[tile];
        ctx.fillStyle = tc.shadow;
        ctx.fillRect(px + 2, py + 2, CELL_SIZE - 2, CELL_SIZE - 2);
        ctx.fillStyle = tc.base;
        ctx.fillRect(px, py, CELL_SIZE - 2, CELL_SIZE - 2);
        ctx.fillStyle = tc.shine;
        ctx.fillRect(px, py, CELL_SIZE - 2, 5);
        ctx.fillRect(px, py, 4, CELL_SIZE - 2);
      } else {
        ctx.fillStyle = PAL.empty;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      }

      if (isCursor && !rem) {
        const pulse = 0.55 + 0.45 * Math.sin(_frame * 0.18);
        ctx.fillStyle = "rgba(255,255,255," + 0.15 * pulse + ")";
        ctx.fillRect(
          px,
          py,
          CELL_SIZE - (tile ? 2 : 0),
          CELL_SIZE - (tile ? 2 : 0),
        );
        ctx.strokeStyle = "rgba(255,255,255," + 0.9 * pulse + ")";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          px + 1,
          py + 1,
          CELL_SIZE - (tile ? 4 : 2),
          CELL_SIZE - (tile ? 4 : 2),
        );
        ctx.strokeStyle = "rgba(180,220,255," + 0.5 * pulse + ")";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          px,
          py,
          CELL_SIZE - (tile ? 2 : 0),
          CELL_SIZE - (tile ? 2 : 0),
        );
      }
    }
  }

  /* 스왑 슬라이드 애니메이션 타일 */
  if (swapActive) {
    const t = swapAnim.t || 0;
    const pyS = PAD + swapRow * (CELL_SIZE + GAP);
    const pxA0 = PAD + swapColA * (CELL_SIZE + GAP);
    const pxB0 = PAD + swapColB * (CELL_SIZE + GAP);
    const step = CELL_SIZE + GAP;
    _drawSwapTile(swapAnim.aColor, pxA0 + t * step, pyS);
    _drawSwapTile(swapAnim.bColor, pxB0 - t * step, pyS);
  }

  if (cursor && !swapActive) {
    _drawCursorBracket(cursor);
  }

  _applyDotOverlay();
}

/* ─────────────────────────────────────────────────────────────
   내부 헬퍼
───────────────────────────────────────────────────────────── */
function _drawSwapTile(colorKey, px, py) {
  if (colorKey && TILE_COLORS[colorKey]) {
    const tc = TILE_COLORS[colorKey];
    ctx.fillStyle = tc.shadow;
    ctx.fillRect(px + 2, py + 2, CELL_SIZE - 2, CELL_SIZE - 2);
    ctx.fillStyle = tc.base;
    ctx.fillRect(px, py, CELL_SIZE - 2, CELL_SIZE - 2);
    ctx.fillStyle = tc.shine;
    ctx.fillRect(px, py, CELL_SIZE - 2, 5);
    ctx.fillRect(px, py, 4, CELL_SIZE - 2);
  } else {
    ctx.fillStyle = PAL.empty;
    ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
  }
}

function _drawCursorBracket(cursor) {
  const pulse = 0.7 + 0.3 * Math.sin(_frame * 0.18);
  const x1 = PAD + cursor.x * (CELL_SIZE + GAP) - 2;
  const y1 = PAD + cursor.y * (CELL_SIZE + GAP) - 2;
  const w = (CELL_SIZE + GAP) * 2 - GAP + 3;
  const h = CELL_SIZE + 3;
  const bs = 7;

  ctx.strokeStyle = "rgba(255,255,255," + 0.95 * pulse + ")";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x1 + bs, y1);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x1, y1 + bs);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1 + w - bs, y1);
  ctx.lineTo(x1 + w, y1);
  ctx.lineTo(x1 + w, y1 + bs);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1 + h - bs);
  ctx.lineTo(x1, y1 + h);
  ctx.lineTo(x1 + bs, y1 + h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1 + w, y1 + h - bs);
  ctx.lineTo(x1 + w, y1 + h);
  ctx.lineTo(x1 + w - bs, y1 + h);
  ctx.stroke();
}

function _applyDotOverlay() {
  if (!ctx) return;
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = "#000000";
  for (let sy = 0; sy < logH; sy += 4) {
    ctx.fillRect(0, sy + 2, logW, 1);
  }
  ctx.restore();
}

/* ─────────────────────────────────────────────────────────────
   3. 입력 어댑터 (click + touch)
───────────────────────────────────────────────────────────── */
function _attachInputAdapter(onCellSelect) {
  if (!canvas) return;

  function _coordToCell(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    const col = Math.floor((x - PAD) / (CELL_SIZE + GAP));
    const row = Math.floor((y - PAD) / (CELL_SIZE + GAP));
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
    return [row, col];
  }

  canvas.addEventListener("click", function (ev) {
    const cell = _coordToCell(ev.clientX, ev.clientY);
    if (cell && typeof onCellSelect === "function") {
      onCellSelect(cell[0], cell[1]);
    }
  });

  canvas.addEventListener(
    "touchend",
    function (ev) {
      ev.preventDefault();
      const t = ev.changedTouches[0];
      const cell = _coordToCell(t.clientX, t.clientY);
      if (cell && typeof onCellSelect === "function") {
        onCellSelect(cell[0], cell[1]);
      }
    },
    { passive: false },
  );
}

/* ─────────────────────────────────────────────────────────────
   4. 렌더 루프 (옵션)
───────────────────────────────────────────────────────────── */
export function startRenderLoop(getState, getSelected) {
  if (animHandle) cancelAnimationFrame(animHandle);
  function loop() {
    const s = typeof getState === "function" ? getState() : null;
    const c = typeof getSelected === "function" ? getSelected() : null;
    renderBoardToCanvas(s, c);
    animHandle = requestAnimationFrame(loop);
  }
  animHandle = requestAnimationFrame(loop);
}

export function stopRenderLoop() {
  if (animHandle) {
    cancelAnimationFrame(animHandle);
    animHandle = null;
  }
}

/** 하위 호환용 stub */
export function flashTiles(cells) {
  void cells;
}
