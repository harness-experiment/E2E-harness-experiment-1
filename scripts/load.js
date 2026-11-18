import http from "k6/http";
import { check, sleep } from "k6";

const base = "http://127.0.0.1:18081";
export const options = {
  vus: 5,
  noCookiesReset: true,
  duration: "60s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
    checks: ["rate==1"],
  },
};
function write(method, path, data) {
  const csrf = http.get(`${base}/api/auth/csrf`).json();
  return http.request(
    method,
    `${base}${path}`,
    data ? JSON.stringify(data) : null,
    {
      headers: {
        "Content-Type": "application/json",
        [csrf.headerName]: csrf.token,
      },
    },
  );
}
export default function () {
  if (__ITER === 0) {
    const user = {
      email: `load-${__VU}@example.test`,
      password: "SyntheticOnly!2026",
    };
    check(write("POST", "/api/auth/signup", user), {
      signup: (r) => r.status === 201,
    });
    check(write("POST", "/api/auth/login", user), {
      login: (r) => r.status === 200,
    });
  }
  check(http.get(`${base}/api/posts`), { list: (r) => r.status === 200 });
  const created = write("POST", "/api/posts", {
    title: "부하 시험",
    body: "합성 데이터",
  });
  check(created, { create: (r) => r.status === 201 });
  if (created.status === 201) {
    const id = created.json("id");
    check(http.get(`${base}/api/posts/${id}`), {
      detail: (r) => r.status === 200,
    });
    check(
      write("PUT", `/api/posts/${id}`, {
        title: "수정",
        body: "합성 데이터 수정",
      }),
      { update: (r) => r.status === 200 },
    );
    check(write("DELETE", `/api/posts/${id}`), {
      delete: (r) => r.status === 204,
    });
  }
  sleep(1);
}
