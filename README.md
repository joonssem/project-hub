# Project Hub

제품 방향과 개발 우선순위는 [PRD](docs/PRD.md)를 기준으로 합니다. 기존 [요구사항·MVP](docs/requirements.md)는 구현 범위와 데이터 계약을 설명합니다.

독립 프로젝트를 연결하는 JSON 기반 카드형 포털입니다.

Node.js 22 이상에서 `npm run dev` 후 http://localhost:4173 에 접속하세요. 의존성 설치는 필요 없습니다. `npm run check`로 문법 및 데이터 규칙을 검사합니다.

- 학생: `/?view=student`
- 교사: `/?view=teacher`
- 발표: `/?view=presentation&preset=training`
- 관리자: `/?view=admin`

관리자 편집은 현재 탭의 메모리에 적용됩니다. **JSON 내보내기 → 내려받은 파일을 data/projects.json에 복사 → 재빌드·배포**해야 방문자에게 반영됩니다. 가져오기는 현재 편집 내용을 대체합니다. 미니게임 플랫폼의 공개 GitHub 저장소와 실제 실행 주소를 등록했습니다. 프로젝트 상태와 공개 대상은 별도로 편집합니다. 테스트 예시는 tests/fixtures/에 별도로 보관합니다.

JSON version 2를 사용하고 예전 version 1 파일도 가져올 수 있습니다. 직전 목록 복원은 현재 탭에서 한 단계 되돌리는 기능이며 영구 백업은 아닙니다. [데이터 계약](docs/data-contract.md), [검토 보고](docs/review-2026-10-13.md), [작업 기록](docs/work-log.md)을 참조하세요. GitHub Pages 워크플로는 준비됐으며 실제 외부 배포와 [학생 iPad 테스트](docs/ipad-safari-test.md)는 다음 작업입니다.

발표 프리셋은 관리자 → 프리셋 편집에서 이름·소개·프로젝트 선택과 순서를 수정할 수 있습니다. JSON 문법을 입력할 필요가 없습니다. 숨김 프로젝트는 발표에서도 제외되며 미리보기에 표시되지 않습니다. 전체 변경 후 **탭에 적용 → JSON 내보내기**를 진행하세요. 파일 가져오기 외에 JSON 붙여넣기를 지원하며, 내보내기 화면에서 내용을 직접 확인·복사할 수도 있습니다.

공개 JSON에는 비공개 정보가 없어야 합니다. 숨김·공개 대상 설정은 접근 제한이 아닙니다. 관리자 화면에도 아직 인증이 없습니다. 자세한 범위는 [요구사항](docs/requirements.md)을 참조하세요.

`npm run build`로 배포에 필요한 파일만 dist/에 준비합니다. `npm run preview`로 빌드 결과를 확인하고 정적 호스팅에는 dist/ 내용만 배포합니다. 개발 서버는 로컬 전용이며 작업 폴더 전체를 노출하지 않습니다. [운영 안내](docs/operations.md)를 참조하세요.
