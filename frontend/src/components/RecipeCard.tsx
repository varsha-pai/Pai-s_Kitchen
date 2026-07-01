import React, { useState } from "react";
import { Clock, ShieldAlert, Heart, ChevronDown, ChevronUp, AlertCircle, Info, Loader2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api/backend";
import type { RecipeItem, AIRecipeResponse, Substitution } from "../api/backend";
import { getIngredientEmoji } from "./PantryInput";

interface RecipeCardProps {
  recipe: RecipeItem | AIRecipeResponse;
  mode: "world" | "lab";
  isSaved?: boolean;
  savedId?: number;
  onSaveToggle?: () => void;
  onDeleteCustom?: (id: number) => void;
}

const getUnsplashKeywordImage = (name: string): string => {
  const n = name.toLowerCase();
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };
  const seed = hashCode(name);

  const keywordMappings = [
    {
      keywords: ["grilled cheese", "sandwich", "toast", "bruschetta", "panini", "bread"],
      urls: [
        "https://images.unsplash.com/photo-1525351484163-7529414344d8",
        "https://images.unsplash.com/photo-1482049016688-2d3e1b311543",
        "https://images.unsplash.com/photo-1539252554453-80ab65ce3586",
        "https://images.unsplash.com/photo-1509440159596-0249088772ff"
      ]
    },
    {
      keywords: ["burger", "slider"],
      urls: [
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
        "https://images.unsplash.com/photo-1550547660-d9450f859349"
      ]
    },
    {
      keywords: ["pizza", "flatbread", "focaccia"],
      urls: [
        "https://images.unsplash.com/photo-1513104890138-7c749659a591",
        "https://images.unsplash.com/photo-1590947132387-155cc02f3212"
      ]
    },
    {
      keywords: ["pasta", "spaghetti", "noodle", "penne", "macaroni", "ramen"],
      urls: [
        "https://images.unsplash.com/photo-1546549032-9571cd6b27df",
        "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8",
        "https://images.unsplash.com/photo-1551183053-bf91a1d81141"
      ]
    },
    {
      keywords: ["salad", "greens", "lettuce", "caesar", "caprese"],
      urls: [
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
        "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe"
      ]
    },
    {
      keywords: ["soup", "stew", "chowder", "broth"],
      urls: [
        "https://images.unsplash.com/photo-1547592165-e1d17fed6005",
        "https://images.unsplash.com/photo-1547592180-85f173990554"
      ]
    },
    {
      keywords: ["rice", "biryani", "pilaf", "pulao", "risotto", "paella", "fried rice"],
      urls: [
        "https://images.unsplash.com/photo-1565557623262-b51c2513a641",
        "https://images.unsplash.com/photo-1541832676-9b763b0239ab",
        "https://images.unsplash.com/photo-1603133872878-684f208fb84b"
      ]
    },
    {
      keywords: ["chicken", "steak", "meat", "beef", "pork", "lamb", "kabab", "kebab", "meatball", "skewers"],
      urls: [
        "https://images.unsplash.com/photo-1544025162-d76694265947",
        "https://images.unsplash.com/photo-1560684352-8497838a2229"
      ]
    },
    {
      keywords: ["egg", "omelette", "scramble", "frittata", "shakshuka"],
      urls: [
        "https://images.unsplash.com/photo-1525351484163-7529414344d8",
        "https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd"
      ]
    },
    {
      keywords: ["taco", "burrito", "quesadilla", "wrap", "fajita"],
      urls: [
        "https://images.unsplash.com/photo-1565299585323-38d6b0865b47"
      ]
    },
    {
      keywords: ["cake", "dessert", "cookie", "pancake", "waffle", "sweet", "pastry"],
      urls: [
        "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445",
        "https://images.unsplash.com/photo-1565958011703-44f9829ba187"
      ]
    },
    {
      keywords: ["potato", "fries", "wedges", "hash", "croquette"],
      urls: [
        "https://images.unsplash.com/photo-1573080496219-bb080dd4f877",
        "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0"
      ]
    },
    {
      keywords: ["curry", "dhal", "dal", "sauté", "stir fry", "masala"],
      urls: [
        "https://images.unsplash.com/photo-1565557623262-b51c2513a641"
      ]
    }
  ];

  for (const mapping of keywordMappings) {
    if (mapping.keywords.some(kw => n.includes(kw))) {
      const idx = seed % mapping.urls.length;
      return `${mapping.urls[idx]}?auto=format&fit=crop&q=80&w=600`;
    }
  }

  const foodImages = [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38",
    "https://images.unsplash.com/photo-1565958011703-44f9829ba187",
    "https://images.unsplash.com/photo-1482049016688-2d3e1b311543"
  ];
  const index = seed % foodImages.length;
  return `${foodImages[index]}?auto=format&fit=crop&q=80&w=600`;
};

