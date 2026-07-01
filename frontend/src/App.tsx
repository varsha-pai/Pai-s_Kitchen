import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { api } from "./api/backend";
import type { UserResponse } from "./api/backend";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Navbar from "./components/Navbar";

export default function App() {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Authenticate user on mount if token exists
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("pai_kitchen_token");
      if (token) {
        try {
          const userData = await api.auth.me();
          setUser(userData);
        } catch (err) {
          console.error("Token validation failed, logging out...", err);
          api.auth.logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleAuthSuccess = (userData: UserResponse) => {
    setUser(userData);
  };

  const handleLogout = () => {
    api.auth.logout();
    setUser(null);
  };

  const handlePreferencesUpdated = (updatedUser: UserResponse) => {
    setUser(updatedUser);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-[var(--bg-cream)]">
        <div className="relative">
          <span className="text-6xl animate-bounce inline-block">🍳</span>
        </div>
        <span className="text-sm text-[var(--text-dark)] font-bold tracking-widest animate-pulse uppercase font-display">
          Opening Pai's Kitchen...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-[var(--text-dark)] flex flex-col relative overflow-x-hidden pb-12">
      <div className="relative z-10 flex flex-col min-h-screen">
        {user ? (
          <>
            <Navbar 
              user={user} 
              onLogout={handleLogout} 
              onPreferencesUpdated={handlePreferencesUpdated} 
            />
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 z-10">
              <Home />
            </main>
          </>
        ) : (
          <Auth onAuthSuccess={handleAuthSuccess} />
        )}
      </div>
    </div>
  );
}
