// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AccountPads from "./AccountPads";
import { listMyPads } from "../api";

// Ensure tests run with a desktop viewport
window.innerWidth = 1024;

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

/** Pad updated > 7 days ago so it always lands in the "Older" bucket */
const olderDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

describe("AccountPads dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedFetch.mockReset();
  });

  it("renders pad preview text in a card", async () => {
    vi.mocked(listMyPads).mockResolvedValue([
      {
        id: "pad-1",
        slug: "alpha-pad",
        name: "Alpha",
        visibility: "private",
        is_archived: false,
        pin_protected: false,
        last_opened_at: olderDate,
        created_at: olderDate,
        updated_at: olderDate,
        file_count: 0,
        size_bytes: 0,
        preview_text: "A vivid preview of the pad content",
      },
    ] as never);

    render(
      <MemoryRouter initialEntries={["/account/pads"]}>
        <AccountPads />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/A vivid preview of the pad content/i)).toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it("renders the pad name as a heading in the card", async () => {
    vi.mocked(listMyPads).mockResolvedValue([
      {
        id: "pad-1",
        slug: "alpha-pad",
        name: "Alpha",
        visibility: "private",
        is_archived: false,
        pin_protected: false,
        last_opened_at: olderDate,
        created_at: olderDate,
        updated_at: olderDate,
        file_count: 0,
        size_bytes: 0,
        preview_text: "A vivid preview",
      },
    ] as never);

    render(
      <MemoryRouter initialEntries={["/account/pads"]}>
        <AccountPads />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it("shows the Claim Pad button in the toolbar", async () => {
    vi.mocked(listMyPads).mockResolvedValue([] as never);

    render(
      <MemoryRouter initialEntries={["/account/pads"]}>
        <AccountPads />
      </MemoryRouter>
    );

    // Claim Pad button is always in the toolbar regardless of pad list state
    await waitFor(() => {
      const btns = screen.getAllByRole("button", { name: /claim pad/i });
      expect(btns.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 4000 });
  });

  it("shows empty state message when no pads exist", async () => {
    vi.mocked(listMyPads).mockResolvedValue([] as never);

    render(
      <MemoryRouter initialEntries={["/account/pads"]}>
        <AccountPads />
      </MemoryRouter>
    );

    // findByText retries until the element appears or times out
    const el = await screen.findByText("No pads here.", {}, { timeout: 4000 });
    expect(el).toBeInTheDocument();
  });

  it("shows pin-protected badge on locked pads", async () => {
    vi.mocked(listMyPads).mockResolvedValue([
      {
        id: "pad-2",
        slug: "secret-pad",
        name: "Secret",
        visibility: "private",
        is_archived: false,
        pin_protected: true,
        locked: true,
        last_opened_at: olderDate,
        created_at: olderDate,
        updated_at: olderDate,
        file_count: 0,
        size_bytes: 0,
        preview_text: null,
      },
    ] as never);

    render(
      <MemoryRouter initialEntries={["/account/pads"]}>
        <AccountPads />
      </MemoryRouter>
    );

    // PadCard renders "Locked — enter PIN or request access" for locked pads
    await waitFor(() => {
      expect(
        screen.getByText(/Locked — enter PIN or request access/i)
      ).toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it("shows the lock prompt dialog when clicking a locked pad", async () => {
    vi.mocked(listMyPads).mockResolvedValue([
      {
        id: "pad-2",
        slug: "secret-pad",
        name: "Secret",
        visibility: "private",
        is_archived: false,
        pin_protected: true,
        locked: true,
        last_opened_at: olderDate,
        created_at: olderDate,
        updated_at: olderDate,
        file_count: 0,
        size_bytes: 0,
        preview_text: null,
      },
    ] as never);

    render(
      <MemoryRouter initialEntries={["/account/pads"]}>
        <AccountPads />
      </MemoryRouter>
    );

    // Wait for the card to be rendered, then find and click it
    const cards = await screen.findAllByRole("article", {}, { timeout: 4000 });
    const secretCard = cards.find((c) => within(c).queryByText("Secret"));
    expect(secretCard).toBeTruthy();
    fireEvent.click(secretCard!);

    // The LockPrompt dialog should appear with an Unlock button
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /enter pin/i })).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByRole("button", { name: /unlock/i })).toBeInTheDocument();
  });
});
