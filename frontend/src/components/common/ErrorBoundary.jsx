import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("🚨 ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark flex items-center justify-center px-4">
          <div className="max-w-md text-center space-y-6">
            <div className="text-6xl animate-float">💥</div>
            <h1 className="text-3xl font-display font-bold text-gradient">
              Oops! Something broke
            </h1>
            <p className="text-gray-soft">
              We hit an unexpected error. Don't worry, it's not your fault.
              Let's get you back on track!
            </p>
            <div className="bg-dark-50 border border-dark-200/50 rounded-xl p-4 text-left">
              <p className="text-xs text-red-400 font-mono break-all">
                {this.state.error?.message || "Unknown error"}
              </p>
            </div>
            <button onClick={this.handleReset} className="btn-accent">
              Take Me Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
