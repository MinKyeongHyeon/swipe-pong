/* ============================================================
   settings.js — BGM/SFX 설정 로직 (localStorage 영속화)
   ============================================================ */
import { setBgmVolume } from "./audio.js";

const STORAGE_KEY = "swipe-pong-settings";

/* ─────────────────────────────────────────────────────────────
   퍼블릭 API
───────────────────────────────────────────────────────────── */

/** localStorage에서 설정을 읽는다. 없으면 기본값 반환. */
export function getSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        bgmVol: typeof parsed.bgmVol === "number" ? parsed.bgmVol : 0.5,
        sfxVol: typeof parsed.sfxVol === "number" ? parsed.sfxVol : 1.0,
      };
    }
  } catch (e) {
    console.warn("getSettings failed", e);
  }
  return { bgmVol: 0.5, sfxVol: 1.0 };
}

/** 설정을 localStorage에 저장한다. */
export function saveSettings(opts) {
  try {
    const current = getSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...opts }));
  } catch (e) {
    console.warn("saveSettings failed", e);
  }
}

/** 저장된 설정을 오디오 시스템 및 슬라이더 DOM에 적용한다. */
export function applySettings() {
  const s = getSettings();
  setBgmVolume(s.bgmVol);
  window.__SFX_USER_MULT = s.sfxVol;

  // 슬라이더 UI 동기화 (DOM이 준비된 경우만)
  const bgmEl = document.getElementById("bgmVol");
  const sfxEl = document.getElementById("sfxVol");
  if (bgmEl) bgmEl.value = String(s.bgmVol);
  if (sfxEl) sfxEl.value = String(s.sfxVol);
}

/** 설정 패널 DOM 이벤트를 등록한다. (initDom 이후에 호출) */
export function initSettingsPanel() {
  const bgmEl = document.getElementById("bgmVol");
  const sfxEl = document.getElementById("sfxVol");

  if (bgmEl) {
    bgmEl.addEventListener("input", (e) => {
      const v = parseFloat(e.target.value);
      setBgmVolume(v);
      saveSettings({ bgmVol: v });
    });
  }

  if (sfxEl) {
    sfxEl.addEventListener("input", (e) => {
      const v = parseFloat(e.target.value);
      window.__SFX_USER_MULT = v;
      saveSettings({ sfxVol: v });
    });
  }
}
