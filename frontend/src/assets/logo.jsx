import React from "react";

// 3D-style Talish Talks Logo Component
// Premium, modern, secure, stylish, youth-focused
const TalishLogo = ({ size = "md", showText = true, className = "" }) => {
  // Size configurations
  const sizes = {
    sm: { icon: 28, text: "text-lg", gap: "gap-2" },
    md: { icon: 36, text: "text-xl", gap: "gap-2.5" },
    lg: { icon: 48, text: "text-3xl", gap: "gap-3" },
    xl: { icon: 64, text: "text-4xl", gap: "gap-4" },
  };

  const config = sizes[size] || sizes.md;

  return (
    <div
      className={`flex items-center ${config.gap} logo-3d select-none ${className}`}
    >
      {/* 3D Logo Icon */}
      <div className="logo-inner relative">
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-xl bg-accent/20 blur-lg"
          style={{ width: config.icon, height: config.icon }}
        />

        {/* Main icon container with 3D effect */}
        <div
          className="relative rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow"
          style={{
            width: config.icon,
            height: config.icon,
            transform: "perspective(500px) rotateY(-5deg)",
            boxShadow: `
              0 0 20px rgba(232, 113, 58, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.2),
              0 4px 8px rgba(0, 0, 0, 0.4)
            `,
          }}
        >
          {/* Chat bubble icon */}
          <svg
            width={config.icon * 0.55}
            height={config.icon * 0.55}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Main bubble */}
            <path
              d="M21 11.5C21 16.75 16.75 21 11.5 21C9.8 21 8.2 20.55 6.8 19.75L3 21L4.25 17.2C3.45 15.8 3 14.2 3 12.5C3 7.25 7.25 3 12.5 3C17.75 3 21 6.25 21 11.5Z"
              fill="white"
              fillOpacity="0.9"
            />
            {/* Dot 1 */}
            <circle cx="9" cy="12" r="1.2" fill="#E8713A" />
            {/* Dot 2 */}
            <circle cx="12.5" cy="12" r="1.2" fill="#E8713A" />
            {/* Dot 3 */}
            <circle cx="16" cy="12" r="1.2" fill="#E8713A" />
          </svg>

          {/* 3D shine effect */}
          <div
            className="absolute top-0 left-0 w-full h-1/2 rounded-t-xl"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)",
            }}
          />
        </div>
      </div>

      {/* Text Logo */}
      {showText && (
        <div className="flex flex-col">
          <span
            className={`${config.text} font-display font-bold tracking-tight`}
          >
            <span className="text-white">Talish</span>
            <span className="text-gradient ml-1">Talks</span>
          </span>
        </div>
      )}
    </div>
  );
};

// Small inline logo for use in headers etc.
export const TalishLogoMini = ({ className = "" }) => (
  <TalishLogo size="sm" showText={false} className={className} />
);

// Text-only logo
export const TalishLogoText = ({ className = "" }) => (
  <span className={`font-display font-bold tracking-tight ${className}`}>
    <span className="text-white">Talish</span>
    <span className="text-gradient ml-1">Talks</span>
  </span>
);

export default TalishLogo;
