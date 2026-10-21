import { Button } from "@/components/ui/button";
import { Link, Route, Routes } from "react-router";
import { GuestRoute, ProtectedRoute } from "./components/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { UsersPage } from "./pages/UsersPage";
import { AppLayout } from "./components/AppLayout";

export function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route
        path="*"
        element={
          <main className="mx-auto max-w-[560px] px-7 py-20">
            <h1 className="my-[0.67em] text-[2em] font-bold">Page not found</h1>
            <p className="my-[30px] leading-[1.7] text-muted-foreground">
              The page you requested does not exist.
            </p>
            <Button render={<Link to="/" />}>Go to home</Button>
          </main>
        }
      />
    </Routes>
  );
}
