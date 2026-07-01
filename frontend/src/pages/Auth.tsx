import React, { useState } from "react";
import { Mail, Lock, User, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../api/backend";
import type { UserResponse } from "../api/backend";

interface AuthProps {
  onAuthSuccess: (user: UserResponse) => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        // Log in
        await api.auth.login(email, password);
        const user = await api.auth.me();
        onAuthSuccess(user);
      } else {
        // Register
        await api.auth.register(name, email, password);
        // Automatically login after register
        await api.auth.login(email, password);
        const user = await api.auth.me();
        onAuthSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 bg-transparent overflow-hidden select-none">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10 space-y-6"
      >
        {/* Branding header */}
        <div className="text-center">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-white border-3 border-[var(--border-dark)] items-center justify-center shadow-[3px_3px_0px_0px_var(--border-dark)] hover-wobble mb-3 text-3xl select-none">
            👩‍🍳
          </div>
          <h1 className="font-display font-extrabold text-4xl text-[var(--text-dark)] tracking-tight leading-none select-none">
            Pai's <span className="text-[var(--strawberry)]">Kitchen</span>
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-bold select-none">
            Whip Up Magic from Your Pantry! 🍲
          </p>
        </div>

        {/* Card box */}
        <div className="kawaii-card p-8 bg-white relative">
          {/* Tablecloth picnic background ribbon */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-picnic rounded-t-[20px] opacity-60" />

          <h2 className="font-display font-extrabold text-2xl text-[var(--text-dark)] tracking-tight mb-1 select-none">
            {isLogin ? "Welcome Back!" : "Create Account!"}
          </h2>
          <p className="text-xs text-gray-500 mb-6 font-bold select-none">
            {isLogin 
              ? "Sign in to access your virtual fridge shelf and cook history." 
              : "Register to set dietary restrictions and start saving custom creations."}
          </p>

          {error && (
            <div className="p-3 mb-4 rounded-xl border-2 border-[var(--border-dark)] bg-red-100 text-red-700 text-xs font-bold select-none">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (Register only) */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider select-none">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 h-4.5 w-4.5 text-[var(--strawberry)]" />
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border-3 border-[var(--border-dark)] text-sm font-bold bg-white text-[var(--text-dark)]"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider select-none">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-4.5 w-4.5 text-[var(--strawberry)]" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border-3 border-[var(--border-dark)] text-sm font-bold bg-white text-[var(--text-dark)]"
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider select-none">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-4.5 w-4.5 text-[var(--strawberry)]" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border-3 border-[var(--border-dark)] text-sm font-bold bg-white text-[var(--text-dark)]"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-bubbly btn-pink py-3.5 mt-4 cursor-pointer shadow-[3px_3px_0px_0px_var(--border-dark)] font-display font-extrabold text-sm"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="h-4.5 w-4.5" />
                  <span>{isLogin ? "Open Fridge Shelf" : "Let's Start Cooking"}</span>
                </div>
              )}
            </button>
          </form>

          {/* Toggle login/register */}
          <div className="text-center mt-6 pt-4 border-t-3 border-dashed border-gray-200">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-xs font-black text-gray-500 hover:text-[var(--strawberry)] transition-colors cursor-pointer select-none"
            >
              {isLogin 
                ? "First time in Pai's Kitchen? Sign Up!" 
                : "Already registered? Sign In here!"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
