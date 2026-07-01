import React, { useState } from "react";
import { LogOut, Settings, User as UserIcon, X } from "lucide-react";
import { api } from "../api/backend";
import type { UserResponse, UserPreferences } from "../api/backend";

interface NavbarProps {
  user: UserResponse | null;
  onLogout: () => void;
  onPreferencesUpdated: (updatedUser: UserResponse) => void;
}

export default function Navbar({ user, onLogout, onPreferencesUpdated }: NavbarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (user?.preferences) {
      try {
        return JSON.parse(user.preferences);
      } catch (e) {
        // Fallback
      }
    }
    return { diet: "None", allergies: "", spicy_level: "Medium" };
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const updated = await api.auth.updatePreferences(preferences);
      onPreferencesUpdated(updated);
      setIsSettingsOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to update preferences");
    } finally {
      setLoading(false);
    }
  };

  return (
    <nav className="sticky top-0 z-40 w-full px-6 py-4 flex items-center justify-between bg-picnic shadow-[0px_4px_0px_0px_var(--border-dark)] mb-8">
      {/* Brand logo sticker style */}
      <div className="flex items-center gap-3 bg-white border-3 border-[var(--border-dark)] px-4 py-2 rounded-2xl shadow-[3px_3px_0px_0px_var(--border-dark)] hover-wobble cursor-default">
        <span className="text-3xl hover-bounce inline-block select-none">🍳</span>
        <div>
          <span className="font-display font-extrabold text-2xl tracking-tight text-[var(--text-dark)] select-none">
            Pai's <span className="text-[var(--strawberry)]">Kitchen</span>
          </span>
          <span className="block text-[10px] text-gray-500 font-extrabold tracking-wider uppercase leading-none mt-0.5 select-none">
            👩‍🍳 Cutest AI Cook
          </span>
        </div>
      </div>

      {/* Actions */}
      {user && (
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl border-3 border-[var(--border-dark)] bg-white text-xs font-extrabold text-[var(--text-dark)] shadow-[2px_2px_0px_0px_var(--border-dark)] select-none">
            <UserIcon className="h-4 w-4 text-[var(--strawberry)]" />
            <span>{user.name}</span>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-xl border-3 border-[var(--border-dark)] bg-[var(--honey-light)] text-[var(--text-dark)] hover:scale-105 active:scale-95 transition-all shadow-[2px_2px_0px_0px_var(--border-dark)] hover-wobble cursor-pointer"
            title="Dietary Settings"
          >
            <Settings className="h-5 w-5" />
          </button>

          <button
            onClick={onLogout}
            className="p-2.5 rounded-xl border-3 border-[var(--border-dark)] bg-[var(--strawberry-light)] text-[var(--strawberry)] hover:scale-105 active:scale-95 transition-all shadow-[2px_2px_0px_0px_var(--border-dark)] hover-wobble flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Log Out</span>
          </button>
        </div>
      )}

      {/* Preferences Modal overlay */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--text-dark)]/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border-4 border-[var(--border-dark)] rounded-3xl p-6 shadow-[8px_8px_0px_0px_var(--border-dark)] animate-float-slow-1">
            <div className="flex items-center justify-between mb-6 border-b-3 border-[var(--border-dark)] pb-4">
              <h3 className="font-display font-extrabold text-2xl text-[var(--text-dark)] flex items-center gap-2">
                <span className="text-2xl">🥗</span>
                Dietary Preferences
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg border-2 border-[var(--border-dark)] hover:bg-gray-100 text-gray-500 hover:text-[var(--text-dark)] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl border-3 border-[var(--border-dark)] bg-[var(--strawberry-light)] text-[var(--text-dark)] text-sm font-bold">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSavePreferences} className="space-y-6">
              <div>
                <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
                  Dietary Restrictions
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["None", "Vegetarian", "Vegan", "Gluten-Free"].map((dietOption) => (
                    <button
                      key={dietOption}
                      type="button"
                      onClick={() => setPreferences({ ...preferences, diet: dietOption })}
                      className={`px-4 py-2.5 text-xs font-bold rounded-xl border-3 transition-all cursor-pointer ${
                        preferences.diet === dietOption
                          ? "bg-[var(--strawberry-light)] border-[var(--border-dark)] text-[var(--text-dark)] shadow-[2px_2px_0px_0px_var(--border-dark)]"
                          : "bg-white border-gray-200 text-gray-500 hover:border-[var(--border-dark)] hover:text-[var(--text-dark)]"
                      }`}
                    >
                      {dietOption}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
                  Allergies (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. peanuts, dairy, shellfish"
                  value={preferences.allergies}
                  onChange={(e) => setPreferences({ ...preferences, allergies: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
                  Spice Tolerance
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Low", "Medium", "High"].map((spice) => (
                    <button
                      key={spice}
                      type="button"
                      onClick={() => setPreferences({ ...preferences, spicy_level: spice })}
                      className={`px-4 py-2.5 text-xs font-bold rounded-xl border-3 transition-all cursor-pointer ${
                        preferences.spicy_level === spice
                          ? "bg-[var(--lavender-light)] border-[var(--border-dark)] text-[var(--text-dark)] shadow-[2px_2px_0px_0px_var(--border-dark)]"
                          : "bg-white border-gray-200 text-gray-500 hover:border-[var(--border-dark)] hover:text-[var(--text-dark)]"
                      }`}
                    >
                      🌶️ {spice}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t-3 border-[var(--border-dark)]">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 btn-bubbly btn-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-bubbly btn-pink cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Choices"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
