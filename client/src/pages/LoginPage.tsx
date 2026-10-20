import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { signIn } from "../lib/auth-client";
import { Brand } from "../components/Brand";
function signInError(status: number) {
  if ([400, 401].includes(status))
    return "The email or password is incorrect. Please try again.";

  if (status === 429)
    return "Too many attempts. Please wait before trying again.";
  return "Unable to sign in. Please try again in a moment.";
}

export function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await signIn.email({
        email: String(fields.get("email")).trim(),
        password: String(fields.get("password")),
        rememberMe: fields.get("remember") === "on",
      });
      if (result.error) throw new Error(signInError(result.error.status));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-layout">
      <aside className="login-story">
        <Link to="/" className="brand">
          <Brand />
        </Link>
        <div className="story-content">
          <p className="eyebrow">A LITTLE CLARITY. A LOT OF CARE.</p>
          <h1>
            Great support.
            <br />
            Starts with you.
          </h1>
          <p>
            A calmer place to connect, solve problems, and make someone's day a
            little better.
          </p>
          <div className="story-art" aria-hidden="true">
            <div className="art-card">
              <span className="art-check">&#10003;</span>
              <div>
                <strong>One less thing to worry about.</strong>
                <span>More clarity. Happier customers.</span>
              </div>
            </div>
            <div className="art-line" />
            <div className="art-line short" />
          </div>
        </div>
        <p className="story-footer">People first. Every conversation.</p>
      </aside>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-form-wrap">
          <p className="eyebrow">WELCOME BACK</p>
          <h2 id="login-title">Sign in to your workspace</h2>
          <p className="form-intro">Enter your details to get started.</p>
          <form onSubmit={(event) => void login(event)}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
              required
              disabled={busy}
            />
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                disabled={busy}
              />
              <button
                className="password-toggle"
                type="button"
                aria-controls="password"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <label className="remember">
              <input
                type="checkbox"
                name="remember"
                defaultChecked
                disabled={busy}
              />
              Keep me signed in
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="submit" type="submit" disabled={busy}>
              {busy ? "Signing in..." : "Sign in"}
              <span aria-hidden="true">&#8594;</span>
            </button>
          </form>
          <p className="access-note">
            Need an account or help signing in?
            <br />
            Contact your workspace administrator.
          </p>
        </div>
        <p className="panel-footer">
          Your team. Your customers. One workspace.
        </p>
      </section>
    </main>
  );
}
