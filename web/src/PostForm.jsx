import { useState } from "react";
import { api } from "./api";

export default function PostForm({ post, navigate }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget));
    if (!input.title.trim() || !input.body.trim()) {
      setError("제목과 본문을 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api(post ? `/posts/${post.id}` : "/posts", {
        method: post ? "PUT" : "POST",
        body: JSON.stringify(input),
      });
      navigate(`/posts/${result.id}`);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="editor">
      <a href="/">← 목록으로</a>
      <h1>{post ? "글 수정하기" : "이야기를 남겨 보세요."}</h1>
      <form onSubmit={submit}>
        <label>
          제목
          <input
            name="title"
            defaultValue={post?.title}
            required
            maxLength={200}
            placeholder="어떤 이야기를 나누고 싶나요?"
          />
        </label>
        <label htmlFor="post-body">본문</label>
        <textarea
          id="post-body"
          name="body"
          defaultValue={post?.body}
          required
          maxLength={10000}
          rows={12}
          placeholder="당신의 생각을 자유롭게 적어 주세요."
        />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="actions">
          <a href={post ? `/posts/${post.id}` : "/"}>취소</a>
          <button className="primary" disabled={busy}>
            {busy ? "저장 중…" : "저장하기"}
          </button>
        </div>
      </form>
    </section>
  );
}
