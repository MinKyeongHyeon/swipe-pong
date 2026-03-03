/* ============================================================
   game-logic.js — 매칭·스왑·중력·제거 핵심 로직
   ============================================================ */
import { state } from "./state.js";
import {
  W,
  H,
  REMOVAL_INTERVAL,
  REMOVAL_FRAMES,
  LEVEL_THRESHOLDS,
  LEVEL_INTERVALS,
  MIN_INTERVAL,
  getActiveColors,
} from "./constants.js";
import { playSfx } from "./audio.js";
import { render } from "./ui.js";

/* ── 순환 의존 방지용 콜백 (main.js 에서 setStartRiseCb 호출) ── */
let _startRiseCb = () => {};
export function setStartRiseCb(fn) {
  _startRiseCb = fn;
}

/* ─────────────────────────────────────────────────────────────
   레벨 / 점수 유틸
───────────────────────────────────────────────────────────── */
export function scoreToLevel(s) {
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (s < LEVEL_THRESHOLDS[i]) return i;
  }
  const base = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return LEVEL_THRESHOLDS.length + Math.floor((s - base) / 150);
}

export function levelToInterval(lv) {
  if (lv < LEVEL_INTERVALS.length) return LEVEL_INTERVALS[lv];
  return Math.max(
    MIN_INTERVAL,
    LEVEL_INTERVALS[LEVEL_INTERVALS.length - 1] -
      (lv - LEVEL_INTERVALS.length + 1) * 30,
  );
}

function updateLevelAndRise() {
  const newLevel = scoreToLevel(state.score);
  if (newLevel !== state.level) {
    state.level = newLevel;
    state.riseInterval = levelToInterval(state.level);
    if (state.riseTimer) _startRiseCb();
  }
}

/* ─────────────────────────────────────────────────────────────
   안전한 새 행 생성 (가로/세로 3연속 방지)
───────────────────────────────────────────────────────────── */
export function generateSafeRow(y) {
  const row = [];
  const activeColors = getActiveColors(state.level);
  for (let x = 0; x < W; x++) {
    let choices = activeColors.slice();
    if (x >= 2 && row[x - 1] === row[x - 2])
      choices = choices.filter((c) => c !== row[x - 1]);
    if (
      y >= 2 &&
      state.board[y - 1][x] &&
      state.board[y - 1][x] === state.board[y - 2][x]
    )
      choices = choices.filter((c) => c !== state.board[y - 1][x]);
    row[x] = choices[Math.floor(Math.random() * choices.length)];
  }
  return row;
}

/* ─────────────────────────────────────────────────────────────
   매치 탐색
───────────────────────────────────────────────────────────── */
export function findMatches() {
  const out = [];

  // 가로
  for (let y = 0; y < H; y++) {
    let c = 1;
    for (let x = 1; x <= W; x++) {
      const cur = state.board[y][x];
      const prev = state.board[y][x - 1];
      if (cur && cur === prev) c++;
      else {
        if (c >= 3 && prev)
          for (let i = 0; i < c; i++) out.push([x - 1 - i, y]);
        c = 1;
      }
    }
  }

  // 세로
  for (let x = 0; x < W; x++) {
    let c = 1;
    for (let y = 1; y <= H; y++) {
      const cur = state.board[y]?.[x];
      const prev = state.board[y - 1][x];
      if (cur && cur === prev) c++;
      else {
        if (c >= 3 && prev)
          for (let i = 0; i < c; i++) out.push([x, y - 1 - i]);
        c = 1;
      }
    }
  }
  return out;
}

/* ─────────────────────────────────────────────────────────────
   스왑
───────────────────────────────────────────────────────────── */
export function swap(x, y) {
  if (state.animatingSwap && state.animatingSwap.active) return false;
  if (state.removalTimer || state.gravityTimer) return false;
  animateSwap(x, y);
  return true;
}

