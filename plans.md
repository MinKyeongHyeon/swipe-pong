# Plan: 레트로 도트풍 리팩터 (Canvas 기반)

> TL;DR — 현재 DOM 기반 그리드(`#board`의 `.cell` div들)를 캔버스 렌더러로 대체해
> Nearest-neighbor 스케일링과 도트/CRT 오버레이를 적용합니다.
> 게임 로직(상태·입력·오디오)은 유지하고 렌더링만 분리해 픽셀 퍼스트 비주얼을 얻습니다.
> 팔레트: **GameBoy Pocket(녹색 계열)** / 폰트: 시스템 폰트 유지 / 데스크탑·모바일 반응형 지원.

---

## 결정사항

| 항목        | 선택                             | 이유                                           |
| ----------- | -------------------------------- | ---------------------------------------------- |
| 렌더링 방식 | Canvas 기반 렌더러 (완전 리팩터) | 가장 정교한 픽셀 제어, CRT/도트 효과 구현 가능 |
| 팔레트      | GameBoy Pocket (녹색 계열)       | 모노톤 녹색의 고전 핸드헬드 감성               |
| 폰트        | 시스템 폰트 유지                 | 추후 픽셀 폰트 추가는 옵션으로 보류            |
| 반응형      | 데스크탑 + 모바일                | 터치 입력 어댑터 포함                          |

---

## GameBoy Pocket 팔레트

| CSS 변수         | Hex       | 용도                |
| ---------------- | --------- | ------------------- |
| `--gb-bg`        | `#0F2F13` | 전체 배경           |
| `--gb-primary`   | `#1E5F2A` | 빈 셀, 보드 그리드  |
| `--gb-accent`    | `#9EDB71` | 타일 강조, 버튼     |
| `--gb-text`      | `#DFF1B8` | 텍스트, HUD         |
| `--gb-highlight` | `#67A84A` | 호버, 선택 셀       |
| `--gb-shadow`    | `#092A0D` | 캔버스 배경, 테두리 |

---

## Steps

### 1. 백업

`index.html` → `index.html.bak` 복사 (롤백 안전망).

### 2. HTML 변경 (`index.html`)

- `#board` div 옆에 `<canvas id="game-canvas"></canvas>` 추가, `.canvas-wrap` 래퍼로 감싸기.
- `<link rel="stylesheet" href="assets/retro.css">` head에 추가.
- `<script src="assets/retro.js" defer></script>` body 하단에 추가.
- 기존 `#board` 숨기기 (`display:none`) → 렌더러 완성 후 제거.

### 3. 스타일 추가 (`assets/retro.css`)

- 팔레트 CSS 변수 선언 (`:root`).
- 캔버스 래퍼 정렬 규칙.
- `image-rendering: pixelated` (모든 브라우저 접두사 포함).
- 반응형: `max-width: 100%`, `height: auto`.
- 기존 `body`, `#scoreboard` 등 HUD 요소를 팔레트 색으로 오버라이드.

### 4. 렌더러 작성 (`assets/retro.js`)

```
initCanvas(opts)
  → cols/rows 설정, canvas 엘리먼트 크기 계산
  → ctx.imageSmoothingEnabled = false
  → attachInputAdapter()

renderBoardToCanvas(state)
  → state: 2D 배열 (타일 색상 코드 'R'|'G'|'B'|'Y'|null)
  → 각 셀을 논리 버퍼에 fillRect()
  → applyDotOverlay()

applyDotOverlay()
  → 반투명 halftone dot 패턴 (CRT/도트매트릭스 느낌)

attachInputAdapter()
  → canvas click/touchstart 이벤트 → 셀 좌표 계산
  → window.selectCell(row, col) 호출 (기존 게임 API)

startRenderLoop(getState)
  → requestAnimationFrame 루프
  → 매 프레임 getState() 호출 후 renderBoardToCanvas()
```

### 5. 게임 로직 연동 (`index.html` 인라인 스크립트)

- 기존 셀 DOM 조작 코드 제거 또는 추상화.
- `selectCell(row, col)` 를 전역으로 노출 (retro.js 어댑터가 호출 가능하도록).
- 게임 상태 배열(`grid`)을 `window.gameState`로 노출 (렌더러가 읽도록).
- `RetroRenderer.initCanvas({ cols:6, rows:12 })` 호출.
- `RetroRenderer.startRenderLoop(() => window.gameState)` 호출.

### 6. 레티나·픽셀 품질 처리