export default function RecipeCard({ recipe, mode, isSaved = false, savedId, onSaveToggle, onDeleteCustom }: RecipeCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedState, setSavedState] = useState(isSaved);
  const [subs, setSubs] = useState<Substitution[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [showSubsModal, setShowSubsModal] = useState(false);
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync state with prop updates
  React.useEffect(() => {
    setSavedState(isSaved);
  }, [isSaved]);

  const isLab = mode === "lab";
  const isCreation = (recipe as RecipeItem).user_id !== undefined && (recipe as RecipeItem).user_id !== null;
  const name = recipe.name.replace(/^(Demo:|AI Fallback:)\s*/i, "").trim();
  const displayImageUrl = isLab ? aiImageUrl : getUnsplashKeywordImage(name);
  const cookingTime = isLab ? (recipe as AIRecipeResponse).cooking_time : (recipe as RecipeItem).time;
  const originInfo = isLab 
    ? (recipe as AIRecipeResponse).origin_inspiration 
    : `${(recipe as RecipeItem).country} • ${(recipe as RecipeItem).cuisine_type}`;
  
  const ingredientsRender = recipe.ingredients.map(i => i.quantity ? `${i.quantity} ${i.name}` : i.name);
  const steps = recipe.steps;

  React.useEffect(() => {
    if (!isLab) return;

    const hashCode = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return Math.abs(hash);
    };

    const cleanName = name.replace(/^(Demo:|AI Fallback:)\s*/i, "").trim();
    const stylePrompt = "gourmet Michelin-starred culinary masterpiece, high-end food photography, exquisite plating, fine dining aesthetics, dramatic studio lighting, shallow depth of field, detailed textures, 8k resolution";

    const prompt = `${cleanName}, ${stylePrompt}`;
    const seed = hashCode(cleanName);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=400&nologo=true&seed=${seed}`;

    setGeneratingImage(true);
    
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setAiImageUrl(url);
      setGeneratingImage(false);
    };
    img.onerror = () => {
      setGeneratingImage(false);
    };
  }, [name, isLab]);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    try {
      if (savedState && savedId) {
        await api.recipes.deleteSaved(savedId);
        setSavedState(false);
        if (onSaveToggle) onSaveToggle();
      } else {
        await api.recipes.save(name, recipe, isLab);
        setSavedState(true);
        if (onSaveToggle) onSaveToggle();
      }
    } catch (err) {
      console.error("Failed to toggle recipe save state", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this recipe from your creations?")) return;
    setDeleting(true);
    try {
      if ((recipe as RecipeItem).id && onDeleteCustom) {
        await onDeleteCustom((recipe as RecipeItem).id!);
      }
    } catch (err) {
      console.error("Failed to delete recipe", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleGetSubstitutions = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const missing = !isLab ? (recipe as RecipeItem).missing_ingredients || [] : [];
    if (missing.length === 0) return;

    setLoadingSubs(true);
    setShowSubsModal(true);
    try {
      const data = await api.recipes.substitute(missing);
      setSubs(data.substitutions);
    } catch (err) {
      console.error("Failed to fetch substitutions", err);
    } finally {
      setLoadingSubs(false);
    }
  };

  return (
    <div className={`w-full rounded-3xl overflow-hidden border-3 border-[var(--border-dark)] transition-all duration-300 bg-white ${
      isLab 
        ? "shadow-[5px_5px_0px_0px_var(--lavender)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_0px_var(--lavender)]" 
        : "shadow-[5px_5px_0px_0px_var(--strawberry)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_0px_var(--strawberry)]"
    }`}>
      {/* Header Image banner */}
      <div className={`relative h-48 w-full overflow-hidden border-b-3 border-[var(--border-dark)] flex flex-col items-center justify-center text-center ${
        displayImageUrl ? "" : "bg-gradient-to-br from-gray-50 to-gray-150"
      }`}>
        {generatingImage && (
          <div className="absolute inset-0 bg-[var(--text-dark)]/75 flex flex-col items-center justify-center z-20 gap-2">
            <span className="text-4xl animate-bounce">🍳</span>
            <span className="text-[10px] text-purple-300 font-extrabold uppercase tracking-wider">AI Chef Art Studio...</span>
          </div>
        )}
        
        {displayImageUrl ? (
          <>
            <img 
              src={displayImageUrl} 
              alt={name} 
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--text-dark)]/50 via-transparent to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 select-none">
            <span className="text-5xl animate-bounce">👩‍🍳</span>
            <span className="font-display font-extrabold text-xs text-gray-700 tracking-wide uppercase">
              AI Kitchen Art Studio
            </span>
          </div>
        )}
        
        {/* Badges Overlay */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none select-none">
          {isCreation && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border-2 border-[var(--border-dark)] shadow-[2px_2px_0px_0px_var(--border-dark)]">
              My Creation
            </span>
          )}
          {isLab ? (
            <>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-[var(--lavender-light)] text-[var(--lavender)] border-2 border-[var(--border-dark)] shadow-[2px_2px_0px_0px_var(--border-dark)]">
                🚀 AI Lab
              </span>
              {(recipe as AIRecipeResponse).tier && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border-2 border-[var(--border-dark)] shadow-[2px_2px_0px_0px_var(--border-dark)] ${
                  (recipe as AIRecipeResponse).tier === "Simple" 
                    ? "bg-emerald-100 text-emerald-800" 
                    : (recipe as AIRecipeResponse).tier === "Gourmet"
                      ? "bg-rose-100 text-rose-800 animate-pulse"
                      : "bg-blue-100 text-blue-800"
                }`}>
                  {(recipe as AIRecipeResponse).tier}
                </span>
              )}
            </>
          ) : (recipe as RecipeItem).match_score !== undefined ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[var(--strawberry-light)] text-[var(--strawberry)] border-2 border-[var(--border-dark)] shadow-[2px_2px_0px_0px_var(--border-dark)] animate-bounce">
              🍳 {(recipe as RecipeItem).match_score}% Match
            </span>
          ) : null}
        </div>

        {/* Action buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          {isCreation && onDeleteCustom && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 rounded-full border-2 border-[var(--border-dark)] bg-[var(--strawberry-light)] text-[var(--strawberry)] hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center shadow-[2px_2px_0px_0px_var(--border-dark)]"
              title="Delete Creation"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin text-[var(--strawberry)]" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-2 rounded-full border-2 border-[var(--border-dark)] bg-white hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center shadow-[2px_2px_0px_0px_var(--border-dark)]"
            title={savedState ? "Remove from Cookbook" : "Save to Cookbook"}
          >
            <Heart className={`h-4 w-4 transition-colors ${savedState ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
          </button>
        </div>
      </div>

      {/* Main Info */}
      <div className="p-5 space-y-4">
        <div>
          <h3 className="font-display font-extrabold text-xl text-[var(--text-dark)] tracking-tight leading-tight select-none">
            {name}
          </h3>
          <p className="text-xs text-gray-500 font-extrabold mt-1 select-none">
            {isLab ? "🔬 Inspired by: " : "🍽️ "}{originInfo}
          </p>
        </div>

        {/* Time and flavor profiles */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 font-extrabold border-b-3 border-dashed border-gray-200 pb-3">
          <div className="flex items-center gap-1.5 select-none">
            <Clock className="h-4 w-4 text-[var(--strawberry)]" />
            <span>{cookingTime} mins</span>
          </div>

          {isLab && (recipe as AIRecipeResponse).flavors && (
            <div className="flex gap-1.5 select-none">
              {(recipe as AIRecipeResponse).flavors.map(flavor => (
                <span 
                  key={flavor} 
                  className="px-2 py-0.5 rounded-lg border-2 border-[var(--border-dark)] bg-[var(--lavender-light)] text-[var(--lavender)] text-[9px] font-black"
                >
                  {flavor}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Flavour desc for Lab Mode */}
        {isLab && (recipe as AIRecipeResponse).flavor_description && (
          <p className="text-xs font-bold leading-relaxed text-gray-700 italic bg-[var(--lavender-light)] border-2 border-[var(--border-dark)] p-3 rounded-2xl select-none">
            🎨 {(recipe as AIRecipeResponse).flavor_description}
          </p>
        )}

        {/* Missing ingredients for World Mode */}
        {!isLab && !isCreation && (recipe as RecipeItem).missing_ingredients && (recipe as RecipeItem).missing_ingredients!.length > 0 && (
          <div className="p-3.5 rounded-2xl border-3 border-dashed border-[var(--carrot)] bg-[var(--carrot-light)] flex items-center justify-between gap-3 shadow-[2px_2px_0px_0px_var(--border-dark)]">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-[var(--carrot)] shrink-0" />
              <div className="text-left select-none">
                <span className="block text-xs font-black text-[var(--text-dark)] leading-none mb-1">Missing ingredients</span>
                <span className="block text-[10px] text-gray-600 font-extrabold truncate max-w-[130px] sm:max-w-[180px]">
                  {((recipe as RecipeItem).missing_ingredients || []).join(", ")}
                </span>
              </div>
            </div>
            <button
              onClick={handleGetSubstitutions}
              className="btn-bubbly btn-orange py-1.5 px-3 text-[9px] shadow-[2px_2px_0px_0px_var(--border-dark)] cursor-pointer"
            >
              Substitution AI
            </button>
          </div>
        )}

        {/* Expand/Collapse Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full py-2.5 rounded-xl border-3 border-[var(--border-dark)] bg-white hover:bg-gray-50 text-[var(--text-dark)] font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_0px_var(--border-dark)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_var(--border-dark)]"
        >
          {isOpen ? (
            <>
              Hide Recipe Details <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              View Recipe Details <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>

        {/* Expanded Recipe steps and details */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden space-y-4 pt-2"
            >
              {/* Ingredients section */}
              <div className="space-y-2">
                <h4 className="font-display font-extrabold text-xs uppercase tracking-wider text-gray-500 select-none">
                  🥄 Ingredients
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[var(--text-dark)] pl-1">
                  {ingredientsRender.map((ing, index) => {
                    const ingClean = ing.replace(/^\d+(\/\d+)?\s*(g|ml|tbsp|tsp|cup|cups|pieces|piece|can|cans|handful)?\s*/i, "").trim().toLowerCase();
                    return (
                      <li key={index} className="flex items-center gap-2">
                        <span className="text-base select-none">{getIngredientEmoji(ingClean)}</span>
                        <span className="capitalize font-bold text-xs">{ing}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Steps section */}
              <div className="space-y-2">
                <h4 className="font-display font-extrabold text-xs uppercase tracking-wider text-gray-500 select-none">
                  🥣 Preparation Steps
                </h4>
                <ol className="space-y-3 text-sm text-[var(--text-dark)] pl-1">
                  {steps.map((step, index) => (
                    <li key={index} className="flex gap-3 items-start">
                      <span className="h-7 w-7 rounded-full border-2 border-[var(--border-dark)] bg-[var(--honey-light)] flex items-center justify-center text-xs font-black text-[var(--text-dark)] shrink-0 mt-0.5 shadow-[1.5px_1.5px_0px_0px_var(--border-dark)] select-none">
                        {index + 1}
                      </span>
                      <p className="leading-relaxed text-xs font-bold pt-1">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Nutrition breakdown */}
              {isLab && (recipe as AIRecipeResponse).nutrition && (
                <div className="space-y-2 pt-3 border-t-3 border-dashed border-gray-200">
                  <h4 className="font-display font-extrabold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1 select-none">
                    <Info className="h-3.5 w-3.5 text-[var(--lavender)]" /> Nutrition per serving
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-center select-none">
                    <div className="bg-white rounded-xl p-2 border-2 border-[var(--border-dark)] shadow-[2px_2px_0px_0px_var(--border-dark)]">
                      <span className="block text-[8px] text-gray-500 font-extrabold uppercase">Calories</span>
                      <span className="font-black text-xs text-[var(--text-dark)]">{(recipe as AIRecipeResponse).nutrition.calories} kcal</span>
                    </div>
                    <div className="bg-white rounded-xl p-2 border-2 border-[var(--border-dark)] shadow-[2px_2px_0px_0px_var(--border-dark)]">
                      <span className="block text-[8px] text-gray-500 font-extrabold uppercase">Protein</span>
                      <span className="font-black text-xs text-[var(--text-dark)]">{(recipe as AIRecipeResponse).nutrition.protein}</span>
                    </div>
                    <div className="bg-white rounded-xl p-2 border-2 border-[var(--border-dark)] shadow-[2px_2px_0px_0px_var(--border-dark)]">
                      <span className="block text-[8px] text-gray-500 font-extrabold uppercase">Carbs</span>
                      <span className="font-black text-xs text-[var(--text-dark)]">{(recipe as AIRecipeResponse).nutrition.carbs}</span>
                    </div>
                    <div className="bg-white rounded-xl p-2 border-2 border-[var(--border-dark)] shadow-[2px_2px_0px_0px_var(--border-dark)]">
                      <span className="block text-[8px] text-gray-500 font-extrabold uppercase">Fat</span>
                      <span className="font-black text-xs text-[var(--text-dark)]">{(recipe as AIRecipeResponse).nutrition.fat}</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Substitutions Modal overlay */}
      {showSubsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--text-dark)]/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border-4 border-[var(--border-dark)] rounded-3xl p-6 shadow-[8px_8px_0px_0px_var(--border-dark)] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b-3 border-[var(--border-dark)]">
              <h3 className="font-display font-extrabold text-xl text-[var(--text-dark)] flex items-center gap-2 select-none">
                <AlertCircle className="text-[var(--strawberry)] h-5 w-5" />
                AI Substitutes
              </h3>
              <button
                onClick={() => setShowSubsModal(false)}
                className="p-1 rounded-lg border-2 border-[var(--border-dark)] hover:bg-gray-100 text-gray-500 hover:text-[var(--text-dark)] transition-colors cursor-pointer text-xs font-black select-none"
              >
                Close
              </button>
            </div>

            {loadingSubs ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 border-4 border-[var(--strawberry)] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Chef AI is thinking...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {subs.map((sub, idx) => (
                  <div key={idx} className="bg-[var(--honey-light)] border-3 border-[var(--border-dark)] rounded-2xl p-4 space-y-2.5 shadow-[3px_3px_0px_0px_var(--border-dark)]">
                    <div className="flex items-center justify-between border-b-2 border-dashed border-gray-300 pb-1.5 select-none">
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider">Missing Item</span>
                      <span className="text-[9px] text-[var(--strawberry)] font-black uppercase tracking-wider">Substitute</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[var(--text-dark)] capitalize text-sm">{sub.ingredient}</span>
                      <span className="text-[var(--text-dark)] font-black text-xs bg-white border-2 border-[var(--border-dark)] px-2.5 py-0.5 rounded-lg capitalize shadow-[1.5px_1.5px_0px_0px_var(--border-dark)]">
                        {sub.substitute}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 font-bold leading-relaxed mt-2 pt-2 border-t-2 border-dashed border-gray-300 select-none">
                      💡 {sub.reason}
                    </p>
                  </div>
                ))}

                {subs.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-6 font-bold select-none">
                    No substitutions found. Water or broth usually works!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
