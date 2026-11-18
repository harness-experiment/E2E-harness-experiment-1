import { test, expect } from "@playwright/test";
import {
  A,
  B,
  reset,
  database,
  request,
  signup,
  login,
  uiAuth,
} from "./helpers";

test.beforeEach(reset);

test("AUTH-01 UI 가입과 서로 다른 회원 ID", async ({
  page,
  context,
  browser,
}) => {
  await uiAuth(page, "signup", A);
  const other = await browser.newPage();
  await uiAuth(other, "signup", B);
  const rows = await database("SELECT id,email FROM members ORDER BY id");
  expect(rows.map((row) => row.email)).toEqual([A.email, B.email]);
  expect(rows[0].id).not.toBe(rows[1].id);
  expect((await context.request.get("/api/auth/me")).status()).toBe(401);
});

test("AUTH-02 중복 가입 거절과 원래 비밀번호 유지", async ({
  page,
  context,
}) => {
  await uiAuth(page, "signup", A);
  const before = await database("SELECT id,email,password_hash FROM members");
  const response = await request(context, "POST", "/auth/signup", {
    ...A,
    password: "Another!2026",
  });
  expect(response.status()).toBe(409);
  expect(await database("SELECT id,email,password_hash FROM members")).toEqual(
    before,
  );
  await uiAuth(page, "login", A);
});

test("AUTH-03 잘못된 가입 입력의 UI와 서버 거절", async ({ page, context }) => {
  for (const input of [
    { password: A.password },
    { email: "", password: A.password },
    { email: "not-an-email", password: A.password },
    { email: A.email, password: "" },
  ]) {
    expect(
      (await request(context, "POST", "/auth/signup", input)).status(),
    ).toBe(400);
    await page.goto("/signup");
    await page.getByLabel("이메일").fill(input.email || "");
    await page.getByLabel("비밀번호").fill(input.password);
    await page.getByRole("button", { name: "가입하기" }).click();
    await expect(page).toHaveURL(/signup$/);
    expect(
      await page.locator("form").evaluate((form) => form.checkValidity()),
    ).toBe(false);
  }
  expect(await database("SELECT id FROM members")).toHaveLength(0);
});

test("AUTH-04 잘못된 로그인은 인증하지 않음", async ({ context }) => {
  await signup(context, A);
  for (const input of [
    { ...A, password: "WrongOnly!2026" },
    { email: "missing@example.test", password: "BoardOnly!2026_X" },
    { email: "", password: "" },
  ]) {
    expect([400, 401]).toContain(
      (await request(context, "POST", "/auth/login", input)).status(),
    );
    expect((await context.request.get("/api/auth/me")).status()).toBe(401);
  }
});

test("AUTH-05 A와 B의 로그인 격리", async ({ page, context, browser }) => {
  const other = await browser.newPage();
  const a = await signup(context, A);
  const b = await signup(other.context(), B);
  await uiAuth(page, "login", A);
  await uiAuth(other, "login", B);
  expect(await (await context.request.get("/api/auth/me")).json()).toEqual(a);
  expect(
    await (await other.context().request.get("/api/auth/me")).json(),
  ).toEqual(b);
  await expect(page.locator(".account")).toHaveText(A.email);
  await expect(other.locator(".account")).toHaveText(B.email);
});

test("AUTH-06 새로고침 인증 유지와 비회원 격리", async ({
  page,
  context,
  browser,
}) => {
  await signup(context, A);
  await uiAuth(page, "login", A);
  await page.reload();
  await expect(page.locator(".account")).toHaveText(A.email);
  const guest = await browser.newContext();
  expect(
    (await guest.request.get("http://127.0.0.1:15173/api/auth/me")).status(),
  ).toBe(401);
});

test("AUTH-07 로그아웃한 자격 재사용 거절과 재로그인", async ({
  page,
  context,
  browser,
}) => {
  await signup(context, A);
  await uiAuth(page, "login", A);
  const oldCookies = await context.cookies();
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(
    page.getByRole("link", { name: "로그인", exact: true }),
  ).toBeVisible();
  await page.reload();
  expect((await context.request.get("/api/auth/me")).status()).toBe(401);
  const stale = await browser.newContext({ baseURL: "http://127.0.0.1:15173" });
  await stale.addCookies(oldCookies);
  expect((await stale.request.get("/api/auth/me")).status()).toBe(401);
  await uiAuth(page, "login", A);
});

test("AUTH-08 비밀번호 해시와 응답 비밀값 검사", async ({ context, page }) => {
  const result = await signup(context, A);
  const user = await login(context, A);
  expect(Object.keys(result).sort()).toEqual(["email", "id"]);
  expect(Object.keys(user).sort()).toEqual(["email", "id"]);
  const rows = await database("SELECT password_hash FROM members");
  expect(rows[0].password_hash).not.toBe(A.password);
  expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
  await page.goto("/");
  await expect(page.locator("body")).not.toContainText(A.password);
});
