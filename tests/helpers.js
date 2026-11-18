import { expect } from "@playwright/test";
import pg from "pg";
import { execFileSync } from "node:child_process";

export const A = {
  email: "board-a@example.test",
  password: "BoardOnly!2026_A",
};
export const B = {
  email: "board-b@example.test",
  password: "BoardOnly!2026_B",
};
export const P1 = {
  title: "첫 번째 글",
  body: "안녕하세요.\n게시판 테스트입니다.",
};
export const P2 = { title: "두 번째 글", body: "다른 회원의 글입니다." };
export const P3 = {
  title: "세 번째 글",
  body: "새로고침 후에도 남아야 합니다.",
};
export const EDIT = { title: "수정한 첫 번째 글", body: "수정된 본문입니다." };

export async function database(sql, params = []) {
  const client = new pg.Client({
    host: "127.0.0.1",
    port: 15433,
    database: "board_trial1",
    user: "board_trial1",
    password: "local-trial-only",
  });
  await client.connect();
  try {
    return (await client.query(sql, params)).rows;
  } finally {
    await client.end();
  }
}
export async function reset() {
  await database("TRUNCATE posts, members RESTART IDENTITY CASCADE");
  restart();
}
export async function snapshot() {
  return database("SELECT id,author_id,title,body FROM posts ORDER BY id");
}
export async function request(context, method, path, data) {
  const tokenResponse = await context.request.get("/api/auth/csrf");
  const csrf = await tokenResponse.json();
  return context.request.fetch(`/api${path}`, {
    method,
    data,
    headers: { [csrf.headerName]: csrf.token },
  });
}
export async function signup(context, user) {
  const response = await request(context, "POST", "/auth/signup", user);
  expect(response.status()).toBe(201);
  return response.json();
}
export async function login(context, user) {
  const response = await request(context, "POST", "/auth/login", user);
  expect(response.status()).toBe(200);
  return response.json();
}
export async function create(context, input = P1) {
  const response = await request(context, "POST", "/posts", input);
  expect(response.status()).toBe(201);
  return response.json();
}
export async function setup(browser) {
  const a = await browser.newContext({ baseURL: "http://127.0.0.1:15173" });
  const b = await browser.newContext({ baseURL: "http://127.0.0.1:15173" });
  const users = [await signup(a, A), await signup(b, B)];
  await login(a, A);
  await login(b, B);
  return { a, b, users };
}
export async function uiAuth(page, mode, user) {
  await page.goto(`/${mode}`);
  await page.getByLabel("이메일").fill(user.email);
  await page.getByLabel("비밀번호").fill(user.password);
  await page
    .getByRole("button", {
      name: mode === "signup" ? "가입하기" : "로그인",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(
    mode === "signup" ? /login\?registered=1$/ : /15173\/$/,
  );
}
export async function uiCreate(page, input = P1) {
  await page.goto("/write");
  await page.getByLabel("제목", { exact: true }).fill(input.title);
  await page.getByLabel("본문", { exact: true }).fill(input.body);
  await page.getByRole("button", { name: "저장하기" }).click();
  await expect(page).toHaveURL(/\/posts\/\d+$/);
  return Number(new URL(page.url()).pathname.split("/").at(-1));
}
export async function uiEdit(page, id, input = EDIT) {
  await page.goto(`/posts/${id}/edit`);
  await page.getByLabel("제목", { exact: true }).fill(input.title);
  await page.getByLabel("본문", { exact: true }).fill(input.body);
  await page.getByRole("button", { name: "저장하기" }).click();
  await expect(page).toHaveURL(new RegExp(`/posts/${id}$`));
}
export function restart() {
  execFileSync("node", ["scripts/app.mjs", "restart"], { timeout: 40000 });
}
