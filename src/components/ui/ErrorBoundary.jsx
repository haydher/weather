import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
            Something went wrong loading weather data.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
