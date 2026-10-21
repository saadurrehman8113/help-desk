import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, Outlet, useOutletContext } from "react-router";
import { signOut } from "../lib/auth-client";
import { Brand } from "./Brand";
import type { AuthenticatedSession } from "./ProtectedRoute";

export function AppLayout() {
  const session = useOutletContext<AuthenticatedSession>();
  const { user } = session;
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
      <header className="dark border-b border-border bg-background text-foreground">
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
          {user.role === "admin" && (
            <Button variant="ghost" className="mr-auto" render={<Link to="/users" />}>
              Users
            </Button>
          )}
          <div className="flex min-w-0 items-center gap-2 min-[761px]:gap-3">
            <span
              className="hidden size-[34px] shrink-0 place-items-center rounded-full bg-muted text-[13px] font-semibold min-[761px]:grid"
              aria-hidden="true"
            >
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-sm [overflow-wrap:anywhere]">{user.name}</span>
            <Button variant="outline" disabled={busy} onClick={() => void logout()}>
              {busy ? "Logging out..." : "Log out"}
            </Button>
          </div>
        </nav>
      </header>
      {error && (
        <div className="mx-auto max-w-[1120px] px-5 pt-6 min-[761px]:px-7">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      <Outlet context={session} />
    </>
  );
}
