/**
 * ErrorBoundary - catches render-time failures and shows a recoverable screen.
 */

import { Component } from "react";

import Button from "./Button.jsx";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info?.componentStack);
  }

  handleReset() {
    this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="auth-canvas">
        <div className="auth-card" style={{ maxWidth: 520 }}>
          <div className="auth-card__header">
            <h1 className="auth-card__title">Something went wrong</h1>
            <p className="auth-card__subtitle">
              The interface hit an unexpected error. Reloading usually clears it.
            </p>
          </div>
          <div className="auth-card__form">
            <pre
              style={{
                margin: 0,
                padding: "var(--space-3)",
                background: "var(--surface-sunken)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--text-xs)",
                color: "var(--text-secondary)",
                whiteSpace: "pre-wrap",
                overflowX: "auto",
              }}
            >
              {error.message}
            </pre>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Button onClick={this.handleReset}>Try again</Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Reload the app
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
