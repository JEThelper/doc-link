// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AccountPads from "./AccountPads";
import * as api from "../api";

// --- mocks -------------------------------------------------------------------

const authedFetch = vi.fn();

vi.mock("../api", () => ({
  createPad: vi.fn(),
  listMyPads: vi.fn(),
  patchPad: vi.fn(),
  claimPad: vi.fn(),
  listRedirects: vi.fn(),
  killRedirect: vi.fn(),
  deletePad: vi.fn(),
  unlockPad: vi.fn(),
}));

vi.mock("../auth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      username: "demo",
      email: "demo@example.com",
      email_verified: true,
      created_at: "2024-01-01T00:00:00Z",
    },
    ready: true,
    authedFetch,
    logout: vi.fn(),
    getAccessToken: () => null,
    reloadUser: vi.fn(),
  }),
}));

vi.mock("../useTheme", () => ({
  useTheme: () => ({ theme: "light", toggle: vi.fn() }),
}));

vi.mock("../components/CollabEditor", () => ({
  default: () => <div data-testid="collab-editor-mock" />,
}));

// Helper
function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/account/pads"]}>
      <AccountPads />
    </MemoryRouter>
  );
}

const olderDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

const samplePad: api.PadListItem = {
  id: "pad-1",
  slug: "demo-pad",
  name: "Demo",
  visibility: "private",
  is_archived: false,
  pin_protected: false,
  last_opened_at: olderDate,
  created_at: olderDate,
  updated_at: olderDate,
  file_count: 0,
  size_bytes: 0,
};

/** Open the Claim Pad modal and return a `within(dialog)` scoped query helper */
async function openClaimModal() {
  await waitFor(() => {
    expect(screen.getAllByRole("button", { name: /claim pad/i }).length).toBeGreaterThanOrEqual(1);
  }, { timeout: 3000 });
  fireEvent.click(screen.getAllByRole("button", { name: /claim pad/i })[0]);
  const dialog = await screen.findByRole("dialog", { name: /claim a pad/i }, { timeout: 3000 });
  return within(dialog);
}

// -----------------------------------------------------------------------------

describe("AccountPads — claim flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedFetch.mockReset();
    vi.mocked(api.listMyPads).mockResolvedValue([samplePad] as never);
  });

  it("opens the Claim modal when the Claim Pad button is clicked", async () => {
    renderDashboard();
    const d = await openClaimModal();
    expect(d.getByText(/paste url/i)).toBeInTheDocument();
  });

  it("walks through the 3-step claim wizard", async () => {
    renderDashboard();
    const d = await openClaimModal();

    // Step 1 — URL
    expect(d.getByText(/paste url/i)).toBeInTheDocument();
    fireEvent.change(d.getByRole("textbox"), {
      target: { value: "https://myriver.app/my-pad" },
    });
    fireEvent.click(d.getByRole("button", { name: /next/i }));

    // Step 2 — Token
    await waitFor(() => expect(d.getByText(/paste token/i)).toBeInTheDocument());
    fireEvent.change(d.getByRole("textbox"), {
      target: { value: "tok_abc123" },
    });
    fireEvent.click(d.getByRole("button", { name: /next/i }));

    // Step 3 — optional PIN
    await waitFor(() => expect(d.getByText(/pin \(if locked\)/i)).toBeInTheDocument());
    expect(d.getByRole("button", { name: /submit claim/i })).toBeInTheDocument();
  });

  it("calls claimPad with parsed slug and token on submit", async () => {
    vi.mocked(api.claimPad).mockResolvedValue({ kind: "ok", pad: samplePad as unknown as api.Pad });
    vi.mocked(api.listMyPads).mockResolvedValue([samplePad] as never);

    renderDashboard();
    const d = await openClaimModal();

    // Step 1
    fireEvent.change(d.getByRole("textbox"), { target: { value: "https://myriver.app/my-pad" } });
    fireEvent.click(d.getByRole("button", { name: /next/i }));

    // Step 2
    await waitFor(() => expect(d.getByText(/paste token/i)).toBeInTheDocument());
    fireEvent.change(d.getByRole("textbox"), { target: { value: "tok_abc123" } });
    fireEvent.click(d.getByRole("button", { name: /next/i }));

    // Step 3 — submit without PIN
    await waitFor(() => expect(d.getByRole("button", { name: /submit claim/i })).toBeInTheDocument());
    fireEvent.click(d.getByRole("button", { name: /submit claim/i }));

    await waitFor(() =>
      expect(api.claimPad).toHaveBeenCalledWith(
        authedFetch,
        "my-pad",
        "tok_abc123",
        undefined
      )
    );
  });

  it("shows an error in the modal when claim fails", async () => {
    vi.mocked(api.claimPad).mockResolvedValue({
      kind: "error",
      status: 409,
      message: "This pad already has an owner.",
    });

    renderDashboard();
    const d = await openClaimModal();

    fireEvent.change(d.getByRole("textbox"), { target: { value: "https://myriver.app/my-pad" } });
    fireEvent.click(d.getByRole("button", { name: /next/i }));

    await waitFor(() => expect(d.getByText(/paste token/i)).toBeInTheDocument());
    fireEvent.change(d.getByRole("textbox"), { target: { value: "tok_bad" } });
    fireEvent.click(d.getByRole("button", { name: /next/i }));

    await waitFor(() => expect(d.getByRole("button", { name: /submit claim/i })).toBeInTheDocument());
    fireEvent.click(d.getByRole("button", { name: /submit claim/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already has an owner/i);
    // Modal stays open on failure
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes the modal after a successful claim", async () => {
    vi.mocked(api.claimPad).mockResolvedValue({
      kind: "ok",
      pad: samplePad as unknown as api.Pad,
    });

    renderDashboard();
    const d = await openClaimModal();

    fireEvent.change(d.getByRole("textbox"), { target: { value: "https://myriver.app/my-pad" } });
    fireEvent.click(d.getByRole("button", { name: /next/i }));

    await waitFor(() => expect(d.getByText(/paste token/i)).toBeInTheDocument());
    fireEvent.change(d.getByRole("textbox"), { target: { value: "tok_good" } });
    fireEvent.click(d.getByRole("button", { name: /next/i }));

    await waitFor(() => expect(d.getByRole("button", { name: /submit claim/i })).toBeInTheDocument());
    fireEvent.click(d.getByRole("button", { name: /submit claim/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      { timeout: 3000 }
    );
  });
});
