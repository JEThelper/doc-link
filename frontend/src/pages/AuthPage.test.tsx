// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AuthPage from "./AuthPage";

// --- mocks -------------------------------------------------------------------

const mockLogin  = vi.fn();
const mockSignup = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../auth", () => ({
  useAuth: () => ({
    user: null,
    ready: true,
    login:  mockLogin,
    signup: mockSignup,
    logout: vi.fn(),
    authedFetch: vi.fn(),
    getAccessToken: vi.fn(),
    reloadUser: vi.fn(),
  }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// -----------------------------------------------------------------------------

function renderLogin()  { return render(<MemoryRouter><AuthPage mode="login" /></MemoryRouter>); }
function renderSignup() { return render(<MemoryRouter><AuthPage mode="signup" /></MemoryRouter>); }

describe("AuthPage — login mode", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders email and password fields with a Sign in button", () => {
    renderLogin();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("calls login with email and password on submit", async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith("user@example.com", "secret123"));
  });

  it("shows an error message when login fails", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid credentials."));
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: "bad@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials.");
  });

  it("shows a loading state while submitting", async () => {
    // Never resolves so we can inspect the in-flight state
    mockLogin.mockReturnValue(new Promise(() => {}));
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "…" })).toBeDisabled()
    );
  });

  it("shows a forgot password link", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: /forgot password/i })).toBeInTheDocument();
  });

  it("shows a link to switch to signup", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: /create an account/i })).toBeInTheDocument();
  });
});

describe("AuthPage — signup mode", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders username, email and password fields", () => {
    renderSignup();
    expect(screen.getByPlaceholderText(/yourname/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("calls signup with trimmed lowercase username, email and password", async () => {
    mockSignup.mockResolvedValue(undefined);
    renderSignup();

    fireEvent.change(screen.getByPlaceholderText(/yourname/i), {
      target: { value: "Alice" },
    });
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(mockSignup).toHaveBeenCalledWith("alice@example.com", "password123", "alice")
    );
  });

  it("shows a client-side validation error for an invalid username", async () => {
    renderSignup();

    fireEvent.change(screen.getByPlaceholderText(/yourname/i), {
      target: { value: "a" }, // too short
    });
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: "a@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    // Should show a validation error without calling signup
    await waitFor(() => expect(mockSignup).not.toHaveBeenCalled());
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("blocks reserved usernames", async () => {
    renderSignup();

    fireEvent.change(screen.getByPlaceholderText(/yourname/i), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(mockSignup).not.toHaveBeenCalled());
    expect(screen.getByRole("alert")).toHaveTextContent(/reserved/i);
  });

  it("shows an API error when signup fails", async () => {
    mockSignup.mockRejectedValue(new Error("Email already in use."));
    renderSignup();

    fireEvent.change(screen.getByPlaceholderText(/yourname/i), {
      target: { value: "alice" },
    });
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email already in use.");
  });

  it("shows a link to switch to login", () => {
    renderSignup();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows Google sign-in option", () => {
    renderSignup();
    expect(screen.getByRole("link", { name: /continue with google/i })).toBeInTheDocument();
  });
});
