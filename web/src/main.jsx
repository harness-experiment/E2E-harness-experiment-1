import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { api } from "./api";
import AuthForm from "./AuthForm";
import PostForm from "./PostForm";
import "./style.css";

function App() {
  const [path, setPath] = useState(location.pathname);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [posts, setPosts] = useState([]);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  function navigate(url) {
    history.pushState({}, "", url);
    setPath(location.pathname);
  }
  useEffect(() => {
    const pop = () => setPath(location.pathname);
    addEventListener("popstate", pop);
    api("/auth/me")
      .then(setUser)
      .catch((failure) => {
        if (failure.status !== 401) setError(failure.message);
      })
      .finally(() => setReady(true));
    return () => removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setPost(null);
    const match = path.match(/^\/posts\/(\d+)(\/edit)?$/);
    const request =
      path === "/"
        ? api("/posts")
        : match
          ? api(`/posts/${match[1]}`)
          : Promise.resolve(null);
    request
      .then((data) => {
        if (active) {
          if (match) setPost(data);
          else setPosts(data || []);
        }
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path]);
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      navigate("/");
    } catch (failure) {
      setError(failure.message);
    }
  }
  async function remove() {
    if (!confirm("이 글을 삭제할까요?")) return;
    try {
      await api(`/posts/${post.id}`, { method: "DELETE" });
      navigate("/");
    } catch (failure) {
      setError(failure.message);
    }
  }
  const editing = path.endsWith("/edit");
  const writing = path === "/write";
  let content;
  if (!ready || loading) content = <p role="status">불러오는 중…</p>;
  else if (path === "/login" || path === "/signup")
    content = (
      <AuthForm
        key={path}
        mode={path.slice(1)}
        onLogin={setUser}
        navigate={navigate}
      />
    );
  else if (writing || editing) {
    if (!user)
      content = (
        <p>
          글을 쓰려면 <a href="/login">로그인</a>해 주세요.
        </p>
      );
    else if (editing && post?.authorId !== user.id)
      content = <p>작성자만 수정할 수 있습니다.</p>;
    else content = <PostForm key={path} post={post} navigate={navigate} />;
  } else if (post)
    content = (
      <article className="detail">
        <a href="/">← 모든 이야기</a>
        <h1>{post.title}</h1>
        <p className="meta">
          {post.authorEmail} ·{" "}
          {new Date(post.createdAt).toLocaleDateString("ko-KR")}
        </p>
        <div className="post-body">{post.body}</div>
        {user?.id === post.authorId && (
          <div className="actions">
            <a href={`/posts/${post.id}/edit`}>수정</a>
            <button onClick={remove}>삭제</button>
          </div>
        )}
      </article>
    );
  else if (path === "/")
    content = (
      <>
        <section className="hero">
          <div>
            <p className="eyebrow">함께 나누는 공간</p>
            <h1>
              작은 생각이
              <br />
              이야기가 되는 곳.
            </h1>
            <p>오늘의 발견과 생각을 모아, 서로의 하루를 넓혀요.</p>
          </div>
          <a className="primary" href={user ? "/write" : "/login"}>
            이야기 쓰기 ↗
          </a>
        </section>
        <section aria-label="게시글 목록">
          <div className="section-heading">
            <h2>모든 이야기</h2>
            <span>{posts.length}개의 글</span>
          </div>
          {posts.length === 0 ? (
            <div className="empty">
              <h3>아직 첫 이야기를 기다리고 있어요.</h3>
              <p>가장 먼저 당신의 이야기를 남겨 주세요.</p>
            </div>
          ) : (
            <div className="post-list">
              {posts.map((item) => (
                <a
                  className="post-card"
                  key={item.id}
                  href={`/posts/${item.id}`}
                >
                  <span className="meta">{item.authorEmail}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <span className="meta">
                    {new Date(item.createdAt).toLocaleDateString("ko-KR")}{" "}
                    <span aria-hidden="true">↗</span>
                  </span>
                </a>
              ))}
            </div>
          )}
        </section>
      </>
    );
  else
    content = (
      <p>
        페이지를 찾을 수 없습니다. <a href="/">목록으로 돌아가기</a>
      </p>
    );
  return (
    <>
      <header>
        <a className="brand" href="/">
          모아<span>moa</span>
        </a>
        <nav>
          {user ? (
            <>
              <span className="account">{user.email}</span>
              <button onClick={logout}>로그아웃</button>
            </>
          ) : (
            <>
              <a href="/login">로그인</a>
              <a href="/signup">회원가입</a>
            </>
          )}
        </nav>
      </header>
      <main>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {content}
      </main>
      <footer>모아 · 함께 쓰고, 함께 읽는 이야기</footer>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
