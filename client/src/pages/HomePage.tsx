import { useState } from "react";
import { Link, useOutletContext } from "react-router";
import { signOut } from "../lib/auth-client";
import { Brand } from "../components/Brand";
import type { AuthenticatedSession } from "../components/ProtectedRoute";

export function HomePage() {
  const { user } = useOutletContext<AuthenticatedSession>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await signOut();
      if (result.error) throw new Error("Unable to log out.");
    } catch {
      setError("Unable to log out. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="navbar">
        <nav aria-label="Main navigation" className="nav-content">
          <Link to="/" className="brand">
            <Brand />
          </Link>
          <div className="nav-user">
            <span className="avatar" aria-hidden="true">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="user-name">{user.name}</span>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void logout()}
            >
              {busy ? "Logging out..." : "Log out"}
            </button>
          </div>
        </nav>
      </header>
      <main className="home">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <p className="eyebrow">YOUR WORKSPACE</p>
        <h1>Welcome back, {user.name}.</h1>
        <p className="intro">
          A better home for customer support. You're signed in and ready to get
          started.
        </p>
        <section className="welcome-card">
          <span className="card-icon" aria-hidden="true">
            &#8599;
          </span>
          <h2>Good support starts here.</h2>
          <p>
            Your help desk brings your team and customer conversations together.
          </p>
          <span className="status">
            <span className="dot" />
            Signed in as {user.email}
          </span>
        </section>
      </main>
    </>
  );
}
