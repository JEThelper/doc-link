/**
 * Feature flags backed by Vite environment variables.
 *
 * Set variables in .env.local (dev) or at build time in CI/CD:
 *   VITE_FEATURE_KEEP_UI=true   — enable the Keep-style dashboard UI (default: true)
 *
 * All flags default to the safe/current behaviour when the env var is absent,
 * so an unconfigured deployment works identically to before.
 */
export const featureFlags = {
  /** Enable the Keep-style card UI for the pad dashboard. */
  keepUI: import.meta.env.VITE_FEATURE_KEEP_UI !== "false",
};
