import { test, expect } from "@playwright/test";
import {
  A,
  B,
  P1,
  P2,
  P3,
  EDIT,
  reset,
  setup,
  snapshot,
  request,
  create,
  login,
  uiCreate,
  uiEdit,
  restart,
} from "./helpers";

test.beforeEach(reset);

test("BOARD-01 비회원 빈 목록", async ({ page, context }) => {
  await page.goto("/");
  await expect(
    page.getByText("아직 첫 이야기를 기다리고 있어요."),
  ).toBeVisible();
  expect(await (await context.request.get("/api/posts")).json()).toEqual([]);
  expect(await snapshot()).toEqual([]);
});

test("BOARD-02 UI 작성과 작성자 사칭 방지", async ({ browser }) => {
  const { a, b } = await setup(browser);
  const page = await a.newPage();
  const id = await uiCreate(page);
  let rows = await snapshot();
  expect(rows).toHaveLength(1);
  expect(Number(rows[0].id)).toBe(id);
  await reset();
  const fresh = await setup(browser);
  const post = await create(fresh.a, { ...P1, authorId: fresh.users[1].id });
  expect(post.authorId).toBe(fresh.users[0].id);
  rows = await snapshot();
  expect(rows).toHaveLength(1);
  expect(Number(rows[0].author_id)).toBe(post.authorId);
  await a.close();
  await b.close();
});

test("BOARD-03 공개 목록과 상세 3개", async ({ browser, page, context }) => {
  const { a, b } = await setup(browser);
  const posts = [await create(a, P1), await create(b, P2), await create(a, P3)];
  for (const visitor of [context, b]) {
    expect(await (await visitor.request.get("/api/posts")).json()).toHaveLength(
      3,
    );
    for (const post of posts)
      expect(
        await (await visitor.request.get(`/api/posts/${post.id}`)).json(),
      ).toEqual(post);
  }
  await page.goto("/");
  for (const post of posts) {
    await page
      .getByRole("link")
      .filter({ has: page.getByRole("heading", { name: post.title }) })
      .click();
    await expect(page.locator(".post-body")).toHaveText(post.body);
    await page.goto("/");
  }
});

test("BOARD-04 작성자 수정과 다른 글 보존", async ({ browser }) => {
  const { a, b } = await setup(browser);
  const p1 = await create(a);
  const p2 = await create(b, P2);
  const page = await a.newPage();
  await uiEdit(page, p1.id);
  const edited = await (await a.request.get(`/api/posts/${p1.id}`)).json();
  expect(edited).toMatchObject({ ...EDIT, id: p1.id, authorId: p1.authorId });
  expect(await (await b.request.get(`/api/posts/${p2.id}`)).json()).toEqual(p2);
});

