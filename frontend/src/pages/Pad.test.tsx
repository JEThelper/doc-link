// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Pad from "./Pad";
import * as api from "../api";

// --- mocks -------------------------------------------------------------------

vi.mock("../auth", () => ({
  useAuth: () => ({
    user: null,
    ready: true,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    authedFetch: fetch,
    getAccessToken: () => null,
    reloadUser: vi.fn(),
  }),
}));

vi.mock("../useTheme", () => ({
  useTheme: () => ({ theme: "light", toggle: vi.fn() }),
}));

vi.mock("../components/CollabEditor", () => ({
  default: () => <div data-testid="collab-editor" />,
}));

vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    getPad: vi.fn(),
    createPad: vi.fn(),
    generateClaimToken: vi.fn(),
    patchPad: vi.fn(),
    unlockPad: vi.fn(),
    listFiles: vi.fn().mockResolvedValue([]),
  };
});

// Helper — render Pad at a given slug path
function renderPad(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/${slug}`]}>
      <Routes>
        <Route path="/:slug" element={<Pad />} />
      </Routes>
    </MemoryRouter>
  );
}

// A minimal "found" pad object
const basePad: api.Pad = {
  id: "pad-1",
  slug: "test-pad",
  name: "Test Pad",
  owner_id: null,
  visibility: "public_edit",
  is_archived: false,
  content: "Hello world",
  is_anonymous: true,
  last_opened_at: "2024-01-01T00:00:00Z",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  can_edit: true,
  pin_protected: false,
  pin_format: null,
  locked: false,
  canonical_url: null,
};

// -----------------------------------------------------------------------------

describe("Pad page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listFiles).mockResolvedValue([]);
  });

  it("shows a skeleton while loading", () => {
    // Never resolves — stays in loading state
    vi.mocked(api.getPad).mockReturnValue(new Promise(() => {}));
    renderPad("test-pad");
    // EditorSkeleton renders a role=status element
    expect(screen.getByRole("status", { name: /loading document/i })).toBeInTheDocument();
  });

  it("renders the editor when a pad is found", async () => {
    vi.mocked(api.getPad).mockResolvedValue({ kind: "found", pad: basePad });
    renderPad("test-pad");
    expect(await screen.findByTestId("collab-editor")).toBeInTheDocument();
  });

  it("shows forbidden screen when the pad is private", async () => {
    vi.mocked(api.getPad).mockResolvedValue({ kind: "forbidden" });
    renderPad("secret-pad");

    await waitFor(() =>
      expect(screen.getByText(/this pad is private/i)).toBeInTheDocument()
    );
    // Guest sees "sign in" link
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows missing/create screen when the slug is unclaimed but creatable", async () => {
    vi.mocked(api.getPad).mockResolvedValue({ kind: "missing", creatable: true });
    renderPad("brand-new-pad");

    await waitFor(() =>
      expect(screen.getByText(/this pad doesn't exist yet/i)).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
  });

  it("shows invalid screen when the slug is not creatable", async () => {
    vi.mocked(api.getPad).mockResolvedValue({ kind: "missing", creatable: false });
    renderPad("!!bad!!");

    await waitFor(() =>
      expect(screen.getByText(/isn't a valid pad name/i)).toBeInTheDocument()
    );
  });

  it("shows an error screen on unexpected failure", async () => {
    vi.mocked(api.getPad).mockRejectedValue(new Error("Network error"));
    renderPad("some-pad");

    await waitFor(() =>
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    );
    expect(screen.getByRole("link", { name: /go home/i })).toBeInTheDocument();
  });

  it("shows the locked/PIN screen for a PIN-protected pad", async () => {
    vi.mocked(api.getPad).mockResolvedValue({
      kind: "found",
      pad: { ...basePad, locked: true, pin_protected: true, pin_format: "numeric" },
    });
    renderPad("locked-pad");

    await waitFor(() =>
      expect(screen.getByText(/this document is protected/i)).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /unlock document/i })).toBeInTheDocument();
  });

  it("shows unlock error on wrong PIN", async () => {
    vi.mocked(api.getPad).mockResolvedValue({
      kind: "found",
      pad: { ...basePad, locked: true, pin_protected: true, pin_format: "alphanumeric" },
    });
    vi.mocked(api.unlockPad).mockResolvedValue({
      kind: "incorrect",
      message: "Incorrect PIN.",
    });
    renderPad("locked-pad");

    await screen.findByText(/this document is protected/i);

    // The alphanumeric path renders a text input
    const input = screen.getByPlaceholderText(/enter passcode/i);
    fireEvent.change(input, { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /unlock document/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/incorrect pin/i);
  });

  it("shows rate-limit message when too many PIN attempts", async () => {
    vi.mocked(api.getPad).mockResolvedValue({
      kind: "found",
      pad: { ...basePad, locked: true, pin_protected: true, pin_format: "alphanumeric" },
    });
    vi.mocked(api.unlockPad).mockResolvedValue({
      kind: "rate_limited",
      message: "Too many attempts.",
      retryAfter: 120,
    });
    renderPad("locked-pad");

    await screen.findByText(/this document is protected/i);

    const input = screen.getByPlaceholderText(/enter passcode/i);
    fireEvent.change(input, { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /unlock document/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/too many attempts/i);
    // Button should be disabled after lockout
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /unlock document/i })).toBeDisabled()
    );
  });

  it("transitions from locked to editor after correct PIN", async () => {
    vi.mocked(api.getPad).mockResolvedValue({
      kind: "found",
      pad: { ...basePad, locked: true, pin_protected: true, pin_format: "alphanumeric" },
    });
    vi.mocked(api.unlockPad).mockResolvedValue({
      kind: "ok",
      pad: { ...basePad, locked: false },
    });
    renderPad("locked-pad");

    await screen.findByText(/this document is protected/i);

    const input = screen.getByPlaceholderText(/enter passcode/i);
    fireEvent.change(input, { target: { value: "correct" } });
    fireEvent.click(screen.getByRole("button", { name: /unlock document/i }));

    // After unlock the editor should appear
    expect(await screen.findByTestId("collab-editor")).toBeInTheDocument();
  });
});
