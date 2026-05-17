import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

window.__UC_APP_MOUNTED__ = true;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main
          style={{
            minHeight: "100vh",
            padding: 32,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            background: "#F8F7F4",
            color: "#111827",
          }}
        >
          <h1 style={{ margin: "0 0 12px", fontSize: 24 }}>
            앱을 불러오지 못했습니다
          </h1>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              padding: 16,
              border: "1px solid #E5E7EB",
              borderRadius: 8,
              background: "#fff",
              color: "#B91C1C",
            }}
          >
            {this.state.error.message}
          </pre>
        </main>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