- 논리 캔버스 크기: `cols × CELL_SIZE` × `rows × CELL_SIZE` (예: 240×480).
- CSS 표시 크기: 논리 크기 × `scale(2)` (예: 480×960, 또는 화면에 맞게 조정).
- `devicePixelRatio`는 **무시** — 고해상도 디스플레이에서도 의도적으로 픽셀화 유지.
- `ctx.imageSmoothingEnabled = false` 필수.

### 7. 비주얼 폴리싱

- 타일 색상 → GameBoy 팔레트 매핑 (`colorForTile()`).
- 제거 애니메이션: 밝기/알파 페이드-아웃 (캔버스 프레임 기반).
- 도트 오버레이: 반투명 원 반복 패턴 (`applyDotOverlay()`).
- 선택적: `assets/overlay.png` 텍스처 오버레이.

### 8. 문서화 (`README.md`)

- 변경 파일 요약.
- 로컬 서버 실행 방법.
- 테스트 체크리스트.

---

## 주요 변경 파일

| 파일                       | 변경 유형   | 내용                                                           |
| -------------------------- | ----------- | -------------------------------------------------------------- |
| `index.html`               | 수정        | 캔버스 추가, 인라인 스크립트 정리, `retro.css`/`retro.js` 연결 |
| `assets/retro.css`         | 신규        | 팔레트 변수, 캔버스 래퍼 스타일, 반응형                        |
| `assets/retro.js`          | 신규        | 캔버스 렌더러, 입력 어댑터, 렌더 루프                          |
| `README.md`                | 수정        | 변경 사항 문서화                                               |
| `assets/overlay.png`       | 선택적 신규 | 도트/CRT 텍스처 오버레이                                       |
| `assets/sprites/tiles.png` | 선택적 신규 | 픽셀 타일 스프라이트 (고사양 픽셀 아트 원할 시)                |

---

## Verification 체크리스트

- [ ] 보드가 캔버스에 블록/도트 픽셀 스타일로 렌더되는가 (흐려짐 없음)
- [ ] 클릭·스왑 등 기존 입력이 동일하게 작동하는가
- [ ] 모바일 터치가 정확히 셀로 매핑되는가
- [ ] BGM/SFX 동작에 영향 없음
- [ ] 레티나에서 픽셀화 유지 (`imageSmoothingEnabled = false`)
- [ ] 모바일/데스크탑 반응형 레이아웃 정상 동작

```bash
# 로컬 서버로 확인
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

---

---

# Plan: 타이틀 메뉴 시스템

> TL;DR — 게임 진입점을 "타이틀 화면"으로 격상한다.
> 타이틀에서 **Start / Leaderboard / Settings** 세 화면으로 진입 가능하며,
> 모든 화면 전환은 `state.screen` 단일 값으로 제어한다.
> Canvas 렌더러를 화면 단위로 확장하고, 현재 pauseModal의 Settings 패널을
> 독립 모듈로 분리해 재사용한다.

---

## 현재 코드 분석 및 재활용 계획

| 기존 요소                                | 현재 위치                          | 재활용 방식                                                                                     |
| ---------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| `state.gameStarted` / `state.gameOver`   | `state.js`                         | `state.screen` enum으로 통합 (`'title'`\|`'game'`\|`'gameover'`\|`'leaderboard'`\|`'settings'`) |
| `state.highscore`                        | `state.js`                         | `state.leaderboard[]` 배열로 확장 (`{rank, name, score, date}`)                                 |
| `resetState()`                           | `state.js`                         | leaderboard·screen은 리셋 제외 대상으로 명시                                                    |
| pauseModal의 BGM/SFX 슬라이더            | `index.html` + `ui.js` + `main.js` | `settings.js` 모듈로 추출 → 타이틀 Settings·게임 중 설정 양쪽에서 호출                          |
| `initCanvas()` / `renderBoardToCanvas()` | `renderer.js`                      | 화면별 렌더 함수 추가 (`renderTitleScreen`, `renderLeaderboard`, `renderSettingsScreen`)        |
| `dom.titleBtn` (pauseModal 내)           | `ui.js`                            | 타이틀로 돌아가는 기존 버튼 → `goToTitle()` 공통 함수로 연결                                    |
| `setupKeyboard()`                        | `input.js`                         | screen-aware 분기 추가 (타이틀에서 ↑↓ 메뉴 이동, Enter 선택)                                    |
| `startGame()` / `resetGame()`            | `game-lifecycle.js`                | `goToTitle()` 함수 추가, `startGame` 내부에서 `state.screen = 'game'` 설정                      |

---

## 새로운 화면 전환 흐름

```
[앱 로드]
    │
    ▼