test("BOARD-05 삭제와 공개 조회 불가", async ({ browser, context }) => {
  const { a, b } = await setup(browser);
  const p1 = await create(a);
  const p2 = await create(b, P2);
  const page = await a.newPage();
  await page.goto(`/posts/${p1.id}`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  await expect(page).toHaveURL(/15173\/$/);
  expect((await context.request.get(`/api/posts/${p1.id}`)).status()).toBe(404);
  expect(await (await context.request.get("/api/posts")).json()).toEqual([p2]);
});

test("BOARD-06 비회원 쓰기 거절과 저장 불변", async ({
  browser,
  context,
  page,
}) => {
  const { a } = await setup(browser);
  const p1 = await create(a);
  const before = await snapshot();
  for (const [method, path] of [
    ["POST", "/posts"],
    ["PUT", `/posts/${p1.id}`],
    ["DELETE", `/posts/${p1.id}`],
  ]) {
    expect((await request(context, method, path, EDIT)).status()).toBe(401);
    expect(await snapshot()).toEqual(before);
  }
  await page.goto("/write");
  await expect(page.getByText("글을 쓰려면")).toBeVisible();
  await page.goto(`/posts/${p1.id}`);
  await expect(page.getByRole("button", { name: "삭제" })).toHaveCount(0);
  await page.goto(`/posts/${p1.id}/edit`);
  await expect(page.getByText("글을 쓰려면")).toBeVisible();
});

test("BOARD-07 타회원 사칭 변경 거절과 자기 글 수정", async ({ browser }) => {
  const { a, b } = await setup(browser);
  const p1 = await create(a);
  const p2 = await create(b, P2);
  const before = await snapshot();
  for (const method of ["PUT", "DELETE"]) {
    for (const input of [EDIT, { ...EDIT, authorId: p1.authorId }]) {
      expect(
        (await request(b, method, `/posts/${p1.id}`, input)).status(),
      ).toBe(403);
      expect(await snapshot()).toEqual(before);
    }
  }
  const page = await b.newPage();
  await page.goto(`/posts/${p1.id}/edit`);
  await expect(page.getByText("작성자만 수정할 수 있습니다.")).toBeVisible();
  expect((await request(b, "PUT", `/posts/${p2.id}`, EDIT)).status()).toBe(200);
});

test("BOARD-08 제목과 본문의 누락·빈값·공백 작성과 수정", async ({
  browser,
}) => {
  const { a } = await setup(browser);
  const p1 = await create(a);
  const before = await snapshot();
  const page = await a.newPage();
  for (const field of ["title", "body"]) {
    for (const value of [undefined, "", "   "]) {
      const input = { ...P1, [field]: value };
      for (const [method, path] of [
        ["POST", "/posts"],
        ["PUT", `/posts/${p1.id}`],
      ]) {
        expect((await request(a, method, path, input)).status()).toBe(400);
        expect(await snapshot()).toEqual(before);
      }
      for (const path of ["/write", `/posts/${p1.id}/edit`]) {
        await page.goto(path);
        await page
          .getByLabel("제목", { exact: true })
          .fill(field === "title" ? value || "" : P1.title);
        await page
          .getByLabel("본문", { exact: true })
          .fill(field === "body" ? value || "" : P1.body);
        await page.getByRole("button", { name: "저장하기" }).click();
        await expect(page).toHaveURL(new RegExp(path + "$"));
        if (value === "   ")
          await expect(page.getByRole("alert")).toBeVisible();
        else
          expect(
            await page.locator("form").evaluate((form) => form.checkValidity()),
          ).toBe(false);
        expect(await snapshot()).toEqual(before);
      }
    }
  }
});

test("BOARD-09 없는 글과 삭제한 글의 조회·수정·삭제", async ({ browser }) => {
  const { a, b } = await setup(browser);
  const p1 = await create(a);
  await create(b, P2);
  await request(a, "DELETE", `/posts/${p1.id}`);
  const before = await snapshot();
  for (const id of [999999, p1.id])
    for (const method of ["GET", "PUT", "DELETE"]) {
      expect(
        (
          await request(
            a,
            method,
            `/posts/${id}`,
            method === "GET" ? undefined : EDIT,
          )
        ).status(),
      ).toBe(404);
      expect(await snapshot()).toEqual(before);
    }
});

test("BOARD-10 재기동 후 생성·수정·삭제 유지", async ({ browser, page }) => {
  const { a, b } = await setup(browser);
  const p1 = await create(a);
  const p2 = await create(b, P2);
  const p3 = await create(a, P3);
  await request(b, "PUT", `/posts/${p2.id}`, EDIT);
  await request(a, "DELETE", `/posts/${p3.id}`);
  const before = await snapshot();
  await page.goto(`/posts/${p1.id}`);
  await page.reload();
  await expect(page.locator(".post-body")).toHaveText(P1.body);
  restart();
  expect(await snapshot()).toEqual(before);
  await page.reload();
  await expect(page.locator(".post-body")).toHaveText(P1.body);
  await login(a, A);
  await login(b, B);
  expect((await a.request.get(`/api/posts/${p3.id}`)).status()).toBe(404);
});

test("BOARD-11 한글·개행·HTML 모양 텍스트 보존", async ({ browser, page }) => {
  const { a } = await setup(browser);
  for (const body of [P1.body, "<strong>문자 그대로</strong>"]) {
    const post = await create(a, { ...P1, body });
    await page.goto(`/posts/${post.id}`);
    expect(await page.locator(".post-body").textContent()).toBe(body);
    await expect(page.locator(".post-body strong")).toHaveCount(0);
    expect(
      (await snapshot()).find((row) => Number(row.id) === post.id).body,
    ).toBe(body);
  }
});
