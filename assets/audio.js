/* ============================================================
   audio.js — Web Audio API + HTMLAudio 폴백 래퍼
   ============================================================ */
import { GLOBAL_SFX_GAIN } from "./constants.js";

const supportsWebAudio = !!(window.AudioContext || window.webkitAudioContext);

let audioCtx = null;
let bgmBuffer = null;
let bgmSource = null;
let bgmGain = null;
let bgmEl = null;

const sfxBuffers = {};
const sfxAudioEls = {};

/* ─────────────────────────────────────────────────────────────
   초기화 (DOM 준비 후 main.js 에서 호출)
───────────────────────────────────────────────────────────── */
export function initAudio() {
  bgmEl = document.getElementById("bgm");
  if (bgmEl) {
    bgmEl.loop = true;
    bgmEl.volume = 0.5;
    bgmEl.addEventListener("ended", () => {
      try {
        bgmEl.currentTime = 0;
        const p = bgmEl.play();
        if (p && p.catch) p.catch(() => {});
      } catch (e) {
        /* ignore */
      }
    });
  }

  if (supportsWebAudio) {
    decodeBgm("assets/bgm.wav").catch(() => {});
  }

  loadSfx("swap", "assets/swap.wav");
  loadSfx("remove", "assets/remove.wav");
  loadSfx("cursor", "assets/cursor.wav");
}

/* ─────────────────────────────────────────────────────────────
   AudioContext 헬퍼
───────────────────────────────────────────────────────────── */
export function getSupportsWebAudio() {
  return supportsWebAudio;
}
export function getAudioCtx() {
  return audioCtx;
}
export function getBgmEl() {
  return bgmEl;
}

export function ensureAudioCtx() {
  if (!audioCtx)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

/* ─────────────────────────────────────────────────────────────
   BGM
───────────────────────────────────────────────────────────── */
export async function decodeBgm(url) {
  try {
    if (!audioCtx)
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    bgmBuffer = await audioCtx.decodeAudioData(arr);
  } catch (e) {
    console.warn("decodeBgm failed", e);
    bgmBuffer = null;
  }
}

export function isBgmDecoded() {
  return !!bgmBuffer;
}

export function playBgmWebAudio(opts = {}) {
  if (!supportsWebAudio || !bgmBuffer) return false;
  const fadeIn = typeof opts.fadeIn === "number" ? opts.fadeIn : 0.4;
  try {
    if (bgmSource) bgmSource.stop();
  } catch (e) {}
  bgmSource && bgmSource.disconnect();
  bgmGain && bgmGain.disconnect();

  bgmSource = audioCtx.createBufferSource();
  bgmGain = audioCtx.createGain();
  bgmSource.buffer = bgmBuffer;
  bgmSource.loop = true;
  bgmSource.connect(bgmGain);
  bgmGain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  bgmGain.gain.setValueAtTime(0, now);
  bgmSource.start(0);
  bgmGain.gain.linearRampToValueAtTime(0.5, now + fadeIn);
  return true;
}

export function stopBgmWebAudio(opts = {}) {
  if (!supportsWebAudio || !bgmSource || !bgmGain) return;
  const fadeOut = typeof opts.fadeOut === "number" ? opts.fadeOut : 0.25;
  const now = audioCtx.currentTime;
  try {
    bgmGain.gain.cancelScheduledValues(now);
  } catch (e) {}
  bgmGain.gain.setValueAtTime(bgmGain.gain.value || 0.5, now);
  bgmGain.gain.linearRampToValueAtTime(0, now + fadeOut);
  setTimeout(
    () => {
      try {
        bgmSource.stop();
      } catch (e) {}
      bgmSource.disconnect();
      bgmGain.disconnect();
      bgmSource = null;
      bgmGain = null;
    },
    (fadeOut + 0.05) * 1000,
  );
}

/** 모달 열기 시 오디오 일시 정지. HTML 오디오가 재생 중이었으면 true 반환 */
export function suspendAudio() {
  let htmlWasPlaying = false;
  try {
    if (supportsWebAudio && audioCtx && audioCtx.state === "running") {
      audioCtx.suspend().catch(() => {});
    } else if (bgmEl && !bgmEl.paused) {
      htmlWasPlaying = true;
      bgmEl.pause();
    }
  } catch (e) {}
  return htmlWasPlaying;
}

/** 모달 닫기 시 오디오 재개 */
export function resumeAudio(htmlWasPlaying) {
  try {
    if (supportsWebAudio && audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    } else if (bgmEl && htmlWasPlaying) {
      bgmEl.play().catch(() => {});
    }
  } catch (e) {}
}

export function setBgmVolume(v) {
  if (bgmEl) bgmEl.volume = v;
  if (bgmGain && audioCtx) {
    try {
      bgmGain.gain.setValueAtTime(v, audioCtx.currentTime);
    } catch (e) {}
  }
}

/* ─────────────────────────────────────────────────────────────
   SFX
───────────────────────────────────────────────────────────── */
export async function loadSfx(name, url) {
  if (supportsWebAudio) {
    try {
      if (!audioCtx)
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      const buf = await audioCtx.decodeAudioData(arr);
      sfxBuffers[name] = buf;
      return buf;
    } catch (e) {
      console.warn("loadSfx webaudio failed", name, e);
      sfxBuffers[name] = null;
    }
  }
  try {
    const a = new Audio(url);
    a.preload = "auto";
    sfxAudioEls[name] = a;
    return a;
  } catch (e) {
    console.warn("loadSfx fallback failed", name, e);
    return null;
  }
}

export function playSfx(name, opts = {}) {
  const volume = typeof opts.volume === "number" ? opts.volume : 1;
  const playbackRate =
    typeof opts.playbackRate === "number" ? opts.playbackRate : 1;
  const userMul =
    typeof window.__SFX_USER_MULT === "number" ? window.__SFX_USER_MULT : 1;

  if (supportsWebAudio && sfxBuffers[name]) {
    try {
      if (!audioCtx)
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = audioCtx.createBufferSource();
      const gain = audioCtx.createGain();
      src.buffer = sfxBuffers[name];
      src.playbackRate.value = playbackRate;
      gain.gain.value = volume * GLOBAL_SFX_GAIN * userMul;
      src.connect(gain);
      gain.connect(audioCtx.destination);
      src.start(0);
      src.onended = () => {
        try {
          src.disconnect();
          gain.disconnect();
        } catch (e) {}
      };
      return true;
    } catch (e) {
      console.warn("playSfx webaudio error", name, e);
    }
  }

  const a = sfxAudioEls[name];
  if (a) {
    try {
      const clone = a.cloneNode();
      clone.volume = Math.max(
        0,
        Math.min(1, volume * GLOBAL_SFX_GAIN * userMul),
      );
      clone.playbackRate = playbackRate;
      clone.play().catch(() => {});
      return true;
    } catch (e) {
      console.warn("playSfx htmlaudio error", name, e);
    }
  }
  return false;
}
