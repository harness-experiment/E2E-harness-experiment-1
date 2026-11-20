# Railway 모니터링

두 서비스 모두 이 저장소의 `deploy/railway-monitoring` 브랜치를 GitHub 소스로 사용한다.
빌드 컨텍스트는 저장소 루트이며 서비스별 Dockerfile을 지정한다.
공식 이미지는 재현 가능한 빌드를 위해 digest로 고정했다.

| 설정 | Prometheus | Grafana |
| --- | --- | --- |
| Dockerfile | monitoring/railway/Dockerfile.prometheus | monitoring/railway/Dockerfile.grafana |
| PORT | 9090 | 3000 |
| Healthcheck | /api/v1/status/runtimeinfo | /api/health |
| Volume | /prometheus | /var/lib/grafana |
| 공개 도메인 | 없음 | HTTPS 도메인 |

두 서비스는 기존 백엔드와 같은 Railway 프로젝트·환경에 둔다.
Railway가 `/-/ready` 경로를 거부해 Prometheus 상태 API를 배포 헬스체크로 사용한다.
Prometheus가 백엔드 내부 주소의 `/actuator/prometheus`를 15초마다 수집한다.
Grafana의 `PROMETHEUS_URL`은 Prometheus의 실제 내부 주소와 9090 포트를 사용한다.
대시보드 JSON은 기존 로컬 구성과 공유하며 볼륨 밖에 넣어 배포마다 갱신한다.

Grafana 변수:

- `GF_SERVER_HTTP_PORT=3000`
- `GF_SERVER_ROOT_URL=https://<생성된 도메인>/`
- `GF_SECURITY_ADMIN_USER=admin`
- `GF_SECURITY_ADMIN_PASSWORD`: Railway 비밀 변수로만 설정
- `GF_SECURITY_COOKIE_SECURE=true`
- `GF_AUTH_ANONYMOUS_ENABLED=false`
- `GF_AUTH_DISABLE_LOGIN_FORM=false`
- `GF_USERS_ALLOW_SIGN_UP=false`

Railway 볼륨은 root 소유이므로 두 서비스에 `RAILWAY_RUN_UID=0`을 설정한다.
이는 프로세스를 root로 실행하는 절충이다. Prometheus는 내부 네트워크에만 노출한다.
공식 설명: https://docs.railway.com/volumes#permissions

Prometheus 데이터는 7일 또는 블록 크기 1GB 중 먼저 도달한 제한으로 삭제된다.
WAL 등 추가 공간이 필요하므로 전체 디스크 사용량의 절대 상한은 아니다.
볼륨은 재배포 시 보존되지만 별도의 백업을 대신하지 않는다.
Grafana의 최초 관리자 암호는 DB 초기화에만 적용된다. 이후 변경은 Grafana에서 한다.

검증: `promtool check config`, Docker 빌드, Railway 배포 성공,
Grafana health 및 인증, provisioned dashboard, Prometheus `up{job="board-trial1"}`.
