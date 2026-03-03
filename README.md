# swipe-pong
side game project

## 변경 이력

### 2026-03-03 — 타일 색상 확장 & 레벨별 색상 단계 시스템

#### 변경 사항
- **타일 색상 2종 추가** — 기존 4색(R·G·B·Y)에서 6색으로 확장
  - 보라 `P` (#C030FF) 추가
  - 핑크 `K` (#FF2D78) 추가 (처음 추가된 오렌지가 옐로우와 구분이 어려워 핑크로 교체)
- **레벨별 색상 단계 시스템 도입** — 난이도 수학적 밸런스 고려
  | 레벨 | 활성 색상 | 비고 |
  |:----:|:---------|:-----|
  | 0~3  | 4색 R G B Y | 초반, 매치 기댓값 높음 |
  | 4~7  | 5색 + P(보라) | 중반 |
  | 8+   | 6색 + K(핑크) | 고난이도 |
- `getActiveColors(level)` 함수 추가 (`constants.js`) — 현재 레벨에 맞는 색상 배열 반환
- `generateSafeRow` 가 `getActiveColors`를 사용하도록 수정 (`game-logic.js`)

#### 수정 파일
- `assets/constants.js`
- `assets/renderer.js`
- `assets/game-logic.js`