[TITLE 화면]
  ├─ Start ──────────────▶ [GAME 화면]
  │                              │
  │                         game over
  │                              │
  │                              ▼
  │                        [GAMEOVER 화면]
  │                         ├─ Retry ──▶ [GAME 화면]
  │                         └─ Title ──▶ [TITLE 화면]
  │
  ├─ Leaderboard ────────▶ [LEADERBOARD 화면]
  │                              └─ Back ──▶ [TITLE 화면]
  │
  └─ Settings ───────────▶ [SETTINGS 화면]
                                 └─ Back ──▶ [TITLE 화면]
```

---

## Steps

### 1. `state.js` 확장

- `state.screen` 필드 추가, 초기값 `'title'`
- `state.highscore` → `state.leaderboard: []` 배열로 교체
  - 항목: `{ name: string, score: number, date: string }`
  - 최대 10개, 삽입 시 정렬 유지
- `resetState()` 수정: `screen`, `leaderboard`는 초기화 제외
- `saveLeaderboard()` / `loadLeaderboard()` 헬퍼 추가
  - `localStorage key: 'swipe-pong-leaderboard'`

```js
// 추가 예시
export const state = {
  ...
  screen: 'title',          // 'title'|'game'|'gameover'|'leaderboard'|'settings'
  leaderboard: [],           // [{ name, score, date }] 최대 10개
  menuCursor: 0,             // 타이틀 메뉴 커서 (0=Start, 1=Leaderboard, 2=Settings)
};
```

### 2. `settings.js` 신규 모듈 추출

현재 `main.js`와 `index.html`에 흩어진 BGM/SFX 슬라이더 로직을 분리한다.

```
settings.js
  ├─ getSettings()        → { bgmVol, sfxVol } (localStorage 로드)
  ├─ saveSettings(opts)   → localStorage 저장
  ├─ applySettings()      → 오디오 볼륨 적용
  └─ initSettingsPanel()  → DOM 이벤트 등록 (재사용 가능한 초기화)
```

- `main.js`에서 `initSettingsPanel()` 호출 제거 후 `settings.js` import로 대체
- pauseModal과 Settings 화면 모두 동일 함수 호출

### 3. `renderer.js` 화면별 렌더 함수 추가

기존 `renderBoardToCanvas()` 는 유지하고, 아래 함수를 추가한다.

```js
// 타이틀 화면 전체를 canvas에 그린다
export function renderTitleScreen(menuCursor)
  // 로고 텍스트 (큰 픽셀 폰트 스타일로 fillText)
  // 메뉴 아이템 3개: Start / Leaderboard / Settings
  // 커서 위치에 ▶ 아이콘 + 글로우 효과
  // 하단에 버전·크레딧 소문자 텍스트

// 리더보드 화면
export function renderLeaderboard(leaderboard)
  // 상위 10개 점수 목록
  // 1~3위는 골드/실버/브론즈 컬러

// 설정 화면 (볼륨 슬라이더는 HTML 오버레이 사용, canvas는 배경만)
export function renderSettingsBackground()
```

- 렌더 루프(`startRenderLoop`)에서 `state.screen` 분기
  ```js
  if (state.screen === 'title')      renderTitleScreen(state.menuCursor);
  else if (state.screen === 'game')  renderBoardToCanvas(...);
  else if (state.screen === 'leaderboard') renderLeaderboard(state.leaderboard);
  ...
  ```

### 4. HTML 오버레이 패널 구성 (`index.html`)

Canvas가 배경을 담당하고, 대화형 UI(버튼·슬라이더 등)는 절대 위치 HTML 오버레이로 처리한다.

```html
<!-- 타이틀 화면: canvas만으로 처리 (키/터치 입력) -->

<!-- 리더보드 패널: canvas 위 오버레이 -->
<div id="leaderboardPanel" class="screen-panel" hidden>
  <ol id="leaderboardList"></ol>
  <button id="leaderboardBack">BACK</button>
</div>

<!-- 설정 패널: 기존 settingsPanel 재사용 + screen 연동 -->
<div id="settingsPanel" class="screen-panel" hidden>
  <!-- 기존 bgmVol, sfxVol 슬라이더 그대로 -->
  <button id="settingsBack">BACK</button>
