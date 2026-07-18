import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
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
}));

vi.mock("../auth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      username: "demo",
      email: "demo@example.com",
      display_name: "Demo",
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

// Mock the CollabEditor to avoid network/WS side-effects during unit tests.
vi.mock("../components/CollabEditor", () => ({
  default: () => <div data-testid="collab-editor-mock" />,
}));

describe("AccountPads dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedFetch.mockReset();
  });

  it("shows preview text and opens a pad overlay from a card", async () => {
    vi.mocked(listMyPads).mockResolvedValue([
        {
          id: "pad-1",
          slug: "alpha-pad",
          name: "Alpha",
          visibility: "private",
          is_archived: false,
          pin_protected: false,
          last_opened_at: "2024-01-01T00:00:00Z",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
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

    await act(async () => {
      await Promise.resolve();
    });

    expect(await screen.findByText(/A vivid preview of the pad content/i)).toBeInTheDocument();

    const cardButton = await screen.findByRole("button", { name: /open pad alpha/i });
    fireEvent.click(cardButton);

    expect(await screen.findByRole("button", { name: /open full page/i })).toBeInTheDocument();
  });
});
