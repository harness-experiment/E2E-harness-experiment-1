import { test, expect } from "@playwright/test";
import {
  A,
  B,
  P1,
  P2,
  P3,
  EDIT,
  reset,
  database,
  snapshot,
  request,
  uiAuth,
  uiCreate,
  uiEdit,
  restart,
} from "./helpers";

test.beforeEach(reset);

test("INT-01 가입부터 글 작성·공개 조회·수정·삭제", async ({
  page,
  context,
  browser,
}) => {
  await uiAuth(page, "signup", A);
  await uiAuth(page, "login", A);
  const id = await uiCreate(page);
  const guest = await browser.newPage();
  await guest.goto(`http://127.0.0.1:15173/posts/${id}`);
  await expect(guest.locator(".post-body")).toHaveText(P1.body);
  await uiEdit(page, id);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  await expect(page).toHaveURL(/15173\/$/);
  expect(await snapshot()).toHaveLength(0);
  expect((await context.request.get(`/api/posts/${id}`)).status()).toBe(404);
});

test("INT-02 두 회원 소유권과 정상 수정", async ({ page, browser }) => {
  const other = await browser.newPage();
  await uiAuth(page, "signup", A);
  await uiAuth(other, "signup", B);
  await uiAuth(page, "login", A);
  await uiAuth(other, "login", B);
  const p1 = await uiCreate(page);
  const p2 = await uiCreate(other, P2);
  const before = await snapshot();
  for (const method of ["PUT", "DELETE"]) {
    expect(
      (
        await request(other.context(), method, `/posts/${p1}`, {
          ...EDIT,
          authorId: before[0].author_id,
        })
      ).status(),
    ).toBe(403);
    expect(await snapshot()).toEqual(before);
  }
  await uiEdit(page, p1);
  await uiEdit(other, p2);
  expect((await snapshot()).every((row) => row.title === EDIT.title)).toBe(
    true,
  );
});

test("INT-03 로그아웃 자격으로 쓰기 거절·공개 읽기·재로그인", async ({
  page,
  context,
  browser,
}) => {
  await uiAuth(page, "signup", A);
  await uiAuth(page, "login", A);
  const id = await uiCreate(page);
  const cookies = await context.cookies();
  const before = await snapshot();
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(
    page.getByRole("link", { name: "로그인", exact: true }),
  ).toBeVisible();
  const stale = await browser.newContext({ baseURL: "http://127.0.0.1:15173" });
  await stale.addCookies(cookies);
  const guest = await browser.newContext({ baseURL: "http://127.0.0.1:15173" });
  for (const visitor of [stale, guest]) {
    for (const [method, path] of [
      ["POST", "/posts"],
      ["PUT", `/posts/${id}`],
      ["DELETE", `/posts/${id}`],
    ]) {
      expect((await request(visitor, method, path, EDIT)).status()).toBe(401);
      expect(await snapshot()).toEqual(before);
    }
    expect((await visitor.request.get(`/api/posts/${id}`)).status()).toBe(200);
  }
  await uiAuth(page, "login", A);
  await uiEdit(page, id);
});

test("INT-04 재기동 후 계정·글·작성자 유지", async ({ page, browser }) => {
  const other = await browser.newPage();
  await uiAuth(page, "signup", A);
  await uiAuth(other, "signup", B);
  await uiAuth(page, "login", A);
  await uiAuth(other, "login", B);
  const p1 = await uiCreate(page);
  const p2 = await uiCreate(other, P2);
  const p3 = await uiCreate(page, P3);
  await uiEdit(other, p2);
  await request(page.context(), "DELETE", `/posts/${p3}`);
  const before = await snapshot();
  restart();
  expect(await snapshot()).toEqual(before);
  await uiAuth(page, "login", A);
  await uiAuth(other, "login", B);
  await page.goto(`/posts/${p1}`);
  await expect(page.locator(".post-body")).toHaveText(P1.body);
  await other.goto(`/posts/${p2}`);
  await expect(other.locator(".post-body")).toHaveText(EDIT.body);
  expect((await page.request.get(`/api/posts/${p3}`)).status()).toBe(404);
});

test("INT-05 거절 후 정상 작업과 단일 저장 상태", async ({ page, context }) => {
  await uiAuth(page, "signup", A);
  expect((await request(context, "POST", "/auth/signup", A)).status()).toBe(
    409,
  );
  await uiAuth(page, "login", A);
  expect(
    (await request(context, "POST", "/posts", { ...P1, title: "" })).status(),
  ).toBe(400);
  const id = await uiCreate(page);
  const before = await snapshot();
  expect(
    (
      await request(context, "PUT", `/posts/${id}`, { ...EDIT, body: "   " })
    ).status(),
  ).toBe(400);
  expect(await snapshot()).toEqual(before);
  await uiEdit(page, id);
  expect(await database("SELECT id FROM members")).toHaveLength(1);
  expect(await snapshot()).toHaveLength(1);
  await expect(page.locator(".post-body")).toHaveText(EDIT.body);
});
