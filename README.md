# swipe-pong

side game project

## 변경 이력

### 2026-03-06 — 테스트 인프라 도입 & 리더보드 한글 입력 버그 수정

#### 개요

Vitest 기반 테스트 스위트를 구축하고, 리더보드 이름 입력 시 한글을 입력하면 **"AAA"로 저장되던 버그**를 수정했습니다.

#### 버그 수정

| 증상 | 원인 | 수정 |
|---|---|---|
| 한글(e.g. `홍길동`) 입력 → `"AAA"` 저장 | `replace(/[^A-Z0-9]/g, "")` 가 영숫자가 아닌 모든 문자를 제거해 빈 문자열이 되면 `"AAA"` 폴백 | 빈 입력만 `"AAA"`, 내용은 있지만 영숫자가 없는 경우 `"???"` 표시로 분리 |
| 한글 조합 중간 문자가 input에 잔류 | 서버 측 검증만 존재 | `initDom()`에서 `nameInput`에 즉시 필터링 이벤트 추가 — 영숫자 외 입력 실시간 차단 |

#### 테스트 인프라

- **도구**: Vitest (ESM 네이티브, jsdom 환경) — 빌드 불필요, `npm test` 한 줄 실행
- **총 60개 테스트, 5개 파일** 전체 통과

| 파일 | 테스트 수 | 검증 내용 |
|---|:---:|---|
| `tests/constants.test.js` | 13 | `getActiveColors` 레벨별 색상, `levelToInterval` 하한, `scoreToLevel` 경계값 |
| `tests/state.test.js` | 13 | `resetState` 초기화 범위, `loadLeaderboard` 손상 JSON 폴백 |
| `tests/game-logic.test.js` | 11 | `findMatches` 가로·세로·교차 감지, `generateSafeRow` 3연속 방지 |
| `tests/game-lifecycle.test.js` | 13 | 한글 버그 재현·수정 검증, 점수 정렬, 10개 상한, 하이스코어 갱신 |
| `tests/input.test.js` | 10 | `selectCell` 좌표 클램핑, `confirmTitleMenu` 분기 |

#### 변경 파일

| 파일 | 유형 | 내용 |
|---|:---:|---|
| `assets/game-lifecycle.js` | 수정 | `submitScore` 이름 정규화 로직 — 한글 입력 시 `"???"` 표시 |
| `assets/ui.js` | 수정 | `initDom()`에 `nameInput` 실시간 필터링 이벤트 추가 |
| `package.json` | 신규 | `type:module`, `vitest` 개발 의존성, `npm test` / `npm run test:watch` 스크립트 |
| `vitest.config.js` | 신규 | jsdom 환경, `tests/**/*.test.js` include 설정 |
| `tests/constants.test.js` | 신규 | 상수·유틸 함수 테스트 |
| `tests/state.test.js` | 신규 | 상태 관리 테스트 |
| `tests/game-logic.test.js` | 신규 | 핵심 게임 로직 테스트 |
| `tests/game-lifecycle.test.js` | 신규 | 리더보드·게임 생명주기 테스트 |
| `tests/input.test.js` | 신규 | 입력 처리 테스트 |
| `plans.md` | 수정 | 테스트 계획 섹션 추가 |

---

### 2026-03-06 — 타이틀 메뉴 시스템 구축

#### 개요

게임 진입점을 **타이틀 화면**으로 격상하고, Start / Leaderboard / Settings 세 화면으로 진입 가능한 메뉴 시스템을 구현했습니다.
모든 화면 전환은 `state.screen` 단일 값으로 제어합니다.

#### 화면 전환 흐름

```
앱 로드 → [TITLE] ─ START ──────▶ [GAME] ─ 게임오버 ─▶ [GAMEOVER]
                  ├─ LEADERBOARD ─▶ [LEADERBOARD]       ├─ SUBMIT ─▶ [LEADERBOARD]
                  └─ SETTINGS ───▶ [SETTINGS]            ├─ RETRY  ─▶ [GAME]
                                                         └─ TITLE  ─▶ [TITLE]
```

