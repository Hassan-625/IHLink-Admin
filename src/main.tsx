import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { AuthProvider } from "@/context/AuthContext";
import "./index.css";
import { enforceDeploymentSurface } from "@/lib/deploymentSurface";

class StartupErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("IHLink startup/render error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ minHeight: "100vh", padding: "32px", fontFamily: "system-ui, sans-serif", background: "#fff", color: "#071A3D" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 800 }}>IHLink could not start</h1>
          <p style={{ marginTop: "12px", maxWidth: "720px" }}>
            The application encountered a browser-side startup error. This diagnostic is temporary and prevents a silent white screen.
          </p>
          <pre style={{ marginTop: "20px", padding: "16px", overflow: "auto", whiteSpace: "pre-wrap", background: "#f1f5f9", borderRadius: "12px" }}>
            {this.state.error.message}
          </pre>
        </main>
      );
    }
    return this.props.children;
  }
}

enforceDeploymentSurface();
const savedAppearance=localStorage.getItem('ihlink-appearance')||'light';
document.documentElement.dataset.appearance=savedAppearance;
document.documentElement.dataset.density=localStorage.getItem('ihlink-density')||'comfortable';

const root = document.getElementById("root");
if (!root) {
  throw new Error("IHLink root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <StartupErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </StartupErrorBoundary>
  </StrictMode>,
);
