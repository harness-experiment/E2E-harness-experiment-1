import { useState } from "react";
import { api } from "./api";

export default function AuthForm({ mode, onLogin, navigate }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const user = await api(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (signup) navigate("/login?registered=1");
      else {
        onLogin(user);
        navigate("/");
      }
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="form-card">
      <h1>{signup ? "처음 오셨나요?" : "다시 만나 반가워요."}</h1>
      <p>
        {signup
          ? "계정을 만들고 당신의 이야기를 나눠 보세요."
          : "로그인하고 이야기를 이어 가세요."}
      </p>
      {location.search.includes("registered") && (
        <p role="status">가입했습니다. 로그인해 주세요.</p>
      )}
      <form onSubmit={submit}>
        <label>
          이메일
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
          />
        </label>
        <label>
          비밀번호
          <input
            name="password"
            type="password"
            required
            maxLength={72}
            autoComplete={signup ? "new-password" : "current-password"}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "처리 중…" : signup ? "가입하기" : "로그인"}
        </button>
      </form>
      <a href={signup ? "/login" : "/signup"}>
        {signup ? "이미 계정이 있어요" : "새 계정 만들기"}
      </a>
    </section>
  );
}