</div>

<!-- 게임 오버 오버레이: 기존 gameover div 확장 -->
<div id="gameover" hidden>
  <p id="finalScore"></p>
  <input id="nameInput" placeholder="NAME" maxlength="3" />
  <!-- 이니셜 입력 -->
  <button id="retryBtn">RETRY</button>
  <button id="titleBtn">TITLE</button>
</div>
```

- 기존 `pauseModal`의 Settings 항목은 `settingsPanel`로 통합, pauseModal은 Pause 전용으로 단순화

### 5. `ui.js` 업데이트

- `dom` 객체에 신규 요소 추가: `leaderboardPanel`, `leaderboardList`, `nameInput`, `retryBtn`
- `showScreen(name)` 헬퍼 함수 추가
  - 모든 패널 숨기고 해당 screen 패널만 표시
  - `state.screen = name` 동기화
- `renderLeaderboardPanel()` 함수 추가: `state.leaderboard`를 `<li>` 목록으로 DOM에 반영

### 6. `game-lifecycle.js` 업데이트

- `goToTitle()` 함수 추가
  - BGM 정지, 타이머 전부 클리어, `resetState()`, `state.screen = 'title'`
- `gameOver` 트리거 시 이니셜 입력 → `submitScore(name, score)` 호출 후 leaderboard 갱신
- `startGame()` 내 `state.gameStarted = true` 앞에 `state.screen = 'game'` 설정

### 7. `input.js` screen-aware 분기 추가

```js
// 타이틀 화면 키 입력
if (state.screen === "title") {
  if (key === "ArrowUp") state.menuCursor = (state.menuCursor + 2) % 3;
  if (key === "ArrowDown") state.menuCursor = (state.menuCursor + 1) % 3;
  if (key === "Enter" || key === " ") confirmTitleMenu();
  return; // 게임 입력 차단
}
```

- 터치/클릭: canvas 좌표 → 메뉴 아이템 히트 테스트 (타이틀 화면 한정)

### 8. `main.js` 흐름 정리

- 앱 로드 시 `state.screen = 'title'`로 시작 (startBtn 클릭 제거)
- `dom.startBtn` 삭제 → 타이틀 화면 Enter/클릭으로 대체
- 리더보드/설정 Back 버튼 이벤트 → `goToTitle()` 연결
- 게임오버 이니셜 입력 → `submitScore()` → 리더보드 화면 전환

---

## 주요 변경 파일 요약

| 파일                       | 변경 유형 | 핵심 내용                                                                                 |
| -------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| `assets/state.js`          | 수정      | `screen`, `leaderboard`, `menuCursor` 추가; `saveLeaderboard`/`loadLeaderboard`           |
| `assets/settings.js`       | **신규**  | BGM/SFX 설정 로직 분리·재사용 가능화                                                      |
| `assets/renderer.js`       | 수정      | `renderTitleScreen`, `renderLeaderboard`, `renderSettingsBackground` 추가; 렌더 루프 분기 |
| `assets/ui.js`             | 수정      | `showScreen()`, `renderLeaderboardPanel()`, 신규 dom 참조 추가                            |
| `assets/game-lifecycle.js` | 수정      | `goToTitle()`, `submitScore()` 추가; screen 전환 연동                                     |
| `assets/input.js`          | 수정      | 타이틀 화면 키보드·터치 분기 추가                                                         |
| `assets/main.js`           | 수정      | startBtn 로직 제거; 신규 이벤트 등록; leaderboard 로드                                    |
| `index.html`               | 수정      | leaderboardPanel, nameInput, retryBtn 추가; settingsPanel 통합                            |

---

## Verification 체크리스트

- [ ] 앱 로드 시 타이틀 화면이 Canvas에 렌더되는가
- [ ] ↑↓ 키와 터치로 메뉴 커서가 이동하는가
- [ ] Start → 게임 시작, BGM 재생 정상 동작
- [ ] 게임오버 시 이니셜 입력 → 리더보드에 저장·표시
- [ ] Leaderboard 화면: 상위 10개 점수 순서 정확
- [ ] Settings 화면: 볼륨 변경이 즉시 오디오에 반영, 새로고침 후 유지
- [ ] pauseModal → Settings와 타이틀 Settings가 동일 설정 공유
- [ ] 타이틀 → 게임 → 게임오버 → Retry / Title 전환 모두 정상

---

---

# 상용 게임 수준을 위한 기능 제안

> 현재 코드베이스 위에서 단계적으로 추가할 수 있는 기능들을 우선순위별로 정리한다.

## Tier 1 — 즉각적인 몰입감 향상 (난이도 낮음)

| 기능                     | 설명                                                       | 연관 파일                          |
| ------------------------ | ---------------------------------------------------------- | ---------------------------------- |
| **히트 사운드 다양화**   | 콤보 단계별 SFX 피치 변화 (콤보 2x → +1 반음)              | `audio.js`                         |
| **화면 쉐이크**          | 큰 콤보 발생 시 canvas translate 진동                      | `renderer.js`                      |
| **파티클 이펙트**        | 타일 제거 시 색상 파편이 흩어지는 캔버스 파티클            | `renderer.js` 신규 `particles.js`  |
| **콤보 팝업 애니메이션** | 현재 텍스트 표시를 캔버스 내 스케일-업 애니메이션으로 교체 | `renderer.js`                      |
| **레벨업 연출**          | 레벨 상승 시 화면 전체 플래시 + 레벨 텍스트 오버레이       | `renderer.js`, `game-lifecycle.js` |

## Tier 2 — 게임플레이 깊이 (중간 난이도)

| 기능                        | 설명                                                                             | 연관 파일                       |
| --------------------------- | -------------------------------------------------------------------------------- | ------------------------------- |
| **스킬 / 아이템 시스템**    | 일정 콤보 달성 시 "폭탄(한 줄 제거)", "슬로우(상승 속도 절반)" 등 특수 타일 등장 | `game-logic.js`, `state.js`     |
| **위험 경고 연출**          | 최상단 2행에 타일이 찰 경우 테두리 붉게 펄스 + 경고음                            | `renderer.js`, `audio.js`       |
| **난이도 선택**             | 타이틀 Start 클릭 후 Easy / Normal / Hard 선택 (상승 속도, 초기 행 수 조절)      | `state.js`, `game-lifecycle.js` |
| **대전 모드 (로컬 2P)**     | 같은 화면에서 키보드 좌우 분할 입력, 콤보 발생 시 상대방 보드에 방해 블록 추가   | 신규 `pvp.js`, `state.js` 확장  |
| **목표 기반 스테이지 모드** | "100점 내에 3콤보 이상 5회" 등 조건 달성 시 다음 스테이지 진출                   | 신규 `stages.js`                |

## 테스트 계획 (Vitest 기반)

### 도구 선택: Vitest

- ESM 네이티브 지원 → 기존 `import/export` 수정 없이 사용
- `vi.mock()`으로 DOM·Canvas·Audio 의존 모듈 격리
- `package.json` + `vitest.config.js` 최소 설정만 필요
- `npm test` 한 줄로 실행

### 파트별 테스트 계획

---

#### Part 1. 상수 & 유틸 (`constants.js`)

| 테스트 케이스           | 검증 내용                       |
| ----------------------- | ------------------------------- |
| `getActiveColors(0)`    | 4색 `[R,G,B,Y]` 반환            |
| `getActiveColors(12)`   | 5색 반환 (P 포함)               |
| `getActiveColors(24)`   | 6색 반환 (K 포함)               |
| `levelToInterval(0)`    | `BASE_RISE_INTERVAL(3500)` 반환 |
| `levelToInterval(1000)` | `MIN_INTERVAL(500)` 하한 준수   |
| `scoreToLevel(0)`       | 레벨 0                          |
| `scoreToLevel(400)`     | 레벨 1                          |
| `scoreToLevel(399)`     | 레벨 0 (경계값 미만)            |

---

#### Part 2. 게임 로직 (`game-logic.js`)

> `ui.js`, `audio.js`는 `vi.mock()`으로 빈 함수 대체

| 테스트 케이스                        | 검증 내용                             |
| ------------------------------------ | ------------------------------------- |
| `generateSafeRow(y)` 가로 3연속 없음 | 같은 색이 3개 이상 연속되지 않음      |
| `generateSafeRow(y)` 세로 3연속 없음 | 직전 2행과 동일한 위치에 같은 색 없음 |
| `findMatches()` 가로 3연속 감지      | 매치 좌표 정확히 반환                 |
| `findMatches()` 세로 3연속 감지      | 매치 좌표 정확히 반환                 |
| `findMatches()` 연속 없을 때         | 빈 배열 반환                          |
| `findMatches()` 4연속+               | 4개 모두 포함되어 반환                |

---

#### Part 3. 상태 관리 (`state.js`)

> `localStorage`는 `vi.stubGlobal()`로 stub 처리

| 테스트 케이스                           | 검증 내용                        |
| --------------------------------------- | -------------------------------- |
| `resetState()` 후 board                 | 전부 `null`인 12×6 배열          |
| `resetState()` 후 score/combo/level     | 0 초기화                         |
| `resetState()` 후 leaderboard/highscore | 보존됨                           |
| `saveLeaderboard()`                     | `localStorage.setItem` 호출 확인 |
| `loadLeaderboard()` 정상 JSON           | `state.leaderboard`에 반영       |
| `loadLeaderboard()` 손상된 JSON         | 빈 배열로 폴백, 예외 없음        |
| `loadLeaderboard()` 최대 10개 초과      | 10개로 슬라이싱                  |

---

#### Part 4. 리더보드 이름 등록 (`game-lifecycle.js`) ← 버그 포함

> `ui.js`, `audio.js`, `state.js`는 mock

| 테스트 케이스             | 검증 내용                                                                  |
| ------------------------- | -------------------------------------------------------------------------- |
| 영문 소문자 `"abc"` 입력  | `"ABC"` 저장                                                               |
| 영문 3자 초과 `"abcdefg"` | `"ABC"` (3자 슬라이싱)                                                     |
| 숫자 포함 `"a1b"`         | `"A1B"` 저장                                                               |
| **한글 `"홍길동"` 입력**  | `"AAA"` 대신 `"???"` 또는 입력 자체가 차단됨 확인 (버그 재현 후 수정 검증) |
| 빈 문자열 `""` 입력       | `"AAA"` fallback                                                           |
| 특수문자만 `"!@#"` 입력   | `"AAA"` fallback                                                           |
| 점수 등록 후 정렬         | 높은 점수가 앞으로 오는지                                                  |
| 11개 등록 시              | 상위 10개만 유지                                                           |
| 하이스코어 갱신           | `state.highscore` 업데이트 확인                                            |

---

#### Part 5. 입력 처리 (`input.js`)

> `game-lifecycle.js`, `audio.js`, `ui.js`는 mock

| 테스트 케이스                     | 검증 내용                                |
| --------------------------------- | ---------------------------------------- |
| `selectCell(0, 0)`                | `state.cursor` 업데이트                  |
| `selectCell(-1, -1)`              | `cursor.x/y` 가 0 미만으로 내려가지 않음 |
| `selectCell(99, 99)`              | `cursor.x` ≤ W-2, `cursor.y` ≤ H-1 상한  |
| `confirmTitleMenu()` menuCursor=0 | `startGame()` 호출                       |
| `confirmTitleMenu()` menuCursor=1 | `showScreen("leaderboard")` 호출         |
| `confirmTitleMenu()` menuCursor=2 | `showScreen("settings")` 호출            |
| game 화면이 아닐 때 `selectCell`  | `state.cursor` 변경 없음                 |

---

### 구현 순서

1. `package.json` + `vitest.config.js` 초기 설정
2. Part 1 (상수) → Part 3 (상태) → Part 2 (로직) 순으로 구현 — 의존성 낮은 것 먼저
3. Part 4 (리더보드/버그) — 버그 재현 테스트 먼저 작성 → 수정 후 통과 확인
4. Part 5 (입력) 마무리

---

## Tier 3 — 리텐션 & 소셜 (높은 난이도 / 장기 로드맵)

| 기능                | 설명                                                       | 연관 파일                      |
| ------------------- | ---------------------------------------------------------- | ------------------------------ |
| **온라인 리더보드** | Firebase Realtime DB / Supabase 연동, 전 세계 랭킹 조회    | 신규 `leaderboard-api.js`      |
| **일일 챌린지**     | 매일 바뀌는 고정 시드 보드, 전 세계 동일 조건 경쟁         | 신규 `daily.js`, 시드 기반 RNG |
| **업적 시스템**     | "첫 5콤보", "레벨 10 도달" 등 뱃지 수집, localStorage 저장 | 신규 `achievements.js`         |
| **리플레이 공유**   | 입력 시퀀스를 JSON으로 저장, URL 쿼리스트링으로 공유·재생  | 신규 `replay.js`               |
| **커스텀 팔레트**   | Settings에서 색상 테마 선택 (GameBoy / GBA / Neon / Mono)  | `renderer.js`, `settings.js`   |
