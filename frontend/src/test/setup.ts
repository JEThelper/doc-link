import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount React trees and reset the JSDOM document between every test.
// Without this, elements rendered in one test leak into the next when
// multiple render() calls accumulate in the same document.
afterEach(() => {
  cleanup();
});
