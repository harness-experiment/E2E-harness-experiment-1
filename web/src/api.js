export async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (options.method && options.method !== "GET") {
    const response = await fetch("/api/auth/csrf");
    if (!response.ok)
      throw new Error("요청을 준비하지 못했습니다. 다시 시도해 주세요.");
    const csrf = await response.json();
    headers[csrf.headerName] = csrf.token;
  }
  const response = await fetch(`/api${path}`, { ...options, headers });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || "요청을 처리하지 못했습니다.");
    error.status = response.status;
    throw error;
  }
  return data;
}
