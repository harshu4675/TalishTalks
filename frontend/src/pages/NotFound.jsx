import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import TalishLogo from "../assets/logo";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-6"
      >
        <div className="animate-float">
          <TalishLogo size="lg" />
        </div>

        <h1 className="text-8xl font-display font-bold text-gradient">404</h1>

        <p className="text-xl text-gray-soft">Oops! This page doesn't exist.</p>

        <p className="text-gray-soft/60 text-sm max-w-md">
          Looks like you wandered off the conversation. Let's get you back to
          where the talks happen! 💬
        </p>

        <Link to="/" className="btn-accent inline-block">
          Back to Talish Talks
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
