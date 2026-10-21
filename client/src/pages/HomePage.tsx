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
      <header className="border-b border-[#e0e5db] bg-white">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 p-4 min-[761px]:gap-6 min-[761px]:px-7 min-[761px]:py-5"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-0 text-[0px] font-bold min-[761px]:gap-3 min-[761px]:text-[19px]"
          >
            <Brand />
          </Link>
          <div className="flex min-w-0 items-center gap-2 min-[761px]:gap-3">
            <span
              className="hidden size-[34px] shrink-0 place-items-center rounded-full bg-[#e8eee4] text-[13px] font-semibold min-[761px]:grid"
              aria-hidden="true"
            >
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-sm [overflow-wrap:anywhere]">
              {user.name}
            </span>
            <button
              className="cursor-pointer rounded-lg border border-[#dce4d6] bg-[#f5f7f2] px-5 py-[13px] text-[13px] font-semibold whitespace-nowrap text-[#193f33] hover:bg-[#e6edde] disabled:cursor-wait disabled:opacity-65"
              disabled={busy}
              onClick={() => void logout()}
            >
              {busy ? "Logging out..." : "Log out"}
            </button>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-[1120px] px-5 py-10 min-[761px]:px-7 min-[761px]:py-[70px]">
        {error && (
          <p
            className="my-[1em] rounded-lg border border-[#f1d0c8] bg-[#fff0ec] p-3 text-[13px] leading-[1.6] text-[#993d32]"
            role="alert"
          >
            {error}
          </p>
        )}
        <p className="my-[1em] text-[11px] font-bold tracking-[0.16em] text-[#5e776e]">
          YOUR WORKSPACE
        </p>
        <h1 className="my-5 text-[clamp(32px,4vw,48px)] font-bold tracking-[-0.045em] [overflow-wrap:anywhere]">
          Welcome back, {user.name}.
        </h1>
        <p className="my-[1em] max-w-[570px] leading-[1.8] text-[#60716c]">
          A better home for customer support. You're signed in and ready to get
          started.
        </p>
        <section className="mt-[42px] max-w-[660px] rounded-[14px] border border-[#dde3da] bg-white p-6 min-[761px]:p-8">
          <span
            className="inline-block rounded-[10px] bg-[#e8eee4] px-[14px] py-2.5 text-2xl"
            aria-hidden="true"
          >
            &#8599;
          </span>
          <h2 className="my-[0.83em] text-[23px] font-bold tracking-[-0.03em]">
            Good support starts here.
          </h2>
          <p className="my-[1em] text-sm leading-[1.8] text-[#60716c]">
            Your help desk brings your team and customer conversations together.
          </p>
          <span className="mt-6 flex items-center gap-2 text-xs text-[#60716c] [overflow-wrap:anywhere]">
            <span className="size-[7px] shrink-0 rounded-full bg-[#26865c]" />
            Signed in as {user.email}
          </span>
        </section>
      </main>
    </>
  );
}