export function animateSwap(x, y) {
  console.log("animateSwap start", x, y);
  playSfx("swap", {
    volume: 0.35,
    playbackRate: 1 + (Math.random() - 0.5) * 0.06,
  });

  const aColor = state.board[y][x];
  const bColor = state.board[y][x + 1];

  state.board[y][x] = null;
  state.board[y][x + 1] = null;

  state.gravityWasActive = !!state.gravityTimer;
  if (state.gravityWasActive) {
    clearInterval(state.gravityTimer);
    state.gravityTimer = null;
  }

  const start = performance.now();
  const duration = 160;

  state.animatingSwap = {
    active: true,
    aColor,
    bColor,
    x,
    y,
    t: 0,
    start,
    duration,
  };
  state.suspendGame = true;

  function frame(now) {
    const raw = Math.min(
      1,
      (now - state.animatingSwap.start) / state.animatingSwap.duration,
    );
    const t = raw * raw * (3 - 2 * raw); // smoothstep
    state.animatingSwap.t = t;
    render();

    if (raw < 1) {
      requestAnimationFrame(frame);
    } else {
      state.board[y][x] = state.animatingSwap.bColor;
      state.board[y][x + 1] = state.animatingSwap.aColor;
      state.animatingSwap = { active: false };
      render();
      state.suspendGame = false;
      if (state.gravityWasActive) {
        state.gravityWasActive = false;
        setTimeout(() => gravityUntilStable(), 0);
      }
      setTimeout(() => resolve(), 0);
    }
  }

  requestAnimationFrame(frame);
}

/* ─────────────────────────────────────────────────────────────
   해결 (매칭 → 제거 → 중력 → 반복)
───────────────────────────────────────────────────────────── */
export function resolve() {
  const matches = findMatches();
  if (!matches.length) {
    if (hasFloating()) gravityUntilStable();
    return;
  }
  startRemoval(matches);
}

/* ─────────────────────────────────────────────────────────────
   중력
───────────────────────────────────────────────────────────── */
export function applyGravityStep() {
  let moved = false;
  for (let x = 0; x < W; x++) {
    for (let y = H - 2; y >= 0; y--) {
      if (state.board[y][x] && !state.board[y + 1][x]) {
        state.board[y + 1][x] = state.board[y][x];
        state.board[y][x] = null;
        moved = true;
      }
    }
  }
  return moved;
}

export function gravityUntilStable() {
  if (state.gravityTimer) return;
  console.log("gravity start");
  state.suspendGame = true;
  state.gravityTimer = setInterval(() => {
    const moved = applyGravityStep();
    if (moved) {
      render();
    } else {
      clearInterval(state.gravityTimer);
      state.gravityTimer = null;
      state.suspendGame = false;
      setTimeout(() => resolve(), 0);
    }
  }, 80);
}

export function hasFloating() {
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H - 1; y++)
      if (state.board[y][x] && !state.board[y + 1][x]) return true;
  return false;
}

/* ─────────────────────────────────────────────────────────────
   제거 애니메이션
───────────────────────────────────────────────────────────── */
export function startRemoval(coords) {
  const key = (x, y) => `${x},${y}`;
  const seen = new Set();
  coords.forEach(([x, y]) => seen.add(key(x, y)));

  const removedCount = seen.size;

  state.combo++;

  const perPiece = 10 + 10 * state.combo;
  const levelMult = 1 + state.level * 0.1;
  const points = Math.round(removedCount * perPiece * levelMult);
  state.score += points;

  if (state.score > state.highscore) {
    state.highscore = state.score;
    try {
      localStorage.setItem("swipe-pong-highscore", String(state.highscore));
    } catch (e) {}
  }

  updateLevelAndRise();

  const comboEl = document.getElementById("combo");
  if (comboEl && state.combo > 1) {
    comboEl.style.display = "block";
    comboEl.textContent = state.combo + " COMBO";
    if (state.comboTimeout) clearTimeout(state.comboTimeout);
    state.comboTimeout = setTimeout(() => {
      if (comboEl) comboEl.style.display = "none";
      state.comboTimeout = null;
    }, 1200);
  }

  state.suspendGame = true;
  playSfx("remove", { volume: 0.35, playbackRate: 1 });

  for (const s of seen) {
    const [x, y] = s.split(",").map(Number);
    state.removing.push({ x, y, frame: 0 });
  }

  if (state.removalTimer) return;
  state.removalTimer = setInterval(() => {
    for (let i = state.removing.length - 1; i >= 0; i--) {
      state.removing[i].frame++;
      if (state.removing[i].frame >= REMOVAL_FRAMES) {
        const { x, y } = state.removing[i];
        state.board[y][x] = null;
        state.removing.splice(i, 1);
      }
    }
    render();

    if (state.removing.length === 0) {
      clearInterval(state.removalTimer);
      state.removalTimer = null;
      if (hasFloating()) {
        gravityUntilStable();
      } else {
        state.suspendGame = false;
        setTimeout(() => resolve(), 0);
      }
    }
  }, REMOVAL_INTERVAL);
}
