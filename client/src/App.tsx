import { Link, Route, Routes } from "react-router";
import { GuestRoute, ProtectedRoute } from "./components/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";

export function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
      </Route>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route
        path="*"
        element={
          <main className="session-screen">
            <h1>Page not found</h1>
            <p>The page you requested does not exist.</p>
            <Link to="/">Go to home</Link>
          </main>
        }
      />
    </Routes>
  );
}
