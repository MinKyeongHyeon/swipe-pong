/* ============================================================
   renderer.js — GameBoy Advance 캔버스 렌더러 & 입력 어댑터
   (retro.js를 ES6 named-export 모듈로 리팩터)
   ============================================================ */
"use strict";

import { state } from "./state.js";

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
    base: "#00E0E0",
    shine: "rgba(140,255,255,0.45)",
    shadow: "rgba(0,60,60,0.55)",
  },
};

/* ── 타이틀 메뉴 레이아웃 상수 ──────────────────────────── */
/** 각 메뉴 아이템 중심 Y 좌표 (logical px) */
const TITLE_MENU_Y = [248, 300, 352];
/** 메뉴 아이템 히트 영역 높이 */
const TITLE_MENU_ITEM_H = 48;
const TITLE_MENU_LABELS = ["START", "LEADERBOARD", "SETTINGS"];

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
 *   게임 화면 캔버스 클릭/터치 시 호출될 콜백 (row, col)
 * @param {function(number): void} [onTitleMenuSelect]
 *   타이틀 화면 메뉴 아이템 클릭/터치 시 호출될 콜백 (menuIndex)
 */
export function initCanvas(onCellSelect, onTitleMenuSelect) {
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

  _attachInputAdapter(onCellSelect, onTitleMenuSelect);

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
   타이틀 화면 렌더
───────────────────────────────────────────────────────────── */
export function renderTitleScreen(menuCursor) {
  if (!ctx) return;
  _frame++;

  // 배경
  ctx.fillStyle = PAL.bg;
  ctx.fillRect(0, 0, logW, logH);

  // 스캔라인 효과
  ctx.fillStyle = "rgba(112,112,255,0.04)";
  for (let y = 0; y < logH; y += 4) ctx.fillRect(0, y, logW, 2);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // 로고 — "PANEL"
  ctx.font = "bold 38px monospace";
  ctx.fillStyle = PAL.text;
  ctx.shadowColor = "rgba(112,112,255,0.85)";
  ctx.shadowBlur = 14;
  ctx.fillText("PANEL", logW / 2, 76);

  // 로고 — "PUZZLE"
  ctx.font = "bold 28px monospace";
  ctx.fillStyle = "#7070ff";
  ctx.shadowColor = "rgba(112,112,255,0.9)";
  ctx.shadowBlur = 12;
  ctx.fillText("PUZZLE", logW / 2, 116);
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  // 구분선
  ctx.strokeStyle = "rgba(112,112,255,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, 142);
  ctx.lineTo(logW - 24, 142);
  ctx.stroke();

  // 버전
  ctx.font = "10px monospace";
  ctx.fillStyle = "#8888bb";
  ctx.fillText("v1.0  —  SWIPE EDITION", logW / 2, 158);

  // 메뉴 아이템
  for (let i = 0; i < TITLE_MENU_LABELS.length; i++) {
    const cy = TITLE_MENU_Y[i];
    const isSelected = i === (menuCursor || 0);
    const pulse = 0.5 + 0.5 * Math.sin(_frame * 0.12);

    if (isSelected) {
      // 선택된 항목 배경 하이라이트
      ctx.fillStyle = `rgba(112,112,255,${0.1 + 0.07 * pulse})`;
      ctx.fillRect(PAD + 2, cy - 20, logW - (PAD + 2) * 2, 40);
      ctx.strokeStyle = `rgba(112,112,255,${0.55 + 0.4 * pulse})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(PAD + 2, cy - 20, logW - (PAD + 2) * 2, 40);

      // 커서 ▶
      ctx.font = "14px monospace";
      ctx.fillStyle = "#7070ff";
      ctx.textAlign = "left";
      ctx.fillText("▶", PAD + 10, cy);
    }

    ctx.font = isSelected ? "bold 17px monospace" : "14px monospace";
    ctx.fillStyle = isSelected ? PAL.text : "#8888bb";
    ctx.textAlign = "center";
    ctx.fillText(TITLE_MENU_LABELS[i], logW / 2 + 8, cy);
  }

  // 하단 힌트
  const hintAlpha = 0.45 + 0.25 * Math.sin(_frame * 0.07);
  ctx.font = "9px monospace";
  ctx.fillStyle = `rgba(136,136,187,${hintAlpha})`;
  ctx.textAlign = "center";
  ctx.fillText("↑↓  MOVE     ENTER / TAP  SELECT", logW / 2, logH - 18);

  _applyDotOverlay();
}

/* ─────────────────────────────────────────────────────────────
   리더보드 화면 렌더
───────────────────────────────────────────────────────────── */
export function renderLeaderboard(entries) {
  if (!ctx) return;
  _frame++;

  ctx.fillStyle = PAL.bg;
  ctx.fillRect(0, 0, logW, logH);

  ctx.fillStyle = "rgba(112,112,255,0.04)";
  for (let y = 0; y < logH; y += 4) ctx.fillRect(0, y, logW, 2);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // 타이틀
  ctx.font = "bold 18px monospace";
  ctx.fillStyle = "#ffd700";
  ctx.shadowColor = "rgba(255,215,0,0.6)";
  ctx.shadowBlur = 8;
  ctx.fillText("LEADERBOARD", logW / 2, 30);
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  // 구분선
  ctx.strokeStyle = "rgba(255,215,0,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, 48);
  ctx.lineTo(logW - PAD, 48);
  ctx.stroke();

  // 컬럼 헤더
  ctx.font = "9px monospace";
  ctx.fillStyle = "#8888bb";
  ctx.textAlign = "left";
  ctx.fillText("#", PAD + 4, 62);
  ctx.fillText("NAME", PAD + 22, 62);
  ctx.fillText("SCORE", PAD + 72, 62);
  ctx.textAlign = "right";
  ctx.fillText("DATE", logW - PAD - 4, 62);

  if (!entries || entries.length === 0) {
    ctx.font = "12px monospace";
    ctx.fillStyle = "#8888bb";
    ctx.textAlign = "center";
    ctx.fillText("NO RECORDS YET", logW / 2, logH / 2);
  } else {
    const rankColors = ["#ffd700", "#c0c0c0", "#cd7f32"];
    for (let i = 0; i < Math.min(entries.length, 10); i++) {
      const e = entries[i];
      const ey = 80 + i * 38;
      const rankColor = i < 3 ? rankColors[i] : "#8888bb";

      // 줄 배경
      ctx.fillStyle = i % 2 === 0 ? "rgba(112,112,255,0.05)" : "transparent";
      ctx.fillRect(PAD, ey - 14, logW - PAD * 2, 30);

      // 순위
      ctx.font = i < 3 ? "bold 12px monospace" : "11px monospace";
      ctx.fillStyle = rankColor;
      ctx.textAlign = "left";
      ctx.fillText(String(i + 1), PAD + 4, ey);

      // 이름
      ctx.fillStyle = i < 3 ? PAL.text : "#aaaacc";
      ctx.font = "12px monospace";
      ctx.fillText(e.name || "???", PAD + 22, ey);

      // 점수
      ctx.fillStyle = rankColor;
      ctx.font = i < 3 ? "bold 12px monospace" : "11px monospace";
      ctx.fillText(String(e.score), PAD + 72, ey);

      // 날짜
      ctx.font = "9px monospace";
      ctx.fillStyle = "#8888bb";
      ctx.textAlign = "right";
      ctx.fillText(e.date || "", logW - PAD - 4, ey);
    }
  }

  // 하단 힌트
  ctx.font = "9px monospace";
  ctx.fillStyle = "rgba(136,136,187,0.55)";
  ctx.textAlign = "center";
  ctx.fillText("ESC · BACK BUTTON → RETURN", logW / 2, logH - 18);

  _applyDotOverlay();
}

/* ─────────────────────────────────────────────────────────────
   설정 화면 배경 렌더 (슬라이더는 HTML 오버레이)
───────────────────────────────────────────────────────────── */
export function renderSettingsBackground() {
  if (!ctx) return;
  _frame++;

  ctx.fillStyle = PAL.bg;
  ctx.fillRect(0, 0, logW, logH);

  ctx.fillStyle = "rgba(112,112,255,0.04)";
  for (let y = 0; y < logH; y += 4) ctx.fillRect(0, y, logW, 2);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 20px monospace";
  ctx.fillStyle = "#7070ff";
  ctx.shadowColor = "rgba(112,112,255,0.7)";
  ctx.shadowBlur = 10;
  ctx.fillText("SETTINGS", logW / 2, 44);
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  ctx.strokeStyle = "rgba(112,112,255,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, 64);
  ctx.lineTo(logW - 24, 64);
  ctx.stroke();

  _applyDotOverlay();
}
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
function _attachInputAdapter(onCellSelect, onTitleMenuSelect) {
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

  function _coordToTitleMenu(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    for (let i = 0; i < TITLE_MENU_Y.length; i++) {
      if (Math.abs(y - TITLE_MENU_Y[i]) <= TITLE_MENU_ITEM_H / 2) return i;
    }
    return -1;
  }

  canvas.addEventListener("click", function (ev) {
    if (state.screen === "title") {
      const idx = _coordToTitleMenu(ev.clientX, ev.clientY);
      if (idx >= 0 && typeof onTitleMenuSelect === "function")
        onTitleMenuSelect(idx);
    } else if (state.screen === "game") {
      const cell = _coordToCell(ev.clientX, ev.clientY);
      if (cell && typeof onCellSelect === "function")
        onCellSelect(cell[0], cell[1]);
    }
  });

  canvas.addEventListener(
    "touchend",
    function (ev) {
      ev.preventDefault();
      const t = ev.changedTouches[0];
      if (state.screen === "title") {
        const idx = _coordToTitleMenu(t.clientX, t.clientY);
        if (idx >= 0 && typeof onTitleMenuSelect === "function")
          onTitleMenuSelect(idx);
      } else if (state.screen === "game") {
        const cell = _coordToCell(t.clientX, t.clientY);
        if (cell && typeof onCellSelect === "function")
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
