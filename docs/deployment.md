# 사용자 배포 절차

이 문서는 테스트1의 배포 준비물이다. 실제 클라우드 배포·과금·계정 동의는 사용자가 수행한다. 로컬 검증 결과는 클라우드 검증 결과에 포함하지 않는다.

## Railway 백엔드

1. 검토한 브랜치를 원격에 반영하고 Railway에서 해당 저장소를 연결한다. 서비스의 Dockerfile을 루트 Dockerfile로 선택한다.
2. 별도 PostgreSQL을 연결한다. DB_URL은 `jdbc:postgresql://HOST:PORT/DATABASE`, DB_USER와 DB_PASSWORD는 해당 DB의 값으로 설정한다. 공개 문서·Git·스크린샷에 값을 넣지 않는다.
3. COOKIE_SECURE를 true로 설정한다. PORT는 Railway가 주입한 값을 사용한다. 헬스 체크 경로는 `/actuator/health`다.
4. 배포 커밋과 HTTPS 공개 URL을 확인한다. `/actuator/health`와 `/v3/api-docs`, `/swagger-ui.html`을 확인한다. 프로덕션 모니터링 접근 제어와 네트워크 구성은 로컬 시험 결과로 보장하지 않는다.
5. DB_URL은 영속 PostgreSQL을 가리켜야 한다. 배포·재기동 중 스키마는 CREATE TABLE IF NOT EXISTS만 실행하며 사용자·글 데이터를 지우지 않는다. 변경 스키마 마이그레이션은 이번 버전 범위 밖이다.

## Vercel 프론트엔드

1. 배포된 Railway HTTPS origin을 사용해 `node scripts/vercel-config.mjs https://BACKEND_HOST`를 실행한다. 생성한 vercel.json의 대상 URL을 확인한다.
2. Vercel에서 같은 저장소를 연결한다. 프로젝트 루트는 저장소 루트, 빌드는 `npm run build`, 출력은 `web/dist`다.
3. `/api/*` 요청은 Railway로 프록시하고 화면 경로는 index.html로 연결한다. 브라우저는 같은 출처에서 HttpOnly 세션 쿠키와 CSRF 토큰을 사용한다.
4. 가입·로그인·새로고침·글 작성·수정·삭제·로그아웃을 확인한다. 타 회원과 비회원 검증에는 별도 브라우저 프로필을 사용한다.

## 배포 후 확인과 복구

사용자가 프론트엔드·백엔드 URL과 배포 커밋을 알려주면 실제 환경 검증을 진행한다. 클라우드 부하·장애 시험의 대상·부하량·기간·중단 기준은 별도로 확정한다.

실패하면 Vercel·Railway의 이전 정상 배포로 되돌리고 health·로그인·공개 글 조회를 재확인한다. 앱 되돌림은 DB 복구를 대신하지 않는다. 첫 배포여서 이전 정상 버전이 없으면 서비스를 중지하고 원인과 DB 상태를 확인한다. 데이터 삭제·DB 복원은 해당 대상과 복구 지점을 확인한 뒤 수행한다.

## 로컬 관측 재현

`docker compose up -d prometheus grafana` 실행 후 Prometheus는 http://127.0.0.1:19091, Grafana는 http://127.0.0.1:13001/d/board-trial1 에서 확인한다. 두 서비스는 루프백 포트에 바인딩한다. Grafana 익명 접근은 로컬 읽기 전용 시험을 위한 설정이다. 운영 배포에 그대로 복사하지 않는다.
