# Project Hub 운영 안내

## 원본과 배포

원본은 `data/projects.json`이다. `dist/`는 원본에서 생성한 공개 배포 파일이다. dist 파일을 직접 수정하면 다음 빌드에서 덮어쓴다. 전체 작업 폴더를 호스팅하지 않는다.

1. 원본 JSON을 직접 수정하거나 관리자 편집 도구에서 JSON을 내보낸다.
2. 수정 전 원본을 버전 관리하거나 별도 백업한다. 내보낸 JSON으로 원본을 교체한다.
3. `npm run check`로 문법과 데이터 계약을 검증한다.
4. `npm run build`로 공개 파일만 dist/에 준비한다. 이전 자산이 남아 있으면 빌드가 중단하며 옮겨야 할 파일명을 안내한다.
5. `npm run preview`로 빌드 결과를 확인한다. 4173 포트가 이미 사용 중이면 PowerShell에서 `$env:PORT=4174; npm run preview`를 사용한다.
6. 학생·교사·발표 화면과 실제 실행 링크를 확인한다. JSON 필드 안의 내용이 공개 가능한지도 사람이 검토한다.
7. 선택한 정적 호스팅에 dist/ 내용만 배포한다. 외부 배포 URL에서 다시 확인한다.

## 호스팅 조건

프리셋 편집은 이름과 소개를 입력하고 프로젝트를 추가·제외한 뒤 위·아래 버튼으로 순서를 정한다. 마지막에 탭에 적용해야 전체 목록에 반영된다. 프리셋 삭제도 적용 전까지는 편집 초안에만 반영된다. 닫으면 초안을 버린다.

파일 선택이 어려운 환경에서는 JSON 붙여넣기로 내용을 가져올 수 있다. 잘못된 데이터는 현재 목록을 유지한 채 오류를 표시한다. 내보내기 화면에서는 파일 다운로드 또는 전체 선택·복사로 JSON을 가져간다. 다운로드 요청 안내는 브라우저의 다운로드 완료를 보장하지 않으므로 파일을 확인한다.

초기 허브에는 서버 실행·DB가 필요하지 않다. GitHub Pages를 배포 대상으로 선정했다. 자산은 상대 경로로 제공하며 `/project-hub/` 하위 경로를 지원한다. 로컬 하위 경로 검증은 PowerShell에서 `$env:PORT=4174; $env:BASE_PATH='/project-hub/'; npm run preview`를 실행한 뒤 해당 경로를 연다.

GitHub 저장소 Settings → Pages에서 Source를 GitHub Actions로 지정한다. `.github/workflows/pages.yml`은 main 푸시 또는 수동 실행으로 검사·빌드 후 dist만 업로드한다. 저장소 문서·테스트와 내부 개발 파일은 Pages 파일에 포함되지 않는다. Pages 설정과 실제 배포 확인은 아직 남아 있다. 워크플로 구성 근거는 [GitHub 공식 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)다.

Vercel을 선택하면 Framework Preset은 Other, Build Command는 `npm run build`, Output Directory는 `dist`, Install Command는 `npm install`로 설정할 수 있다. 현재 패키지 의존성은 없다. 서비스 연결·프로젝트 생성·외부 배포는 아직 수행하지 않았다.

## 장애와 복구

- JSON 로드 실패: 화면의 다시 불러오기를 시도하고 서버의 data/projects.json 응답과 JSON 구조를 확인한다.
- 링크 오류: 개별 프로젝트 주소가 바뀌었는지 확인하고 허브 원본을 수정·재배포한다. 허브가 개별 앱의 장애를 복구하지는 않는다.
- 잘못된 목록 배포: 이전 원본과 자산으로 되돌린 후 검사·빌드·배포하거나 호스팅의 이전 배포로 복구한다.
- 로컬 편집 유실: 미내보낸 메모리 편집은 복구되지 않는다. 수정 직후 내보내고 원본을 교체한다.

## 첫 실제 사용 전 남은 사항

- 미니게임 플랫폼의 학생용 실제 실행 주소 확보와 직접 접속 확인.
- 추가할 실제 수업 자료와 공개 가능한 활용 사례 확보.
- 호스팅 선택, 외부 배포, 외부 URL에서 최종 확인.

인증·DB·웹 저장은 도입하지 않았다. 공개 대상과 숨김은 표시 규칙이며 공개 JSON의 접근 제한을 제공하지 않는다.
