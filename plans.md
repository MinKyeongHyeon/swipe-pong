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
