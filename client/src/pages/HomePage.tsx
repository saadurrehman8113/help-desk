import { Card, CardHeader, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
          <div className="flex min-w-0 items-center gap-2 min-[761px]:gap-3">
            <span
              className="hidden size-[34px] shrink-0 place-items-center rounded-full bg-muted text-[13px] font-semibold min-[761px]:grid"
              aria-hidden="true"
            >
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-sm [overflow-wrap:anywhere]">
              {user.name}
            </span>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void logout()}
            >
              {busy ? "Logging out..." : "Log out"}
            </Button>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-[1120px] px-5 py-10 min-[761px]:px-7 min-[761px]:py-[70px]">
        {error && (
          <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        <p className="my-[1em] text-[11px] font-bold tracking-[0.16em] text-muted-foreground">
          YOUR WORKSPACE
        </p>
        <h1 className="my-5 text-[clamp(32px,4vw,48px)] font-bold tracking-[-0.045em] [overflow-wrap:anywhere]">
          Welcome back, {user.name}.
        </h1>
        <p className="my-[1em] max-w-[570px] leading-[1.8] text-muted-foreground">
          A better home for customer support. You're signed in and ready to get
          started.
        </p>
        <Card className="mt-10 max-w-[660px]">
          <CardHeader>
            <span
              className="w-fit rounded-lg bg-muted px-3.5 py-2.5 text-2xl"
              aria-hidden="true"
            >
              &#8599;
            </span>
            <CardTitle><h2>Good support starts here.</h2></CardTitle>
            <CardDescription>
              Your help desk brings your team and customer conversations together.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span className="flex items-center gap-2 text-xs text-muted-foreground [overflow-wrap:anywhere]">
              <span className="size-[7px] shrink-0 rounded-full bg-primary" />
              Signed in as {user.email}
            </span>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
