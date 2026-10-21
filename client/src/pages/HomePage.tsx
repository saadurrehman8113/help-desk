import { Card, CardHeader, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { useOutletContext } from "react-router";
import type { AuthenticatedSession } from "../components/ProtectedRoute";

export function HomePage() {
  const { user } = useOutletContext<AuthenticatedSession>();
  return (
    <main className="mx-auto max-w-[1120px] px-5 py-10 min-[761px]:px-7 min-[761px]:py-[70px]">
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
  );
}
