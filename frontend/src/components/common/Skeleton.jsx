import React from "react";

// Reusable skeleton loader for different shapes
const Skeleton = ({ type = "text", count = 1, className = "" }) => {
  const renderSkeleton = () => {
    switch (type) {
      // Text line skeleton
      case "text":
        return <div className={`h-4 skeleton rounded-md ${className}`} />;

      // Circle skeleton (for avatars)
      case "circle":
        return (
          <div className={`w-10 h-10 skeleton rounded-full ${className}`} />
        );

      // Avatar with text skeleton
      case "avatar-text":
        return (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 skeleton rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 skeleton rounded-md w-3/4" />
              <div className="h-3 skeleton rounded-md w-1/2" />
            </div>
          </div>
        );

      // Chat list item skeleton
      case "chat-item":
        return (
          <div className="flex items-center gap-3 p-4">
            <div className="w-12 h-12 skeleton rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <div className="h-4 skeleton rounded-md w-24" />
                <div className="h-3 skeleton rounded-md w-12" />
              </div>
              <div className="h-3 skeleton rounded-md w-3/4" />
            </div>
          </div>
        );

      // Message bubble skeleton
      case "message":
        return (
          <div className="space-y-3 p-4">
            {/* Received message */}
            <div className="flex justify-start">
              <div className="h-10 skeleton rounded-2xl rounded-bl-md w-48" />
            </div>
            {/* Sent message */}
            <div className="flex justify-end">
              <div className="h-10 skeleton rounded-2xl rounded-br-md w-36" />
            </div>
            {/* Received message */}
            <div className="flex justify-start">
              <div className="h-16 skeleton rounded-2xl rounded-bl-md w-56" />
            </div>
          </div>
        );

      // Card skeleton
      case "card":
        return (
          <div className={`card-dark space-y-4 ${className}`}>
            <div className="h-5 skeleton rounded-md w-2/3" />
            <div className="h-4 skeleton rounded-md w-full" />
            <div className="h-4 skeleton rounded-md w-4/5" />
          </div>
        );

      default:
        return <div className={`h-4 skeleton rounded-md ${className}`} />;
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse">
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
};

export default Skeleton;
