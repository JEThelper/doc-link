import { Component, ErrorInfo } from "react";
import { Link } from "react-router-dom";

interface Props {
  children: React.ReactNode;
  /** Optional custom fallback UI. Receives the error and a reset function. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches unhandled render errors in the subtree and shows a recovery UI
 * instead of white-screening the entire app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyComponent />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production you'd send this to an error-reporting service (e.g. Sentry).
    console.error("[ErrorBoundary] Uncaught render error:", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;

    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.reset);
      }

      return (
        <div
          role="alert"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
            gap: "16px",
            fontFamily: "Inter, sans-serif",
            textAlign: "center",
            background: "var(--color-bg, #f8f9fa)",
            color: "var(--color-text-primary, #191c1d)",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ color: "#ba1a1a", flexShrink: 0 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>

          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 15, margin: 0, color: "var(--color-text-secondary, #404850)", maxWidth: 400 }}>
            An unexpected error occurred. Try refreshing the page, or go home
            if the problem persists.
          </p>

          <details
            style={{
              fontSize: 12,
              color: "var(--color-text-muted, #707881)",
              maxWidth: 500,
              textAlign: "left",
              background: "var(--color-surface-raised, #edeeef)",
              padding: "12px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            <summary style={{ fontWeight: 500, marginBottom: 4 }}>Error details</summary>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
              {error.message}
            </pre>
          </details>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              onClick={this.reset}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: "1px solid var(--color-border-subtle, #bfc7d1)",
                background: "transparent",
                color: "var(--color-text-primary, #191c1d)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <Link
              to="/"
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                background: "#0077b6",
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Go home
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
