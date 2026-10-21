// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { App } from "./App";
import { signIn, signOut, useSession } from "./lib/auth-client";

vi.mock("./lib/auth-client", () => ({
  useSession: vi.fn(),
  signIn: { email: vi.fn() },
  signOut: vi.fn(),
}));

const refetch = vi.fn();

let state: ReturnType<typeof useSession>;
function authenticate() {
  state = {
    ...state,
    data: {
      user: { id: "1", name: "Sam", email: "sam@example.com" },
      session: {},
    } as NonNullable<typeof state.data>,
  };
}
function Location() {
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="location">{useLocation().pathname}</output>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => navigate(1)}>Forward</button>
    </>
  );
}
function setup(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Location />
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  state = {
    data: null,
    isPending: false,
    isRefetching: false,
    error: null,
    refetch,
  };
  vi.mocked(useSession).mockImplementation(() => state);
});
afterEach(cleanup);

test("anonymous visitors to home are redirected to login", async () => {
  setup();
  expect(await screen.findByLabelText("Email address")).toBeTruthy();
  expect(screen.getByTestId("location").textContent).toBe("/login");
  expect(screen.queryByText(/Welcome back, Sam/)).toBeNull();
});
test("loading never renders protected content or redirects", () => {
  state.isPending = true;
  setup();
  expect(screen.getByText("Loading your workspace...")).toBeTruthy();
  expect(screen.getByTestId("location").textContent).toBe("/");
  expect(screen.queryByRole("navigation")).toBeNull();
});
test("session errors block content and allow retry without redirecting", () => {
  authenticate();
  state.error = { message: "Unavailable", status: 503 } as typeof state.error;
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(refetch).toHaveBeenCalledOnce();
  expect(screen.queryByRole("navigation")).toBeNull();
  expect(screen.getByTestId("location").textContent).toBe("/");
});
test("authenticated visitors can access home and are redirected away from login", async () => {
  authenticate();
  const view = setup("/login");
  expect(await screen.findByText("Welcome back, Sam.")).toBeTruthy();
  expect(screen.getByTestId("location").textContent).toBe("/");
  expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
});
test("losing a session removes home and redirects to login", async () => {
  authenticate();
  const view = setup();
  state = { ...state, data: null };
  view.rerender(
    <MemoryRouter>
      <App />
      <Location />
    </MemoryRouter>,
  );
  expect(await screen.findByLabelText("Email address")).toBeTruthy();
  expect(screen.queryByRole("navigation")).toBeNull();
  expect(screen.getByTestId("location").textContent).toBe("/login");
});
test("failed logout keeps the authenticated page and shows an error", async () => {
  authenticate();
  vi.mocked(signOut).mockResolvedValue({
    error: { message: "Failed", status: 500 },
    data: null,
  } as Awaited<ReturnType<typeof signOut>>);
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Log out" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByText("Welcome back, Sam.")).toBeTruthy();
  expect(screen.getByTestId("location").textContent).toBe("/");
});
test("unknown routes show a not-found page", () => {
  setup("/missing");
  expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
});
test("successful sign-in transitions through session state to home", async () => {
  vi.mocked(signIn.email).mockImplementation(async () => {
    authenticate();
    return { data: {}, error: null } as Awaited<
      ReturnType<typeof signIn.email>
    >;
  });
  const view = setup("/login");
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "sam@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "password123" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Sign in" }).closest("form")!,
  );
  await waitFor(() => expect(signIn.email).toHaveBeenCalledOnce());
  view.rerender(
    <MemoryRouter>
      <App />
      <Location />
    </MemoryRouter>,
  );
  expect(await screen.findByText("Welcome back, Sam.")).toBeTruthy();
  expect(signIn.email).toHaveBeenCalledWith({
    email: "sam@example.com",
    password: "password123",
    rememberMe: true,
  });
});
test("successful logout redirects and back/forward cannot restore protected content", async () => {
  authenticate();
  vi.mocked(signOut).mockImplementation(async () => {
    state = { ...state, data: null };
    return { data: { success: true }, error: null } as Awaited<
      ReturnType<typeof signOut>
    >;
  });
  const view = setup();
  fireEvent.click(screen.getByRole("button", { name: "Log out" }));
  await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
  view.rerender(
    <MemoryRouter>
      <App />
      <Location />
    </MemoryRouter>,
  );
  await screen.findByLabelText("Email address");
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  fireEvent.click(screen.getByRole("button", { name: "Forward" }));
  await waitFor(() =>
    expect(screen.getByTestId("location").textContent).toBe("/login"),
  );
  expect(screen.queryByRole("navigation")).toBeNull();
});

test("login validation blocks empty fields and focuses the email input", async () => {
  setup("/login");
  fireEvent.submit(screen.getByRole("button", { name: "Sign in" }).closest("form")!);
  expect(await screen.findByText("Email address is required.")).toBeTruthy();
  expect(screen.getByText("Password is required.")).toBeTruthy();
  expect(signIn.email).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Email address").getAttribute("aria-invalid")).toBe("true");
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Email address")));
});

test("invalid email does not reach authentication", async () => {
  setup("/login");
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "invalid" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
  fireEvent.submit(screen.getByRole("button", { name: "Sign in" }).closest("form")!);
  expect(await screen.findByText("Enter a valid email address.")).toBeTruthy();
  expect(signIn.email).not.toHaveBeenCalled();
});

test("login trims email, preserves password and honors remember-me while showing auth errors", async () => {
  vi.mocked(signIn.email).mockResolvedValue({ data: null, error: { status: 401, message: "Invalid credentials" } } as Awaited<ReturnType<typeof signIn.email>>);
  setup("/login");
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: " sam@example.com " } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: " password123 " } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Keep me signed in" }));
  fireEvent.submit(screen.getByRole("button", { name: "Sign in" }).closest("form")!);
  expect(await screen.findByText("The email or password is incorrect. Please try again.")).toBeTruthy();
  expect(signIn.email).toHaveBeenCalledWith({ email: "sam@example.com", password: " password123 ", rememberMe: false });
  expect((screen.getByRole("button", { name: "Sign in" }) as HTMLButtonElement).disabled).toBe(false);
});
