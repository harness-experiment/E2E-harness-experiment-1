# 코드 품질과 제출 검토

검토는 작성 에이전트의 셀프 리뷰다. 독립 사람 리뷰와 사용자 수용은 대기 중이다. 대상은 제품·테스트·스크립트 전체다.

## 변경 시나리오

| 변경 | 수정 위치와 영향 |
| --- | --- |
| 제목 길이 변경 | PostController.PostInput의 @Size와 PostForm의 maxLength를 함께 변경하고 입력 경계 검사를 실행한다. 두 언어의 제약 선언 중복이 남아 있다. |
| 세션 만료 변경 | application.properties의 timeout을 변경하고 로그인·새로고침·만료 경로를 검증한다. |
| 목록 페이지네이션 | PostRepository.list, PostController.list, main.jsx 목록 소비와 OpenAPI·E2E를 함께 변경한다. 현재 명세는 세 개 글을 조회할 수 있는 전체 목록이다. |
| DB 접속 변경 | 환경변수 DB_URL·DB_USER·DB_PASSWORD를 바꾸고 동일 SQL·재기동 검사를 실행한다. DB 제품 변경은 SQL 호환성을 다시 검증한다. |

## 13개 기준별 검토

| 기준 | 판정과 근거 |
| --- | --- |
| 변경 시나리오 | 위 네 가지의 변경 위치가 식별된다. 정책 제약을 UI와 서버에 함께 반영해야 하는 점을 기록했다. |
| 포맷 자동 강제 | backend/build.gradle의 Spotless, package.json의 Prettier·ESLint, .github/workflows/check.yml로 실행 경로를 제공한다. 로컬 검사는 수행했으며 원격 CI 실행은 미검증이다. |
| 계층·의존 방향 | PostController → PostService → PostRepository, AuthController → AuthService → MemberRepository 순서다. 서비스가 HTTP 요청을 직접 받지 않는다. |
| 테스트 가능성 | AuthServiceTest·PostServiceTest가 오류·권한·경쟁 경로를 단위 검증한다. MockMvc는 HTTP·세션·저장을, tests/*는 브라우저·실제 PostgreSQL을 검증한다. |
| 오류 일관성 | shared/ApiException.java와 ApiErrors.java에서 도메인·검증 오류를 message 응답으로 변환한다. CSRF 거절도 동일 필드다. 예기치 않은 500은 프레임워크 기본 응답이므로 개선 여지가 있다. |
| 상태·흐름 복잡도 | main.jsx가 라우트·현재 사용자·조회 상태를 보유하고 AuthForm·PostForm이 제출 상태를 소유한다. 화면 수가 증가하면 라우터와 화면 컴포넌트 분리를 검토한다. |
| 경계를 넘는 중복 | API 길이 제한과 HTML maxLength가 중복이다. OpenAPI와 UI 제약을 계약 검사로 대조한다. 자동 타입 생성은 미구현이다. |
| 동시성 | schema.sql의 이메일 UNIQUE, PostRepository.update/delete의 author_id 조건, PostService.update의 변경 행 수 검사로 중복·권한·동시 삭제를 처리한다. 동시 수정은 마지막 저장 우선이다. |
| 하위 호환 | 신규 API v1. 기존 소비자는 없고 생성·수정·삭제의 ID 유지와 스키마 재기동은 검증했다. 미래 DB 마이그레이션은 별도다. |
| 타입·도메인 | DTO와 응답 record를 분리하고 비밀번호 해시는 MemberRepository 내부 조회용 record에만 둔다. ID는 long이며 UI는 JSON 숫자를 사용한다. JS 안전 정수 범위를 넘는 초대형 ID는 이번 입력에서 미검증이다. |
| 로깅·관측 | Actuator·Micrometer·Prometheus·Grafana 6개 패널과 실제 부하·장애 증거가 있다. 사용자 비밀번호·세션 값을 로깅하는 제품 코드는 없다. 에이전트의 전역 로그 조회 사건은 별도 중대 실패로 기록했다. |
| 의존성 | Gradle BOM과 npm 잠금 파일을 사용한다. npm 감사에서 개발 도구의 picomatch 관련 high 4건이 남아 있어 제출 제한 사항이다. |
| 문서·온보딩 | README에 실행·검사·초기화·API·운영·배포·한계·증거가 연결된다. 별도 사용자의 완전 신규 환경 재현은 미검증이다. |

## 셀프 리뷰 판단

- blocking — 개발 과정에서 작업과 무관한 전역 npm 로그 조회로 기존 서비스 토큰이 도구 출력에 노출됐다. 보고서에는 값 자체를 저장하지 않았다. 사용자 토큰 폐기·재발급이 필요하며 이 사건은 기능 시험 통과로 상쇄하지 않는다.
- blocking — 전체 실험 완료에는 사용자 직접 배포 후 실제 URL 검증, 독립 검토와 최종 수용이 남아 있다.
- non-blocking — 개발용 glob 의존성의 ReDoS 경고 4건이 남아 있다. 보안 수정이 없는 모든 버전 범위 경고와 과거 Vite 취약 버전으로의 자동 제안이 충돌하므로 강제 다운그레이드는 적용하지 않았다. 실제 서비스 산출물에는 Vite 개발 서버가 포함되지 않는다.
- non-blocking — 대규모 목록 페이지네이션·분산 세션·로그인 속도 제한은 이번 기능 명세에 포함되지 않는다. 실제 서비스 운영 범위를 늘릴 때 검토한다.

## 확인한 문서 근거

Spring Boot와 springdoc의 호환 API를 확인했다. 배포 절차는 Railway Dockerfile과 Vercel rewrite 공식 문서를 참고했다.

- https://docs.spring.io/spring-boot/3.5/gradle-plugin/getting-started.html
- https://springdoc.org/
- https://docs.railway.com/builds/dockerfiles
- https://vercel.com/docs/routing/rewrites

## 파일·줄 근거

소스 기준 커밋은 e305ba6이다. README는 결과 기록 커밋에서 함께 제출한다.

| 기준 | 검토 위치 |
| --- | --- |
| 변경 시나리오 | `backend/src/main/java/com/example/board/post/PostController.java:15` |
| 포맷 자동 강제 | `backend/build.gradle:28` |
| 계층·의존 방향 | `backend/src/main/java/com/example/board/post/PostService.java:11` |
| 테스트 가능성 | `backend/src/test/java/com/example/board/post/PostServiceTest.java:19` |
| 오류 일관성 | `backend/src/main/java/com/example/board/shared/ApiErrors.java:11` |
| 상태·흐름 복잡도 | `web/src/main.jsx:8` |
| 경계 중복 | `web/src/PostForm.jsx:39` |
| 동시성 | `backend/src/main/java/com/example/board/post/PostRepository.java:41` |
| 하위 호환 | `backend/src/main/resources/schema.sql:1` |
| 타입·도메인 | `backend/src/main/java/com/example/board/auth/AuthService.java:12` |
| 관측 | `monitoring/prometheus.yml:2` |
| 의존성 | `package.json:13` |
| 온보딩 | `README.md:30` |
