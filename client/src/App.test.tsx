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
function authenticate(role: "admin" | "agent" = "agent") {
  state = {
    ...state,
    data: {
      user: { id: "1", name: "Sam", email: "sam@example.com", role },
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
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ users: [], page: 1, pageSize: 20, total: 0 }),
  }));
  state = {
    data: null,
    isPending: false,
    isRefetching: false,
    error: null,
    refetch,
  };
  vi.mocked(useSession).mockImplementation(() => state);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

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

test("admins can access the users page", () => {
  authenticate("admin");
  setup("/users");
  expect(screen.getByRole("heading", { name: "Users", level: 1 })).toBeTruthy();
  expect(screen.getByTestId("location").textContent).toBe("/users");
});

test("admins keep the same navbar when navigating from home to users", () => {
  authenticate("admin");
  setup();
  const navbar = screen.getByRole("navigation", { name: "Main navigation" });
  fireEvent.click(screen.getByRole("link", { name: "Users" }));
  expect(screen.getByRole("heading", { name: "Users", level: 1 })).toBeTruthy();
  expect(screen.getByRole("navigation", { name: "Main navigation" })).toBe(navbar);
  expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
});

test("agents do not see the users navbar link", () => {
  authenticate("agent");
  setup();
  expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Users" })).toBeNull();
});

test("failed logout on users shows an error and keeps the page", async () => {
  authenticate("admin");
  vi.mocked(signOut).mockResolvedValue({
    error: { message: "Failed", status: 500 },
    data: null,
  } as Awaited<ReturnType<typeof signOut>>);
  setup("/users");
  fireEvent.click(screen.getByRole("button", { name: "Log out" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Users" })).toBeTruthy();
  expect(screen.getByTestId("location").textContent).toBe("/users");
});

test.each(["agent", undefined] as const)("users with role %s cannot access the users page", async (role) => {
  authenticate();
  if (role === undefined) {
    Reflect.deleteProperty(state.data!.user, "role");
  }
  setup("/users");
  expect(await screen.findByText("Welcome back, Sam.")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Users" })).toBeNull();
  expect(screen.getByTestId("location").textContent).toBe("/");
});

test("anonymous visitors to users are redirected to login", async () => {
  setup("/users");
  expect(await screen.findByLabelText("Email address")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Users" })).toBeNull();
  expect(screen.getByTestId("location").textContent).toBe("/login");
});

test("users page waits for the session before checking admin access", () => {
  authenticate("admin");
  state.isPending = true;
  setup("/users");
  expect(screen.getByText("Loading your workspace...")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Users" })).toBeNull();
  expect(screen.getByTestId("location").textContent).toBe("/users");
});

test("session errors block the users page even for admins", () => {
  authenticate("admin");
  state.error = { message: "Unavailable", status: 503 } as typeof state.error;
  setup("/users");
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Users" })).toBeNull();
});

test("losing the admin role removes access to the users page", async () => {
  authenticate("admin");
  const view = setup("/users");
  authenticate("agent");
  view.rerender(
    <MemoryRouter initialEntries={["/users"]}>
      <App />
      <Location />
    </MemoryRouter>,
  );
  expect(await screen.findByText("Welcome back, Sam.")).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Users" })).toBeNull();
  expect(screen.getByTestId("location").textContent).toBe("/");
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

test.each([
  { failure: new Error("Connection interrupted"), message: "Connection interrupted" },
  { failure: null, message: "Unable to sign in. Please try again." },
])("login recovers from a rejected auth request: $message", async ({ failure, message }) => {
  vi.mocked(signIn.email)
    .mockRejectedValueOnce(failure)
    .mockImplementationOnce(async () => {
      authenticate();
      return { data: {}, error: null } as Awaited<ReturnType<typeof signIn.email>>;
    });
  const view = setup("/login");
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "sam@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText(message)).toBeTruthy();
  expect((screen.getByRole("button", { name: "Sign in" }) as HTMLButtonElement).disabled).toBe(false);
  expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("password123");

  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(signIn.email).toHaveBeenCalledTimes(2));
  view.rerender(<MemoryRouter><App /><Location /></MemoryRouter>);
  expect(await screen.findByText("Welcome back, Sam.")).toBeTruthy();
  expect(screen.queryByText(message)).toBeNull();
});

test("a rejected logout request preserves the session and can be retried", async () => {
  authenticate("admin");
  vi.mocked(signOut)
    .mockRejectedValueOnce(new Error("Connection interrupted"))
    .mockImplementationOnce(async () => {
      state = { ...state, data: null };
      return { data: { success: true }, error: null } as Awaited<ReturnType<typeof signOut>>;
    });
  const view = setup("/users");
  fireEvent.click(screen.getByRole("button", { name: "Log out" }));
  expect(await screen.findByText("Unable to log out. Please try again.")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Users" })).toBeTruthy();
  expect((screen.getByRole("button", { name: "Log out" }) as HTMLButtonElement).disabled).toBe(false);

  fireEvent.click(screen.getByRole("button", { name: "Log out" }));
  await waitFor(() => expect(signOut).toHaveBeenCalledTimes(2));
  view.rerender(<MemoryRouter initialEntries={["/users"]}><App /><Location /></MemoryRouter>);
  expect(await screen.findByLabelText("Email address")).toBeTruthy();
  expect(screen.queryByRole("navigation")).toBeNull();
  expect(screen.queryByText("Unable to log out. Please try again.")).toBeNull();
});
