import React, { useState } from "react";
import { Plus, Trash2, Calendar, AlertTriangle, ChevronDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { PantryItem } from "../api/backend";

interface PantryInputProps {
  items: PantryItem[];
  onAdd: (name: string, quantity: string, expiry?: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const PANTRY_CATEGORIES = [
  {
    name: "🥦 Vegetables & Herbs",
    color: "var(--mint-light)",
    badgeColor: "bg-emerald-100 text-emerald-800",
    items: ["tomato", "onion", "garlic", "capsicum", "potato", "lemon", "carrot", "ginger", "chili", "mushroom", "spinach", "cucumber", "broccoli", "coriander", "lettuce"]
  },
  {
    name: "🥩 Meat & Protein",
    color: "var(--strawberry-light)",
    badgeColor: "bg-rose-100 text-rose-800",
    items: ["chicken", "beef", "pork", "fish", "shrimp", "bacon", "tofu", "turkey"]
  },
  {
    name: "🥚 Dairy & Eggs",
    color: "var(--honey-light)",
    badgeColor: "bg-amber-100 text-amber-800",
    items: ["eggs", "milk", "cheese", "butter", "yogurt", "cream", "paneer"]
  },
  {
    name: "🍞 Grains & Baking",
    color: "var(--carrot-light)",
    badgeColor: "bg-orange-100 text-orange-800",
    items: ["rice", "bread", "pasta", "flour", "sugar", "noodles", "oats", "yeast"]
  },
  {
    name: "🧂 Condiments & Spices",
    color: "var(--lavender-light)",
    badgeColor: "bg-purple-100 text-purple-800",
    items: ["salt", "pepper", "olive oil", "vegetable oil", "cumin", "turmeric", "chili powder", "soy sauce", "honey", "vinegar", "mustard", "mayonnaise"]
  }
];

export const getIngredientEmoji = (name: string): string => {
  const emojis: Record<string, string> = {
    tomato: "🍅", onion: "🧅", garlic: "🧄", capsicum: "🫑", potato: "🥔", lemon: "🍋",
    carrot: "🥕", ginger: "🫚", chili: "🌶️", mushroom: "🍄", spinach: "🥬", cucumber: "🥒",
    broccoli: "🥦", coriander: "🌿", lettuce: "🥬",
    chicken: "🍗", beef: "🥩", pork: "🥓", fish: "🐟", shrimp: "🍤", bacon: "🥓", tofu: "🫘", turkey: "🦃",
    eggs: "🥚", milk: "🥛", cheese: "🧀", butter: "🧈", yogurt: "🥛", cream: "🍦", paneer: "🧀",
    rice: "🌾", bread: "🍞", pasta: "🍝", flour: "🌾", sugar: "🍬", noodles: "🍜", oats: "🥣", yeast: "🍞",
    salt: "🧂", pepper: "🌶️", "olive oil": "🫒", "vegetable oil": "🛢️", cumin: "🧂", turmeric: "🟡",
    "chili powder": "🌶️", "soy sauce": "🫙", honey: "🍯", vinegar: "🍶", mustard: "🍯", mayonnaise: "🥚"
  };
  return emojis[name.toLowerCase().trim()] || "🥣";
};

export default function PantryInput({ items, onAdd, onDelete }: PantryInputProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiry, setExpiry] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(0); // expand first by default
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    setError("");
    try {
      await onAdd(name.trim().toLowerCase(), quantity || "some", expiry || undefined);
      setName("");
      setQuantity("");
      setExpiry("");
      setShowAdvanced(false);
    } catch (err: any) {
      setError(err.message || "Failed to add ingredient");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleIngredient = async (ingredientName: string) => {
    setError("");
    const normalizedName = ingredientName.toLowerCase().trim();
    const existingItem = items.find(item => item.ingredient.toLowerCase() === normalizedName);
    
    try {
      if (existingItem) {
        // Already in pantry, so click toggles it off (delete)
        await onDelete(existingItem.id);
      } else {
        // Not in pantry, so click toggles it on (add)
        await onAdd(normalizedName, "some");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update ingredient");
    }
  };

  const getExpiryBadge = (expiryDate?: string) => {
    if (!expiryDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);
    
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 border-2 border-[var(--border-dark)] text-red-600">
          <AlertTriangle className="h-3 w-3 shrink-0" /> Expired
        </span>
      );
    } else if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 border-2 border-[var(--border-dark)] text-amber-600 animate-pulse">
          <AlertTriangle className="h-3 w-3 shrink-0" /> Expiring soon
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 border-2 border-[var(--border-dark)] text-emerald-700">
        <Calendar className="h-3 w-3 shrink-0" /> {diffDays} days left
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <div className="kawaii-card p-5 border border-white/5 bg-white">
        <h2 className="font-display font-extrabold text-xl text-[var(--text-dark)] mb-4 flex items-center gap-2 select-none">
          👩‍🍳 Stock Your Pantry
        </h2>

        {error && (
          <div className="p-3 mb-4 rounded-xl border-2 border-[var(--border-dark)] bg-red-100 text-red-700 text-xs font-bold">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Tomato, Milk, Chicken..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 min-w-0 px-4 py-2.5 text-sm"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="btn-bubbly btn-pink py-2.5 px-4 cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>

          {/* Advanced toggle (Quantity and Expiry) */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-[11px] font-extrabold text-gray-500 hover:text-[var(--text-dark)] uppercase tracking-wider transition-colors cursor-pointer"
            >
              🛠️ Add Details (Quantity, Expiry)
              <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t-3 border-dashed border-gray-200"
                >
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Quantity</label>
                    <input
                      type="text"
                      placeholder="e.g. 500g, 4 pieces"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full px-3 py-2 text-xs"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>
      </div>

      {/* Supercook Interactive Category shelves */}
      <div className="kawaii-card p-5 bg-white space-y-4">
        <h3 className="font-display font-extrabold text-lg text-[var(--text-dark)] flex items-center gap-1.5 border-b-3 border-[var(--border-dark)] pb-2 select-none">
          <Sparkles className="h-5 w-5 text-[var(--strawberry)] animate-spin-slow" />
          Click to Stock Pantry
        </h3>

        <motion.div layout className="space-y-3">
          {PANTRY_CATEGORIES.map((category, index) => {
            const isExpanded = expandedCategory === index;
            return (
              <motion.div 
                layout
                key={index} 
                className="border-3 border-[var(--border-dark)] rounded-2xl overflow-hidden shadow-[2px_2px_0px_0px_var(--border-dark)]"
                style={{ backgroundColor: category.color }}
              >
                {/* Category Header toggle */}
                <button
                  type="button"
                  onClick={() => setExpandedCategory(isExpanded ? null : index)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left font-display font-extrabold text-xs uppercase tracking-wide cursor-pointer text-[var(--text-dark)] bg-white/40 hover:bg-white/60 transition-colors focus:outline-none"
                >
                  <span>{category.name}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                </button>

                {/* Category items container */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden bg-white/80"
                    >
                      <div className="p-3.5 flex flex-wrap gap-2">
                        {category.items.map((ing) => {
                          const isSelected = items.some(item => item.ingredient.toLowerCase() === ing.toLowerCase());
                          return (
                            <button
                              key={ing}
                              type="button"
                              onClick={() => handleToggleIngredient(ing)}
                              className={`btn-bubbly py-1.5 px-3 rounded-full text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? "bg-[var(--strawberry-light)] border-[var(--border-dark)] text-[var(--text-dark)] font-bold shadow-[2px_2px_0px_0px_var(--border-dark)] scale-102"
                                  : "bg-white border-gray-200 text-gray-700 hover:border-[var(--border-dark)] hover:text-[var(--text-dark)] shadow-[1px_1px_0px_0px_rgba(0,0,0,0.1)] hover:scale-102"
                              }`}
                            >
                              <span>{getIngredientEmoji(ing)}</span>
                              <span className="capitalize">{ing}</span>
                              {isSelected && <span className="text-[10px] text-[var(--strawberry)] font-black">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Grocery notebook style Ingredients Shelf */}
      <div className="kawaii-card p-5 bg-white space-y-3 relative overflow-hidden">
        {/* Tablecloth grid stripe on bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-picnic opacity-50" />
        
        <div className="flex items-center justify-between border-b-3 border-dashed border-gray-200 pb-2">
          <h3 className="font-display font-extrabold text-lg text-[var(--text-dark)] flex items-center gap-1.5 select-none">
            📝 Shopping Shelf ({items.length})
          </h3>
          {items.length === 0 && (
            <span className="text-xs text-gray-400 font-extrabold italic select-none">Shelf is empty</span>
          )}
        </div>

        <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2.5">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-between border-b-2 border-dashed border-gray-100 pb-2 group"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl select-none">{getIngredientEmoji(item.ingredient)}</span>
                    <span className="font-bold text-sm text-[var(--text-dark)] capitalize">{item.ingredient}</span>
                    <span className="px-2 py-0.5 rounded-lg border-2 border-[var(--border-dark)] bg-gray-50 text-[9px] text-gray-500 font-extrabold leading-none">
                      {item.quantity}
                    </span>
                  </div>
                  {item.expiry_date && (
                    <div className="mt-1">
                      {getExpiryBadge(item.expiry_date.toString())}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onDelete(item.id)}
                  className="p-1.5 rounded-lg border-2 border-transparent hover:border-[var(--border-dark)] text-gray-400 hover:text-[var(--strawberry)] hover:bg-[var(--strawberry-light)] transition-all cursor-pointer"
                  title="Remove Ingredient"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
