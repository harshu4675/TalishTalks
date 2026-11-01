import React from "react";
import { Link } from "react-router-dom";
import { HiOutlineChatAlt2 } from "react-icons/hi";
const NotFound = () => <div className="empty-state h-full"><HiOutlineChatAlt2 /><span className="brand-text font-semibold">404</span><h1>Page not found</h1><p>This page may have moved. Head back to your conversations.</p><Link to="/" className="button primary">Back to chats</Link></div>;
export default NotFound;
