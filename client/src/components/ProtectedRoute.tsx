import { Button } from "@/components/ui/button";
import { Navigate, Outlet } from "react-router";
import { useSession } from "../lib/auth-client";
import { Brand } from "./Brand";

export type AuthenticatedSession = NonNullable<
  ReturnType<typeof useSession>["data"]
>;

type SessionGuardProps = {
  guestOnly?: boolean;
  requiredRole?: AuthenticatedSession["user"]["role"];
};

function SessionGuard({ guestOnly = false, requiredRole }: SessionGuardProps) {
  const {
    data: session,
    isPending,
    isRefetching,
    error,
    refetch,
  } = useSession();

  if (isPending || error) {
    return (
      <main className="mx-auto max-w-[560px] px-7 py-20" aria-live="polite">
        <div className="inline-flex items-center gap-3 text-[19px] font-bold">
          <Brand />
        </div>
        <p className="my-[30px] leading-[1.7] text-muted-foreground">
          {isPending
            ? "Loading your workspace..."
            : "Unable to load your session. Please check your connection."}
        </p>
        {error && (
          <Button
            disabled={isRefetching}
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        )}
      </main>
    );
  }

  if (guestOnly) return session ? <Navigate to="/" replace /> : <Outlet />;
  if (session && requiredRole && session.user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }
  return session ? (
    <Outlet context={session satisfies AuthenticatedSession} />
  ) : (
    <Navigate to="/login" replace />
  );
}

export function ProtectedRoute({ requiredRole }: Pick<SessionGuardProps, "requiredRole">) {
  return <SessionGuard requiredRole={requiredRole} />;
}

export function GuestRoute() {
  return <SessionGuard guestOnly />;
}