#### 새 기능

- **타이틀 화면** — Canvas에 로고·메뉴 3개 렌더. ↑↓ 키 또는 탭/클릭으로 커서 이동, Enter/탭으로 선택
- **리더보드** — 최대 10개 점수를 Canvas에 렌더 (1~3위 메달 색상). localStorage 자동 영속화
- **게임오버 이름 입력** — 3자 이니셜 입력 후 SUBMIT → 리더보드 화면으로 전환
- **Settings 독립 화면** — BGM/SFX 슬라이더를 타이틀과 Pause 양쪽에서 공유, 설정 값 localStorage 저장
- **60fps 연속 렌더 루프** — 타이틀/리더보드 커서 펄스 애니메이션 포함

#### 변경 파일

| 파일                       |   유형   | 내용                                                                                                 |
| -------------------------- | :------: | ---------------------------------------------------------------------------------------------------- |
| `assets/state.js`          |   수정   | `screen`, `menuCursor`, `leaderboard[]` 추가; `saveLeaderboard` / `loadLeaderboard` 추가             |
| `assets/settings.js`       | **신규** | BGM/SFX 설정 로직 분리 — `getSettings`, `saveSettings`, `applySettings`, `initSettingsPanel`         |
| `assets/renderer.js`       |   수정   | `renderTitleScreen`, `renderLeaderboard`, `renderSettingsBackground` 추가; 타이틀 터치 히트테스트    |
| `assets/ui.js`             |   수정   | `showScreen(name)` 추가; `render()` screen 분기; `renderLeaderboardPanel()` 추가                     |
| `assets/game-lifecycle.js` |   수정   | `goToTitle()`, `submitScore()` 추가; `startGame` / `doRise` screen 전환 연동                         |
| `assets/input.js`          |   수정   | `confirmTitleMenu()` 추가; 타이틀·리더보드·세팅 화면 키보드 분기                                     |
| `assets/main.js`           |   수정   | 신규 모듈 임포트; `onTitleMenuSelect` 콜백; `_startRenderLoop()`; 게임오버·리더보드·세팅 버튼 바인딩 |
| `index.html`               |   수정   | `#gameover` 이름 입력 UI 확장; `#leaderboardPanel` / `#settingsPanel` 독립 패널 추가                 |
| `assets/retro.css`         |   수정   | `.screen-panel`, `.gameover-content`, `#nameInput`, `.lb-row` 등 신규 스타일                         |
| `plans.md`                 |   수정   | 타이틀 메뉴 계획 및 상용 게임 수준 기능 제안 추가                                                    |

---

### 2026-03-03 — 타일 색상 확장 & 레벨별 색상 단계 시스템

#### 변경 사항

- **타일 색상 2종 추가** — 기존 4색(R·G·B·Y)에서 6색으로 확장
  - 보라 `P` (#C030FF) 추가
  - 핑크 `K` (#FF2D78) 추가 (처음 추가된 오렌지가 옐로우와 구분이 어려워 핑크로 교체)
- **레벨별 색상 단계 시스템 도입** — 난이도 수학적 밸런스 고려
  | 레벨 | 활성 색상 | 비고 |
  |:----:|:---------|:-----|
  | 0~3 | 4색 R G B Y | 초반, 매치 기댓값 높음 |
  | 4~7 | 5색 + P(보라) | 중반 |
  | 8+ | 6색 + K(핑크) | 고난이도 |
- `getActiveColors(level)` 함수 추가 (`constants.js`) — 현재 레벨에 맞는 색상 배열 반환
- `generateSafeRow` 가 `getActiveColors`를 사용하도록 수정 (`game-logic.js`)

#### 수정 파일

- `assets/constants.js`
- `assets/renderer.js`
- `assets/game-logic.js`
