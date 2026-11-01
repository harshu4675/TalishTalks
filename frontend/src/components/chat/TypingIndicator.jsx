import React from "react";
const TypingIndicator = ({ name }) => <div className="typing-indicator" role="status"><span className="typing-dots"><i /><i /><i /></span><span>{name} is typing</span></div>;
export default TypingIndicator;
