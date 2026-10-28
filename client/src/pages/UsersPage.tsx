import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";

type UsersResult = {
  users: { id: string; name: string; email: string; role: "admin" | "agent"; createdAt: string }[];
  page: number;
  pageSize: number;
  total: number;
};

export function UsersPage() {
  const { refetch } = useSession();
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<UsersResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [redirect, setRedirect] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;
    setLoading(true);
    setError(false);
    setResult(null);
    async function load() {
      try {
        const response = await fetch(`/api/users?page=${page}`, { signal: controller.signal });
        if (ignore) return;
        if (response.status === 401 || response.status === 403) {
          if (response.status === 401) await refetch();
          if (!ignore) setRedirect(response.status === 401 ? "/login" : "/");
          return;
        }
        if (!response.ok) throw new Error("Unable to load users");
        const data: UsersResult = await response.json();
        if (!ignore) setResult(data);
      } catch {
        if (!ignore) setError(true);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void load();
    return () => { ignore = true; controller.abort(); };
  }, [page, attempt, refetch]);

  if (redirect) return <Navigate to={redirect} replace />;

  function changePage(next: number) {
    setLoading(true);
    setResult(null);
    setPage(next);
  }

  return (
    <main className="mx-auto max-w-[1120px] px-5 py-10 min-[761px]:px-7 min-[761px]:py-[70px]">
      <h1 className="text-3xl font-bold text-foreground">Users</h1>
      <p className="mt-2 text-muted-foreground">Admins and agents in your workspace.</p>
      <Card className="mt-8">
        <CardContent>
          <div aria-live="polite" aria-busy={loading}>
            {loading && <p className="py-8 text-muted-foreground">Loading users...</p>}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  Unable to load users. Please try again.
                  <Button variant="outline" className="mt-3 w-fit" onClick={() => setAttempt(value => value + 1)}>Try again</Button>
                </AlertDescription>
              </Alert>
            )}
            {result && <>
              <p className="mb-4 text-sm text-muted-foreground">{result.total} {result.total === 1 ? "user" : "users"}</p>
              {result.users.length === 0 ? (
                <p className="py-8 text-muted-foreground">{result.total === 0 ? "No users yet." : "No users on this page."}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">Workspace users</caption>
                    <thead className="border-b border-border text-muted-foreground">
                      <tr>{["Name", "Email", "Role", "Created"].map(label => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr>
                    </thead>
                    <tbody>
                      {result.users.map(user => (
                        <tr key={user.id} className="border-b border-border last:border-0">
                          <td className="max-w-64 break-words px-4 py-4 font-medium">{user.name}</td>
                          <td className="max-w-80 break-words px-4 py-4 text-muted-foreground">{user.email}</td>
                          <td className="px-4 py-4"><span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{user.role === "admin" ? "Admin" : "Agent"}</span></td>
                          <td className="whitespace-nowrap px-4 py-4 text-muted-foreground"><time dateTime={user.createdAt}>{new Date(user.createdAt).toLocaleDateString()}</time></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>}
          </div>
          <nav aria-label="Users pagination" className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">Page {page}{result ? ` of ${Math.max(page, Math.ceil(result.total / result.pageSize), 1)}` : ""}</p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={loading || page === 1} onClick={() => changePage(page - 1)}>Previous</Button>
              <Button variant="outline" disabled={loading || !result || page * result.pageSize >= result.total} onClick={() => changePage(page + 1)}>Next</Button>
            </div>
          </nav>
        </CardContent>
      </Card>
    </main>
  );
}
