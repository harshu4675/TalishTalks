import React from "react";
import { HiOutlineExclamation } from "react-icons/hi";
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error("Application render failed:", error.message, info.componentStack); }
  render() {
    if (this.state.hasError) return <div className="empty-state h-full"><HiOutlineExclamation /><h1>Something went wrong</h1><p>Your account and messages are safe. Reload to try again.</p><button className="button primary" onClick={() => window.location.assign("/")}>Reload Talish Talks</button></div>;
    return this.props.children;
  }
}
export default ErrorBoundary;
