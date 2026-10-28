// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { UsersPage } from "./UsersPage";

const { refetch } = vi.hoisted(() => ({ refetch: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ useSession: () => ({ refetch }) }));
const fetchMock = vi.fn();
const user = { id: "1", name: "Sam", email: "sam@example.test", role: "admin", createdAt: "2026-10-01T00:00:00.000Z" };
function response(users = [user], total = 1, page = 1) {
  return { ok: true, status: 200, json: async () => ({ users, total, page, pageSize: 20 }) };
}
function setup() {
  return render(<MemoryRouter initialEntries={["/users"]}><Routes>
    <Route path="/users" element={<UsersPage />} />
    <Route path="/login" element={<p>Login destination</p>} />
    <Route path="/" element={<p>Home destination</p>} />
  </Routes></MemoryRouter>);
}
beforeEach(() => { vi.clearAllMocks(); fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test("shows safe display fields and pagination boundaries", async () => {
  fetchMock.mockResolvedValue(response());
  setup();
  expect(await screen.findByRole("cell", { name: user.email })).toBeTruthy();
  expect(screen.getByRole("cell", { name: "Admin" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Previous" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("button", { name: "Next" }).hasAttribute("disabled")).toBe(true);
});

test("loads pages and disables both controls while pending", async () => {
  let resolve!: (value: ReturnType<typeof response>) => void;
  fetchMock.mockResolvedValueOnce(response([user], 21)).mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  setup();
  await screen.findByRole("table");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("button", { name: "Previous" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("button", { name: "Next" }).hasAttribute("disabled")).toBe(true);
  resolve(response([{ ...user, name: "Second" }], 21, 2));
  expect(await screen.findByRole("cell", { name: "Second" })).toBeTruthy();
  expect(fetchMock.mock.calls[1][0]).toBe("/api/users?page=2");
  expect(screen.getByText("Page 2 of 2")).toBeTruthy();
});

test("shows empty results", async () => {
  fetchMock.mockResolvedValue(response([], 0));
  setup();
  expect(await screen.findByText("No users yet.")).toBeTruthy();
  expect(screen.queryByRole("table")).toBeNull();
});

test("recovers from a network failure with retry", async () => {
  fetchMock.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(response());
  setup();
  fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("table")).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

for (const status of [401, 403]) {
  test(`clears the list and redirects on ${status}`, async () => {
    fetchMock.mockResolvedValueOnce(response([user], 21)).mockResolvedValueOnce({ ok: false, status });
    setup();
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText(status === 401 ? "Login destination" : "Home destination")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(refetch).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
  });
}

test("ignores a response after navigating away and aborts its request", async () => {
  let resolve!: (value: ReturnType<typeof response>) => void;
  fetchMock.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const view = setup();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
  view.unmount();
  expect(signal.aborted).toBe(true);
  resolve(response());
});
