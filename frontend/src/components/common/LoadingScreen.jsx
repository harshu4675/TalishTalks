import React, { useEffect, useState } from "react";
import TalishLogo from "../../assets/logo";

const LoadingScreen = ({ onFinished }) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          // Start exit animation
          setTimeout(() => {
            setIsExiting(true);
            // Call onFinished after exit animation
            setTimeout(() => {
              if (onFinished) onFinished();
            }, 500);
          }, 300);
          return 100;
        }
        // Random increment for natural feel
        return prev + Math.random() * 15 + 5;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [onFinished]);

  // Remove the initial HTML loader when this component mounts
  useEffect(() => {
    const initialLoader = document.getElementById("initial-loader");
    if (initialLoader) {
      initialLoader.style.display = "none";
    }
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-dark
        transition-all duration-500 ease-out
        ${isExiting ? "opacity-0 scale-105" : "opacity-100 scale-100"}`}
    >
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-float" />
      <div
        className="absolute bottom-1/3 left-1/3 w-48 h-48 bg-accent-amber/5 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "1s" }}
      />

      {/* Logo with float animation */}
      <div className="animate-float mb-8">
        <TalishLogo size="xl" />
      </div>

      {/* Tagline */}
      <p className="text-gray-soft text-sm font-medium mb-8 animate-fade-in">
        Connect. Chat. Express. 💬
      </p>

      {/* Progress bar */}
      <div className="w-48 h-1 bg-dark-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-accent rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Loading text */}
      <p className="text-gray-soft/60 text-xs mt-4 animate-pulse">
        {progress < 30
          ? "Initializing..."
          : progress < 60
            ? "Connecting..."
            : progress < 90
              ? "Almost ready..."
              : "Welcome! ✨"}
      </p>

      {/* Version */}
      <p className="absolute bottom-6 text-gray-soft/30 text-xs">v1.0.0</p>
    </div>
  );
};

export default LoadingScreen;
