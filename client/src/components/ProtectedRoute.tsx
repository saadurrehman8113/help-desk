import { Navigate, Outlet } from "react-router";
import { useSession } from "../lib/auth-client";
import { Brand } from "./Brand";

export type AuthenticatedSession = NonNullable<
  ReturnType<typeof useSession>["data"]
>;

function SessionGuard({ guestOnly = false }: { guestOnly?: boolean }) {
  const {
    data: session,
    isPending,
    isRefetching,
    error,
    refetch,
  } = useSession();

  if (isPending || error) {
    return (
      <main className="session-screen" aria-live="polite">
        <div className="brand">
          <Brand />
        </div>
        <p>
          {isPending
            ? "Loading your workspace..."
            : "Unable to load your session. Please check your connection."}
        </p>
        {error && (
          <button disabled={isRefetching} onClick={() => void refetch()}>
            Try again
          </button>
        )}
      </main>
    );
  }

  if (guestOnly) return session ? <Navigate to="/" replace /> : <Outlet />;
  return session ? (
    <Outlet context={session satisfies AuthenticatedSession} />
  ) : (
    <Navigate to="/login" replace />
  );
}

export function ProtectedRoute() {
  return <SessionGuard />;
}

export function GuestRoute() {
  return <SessionGuard guestOnly />;
}
