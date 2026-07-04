import { useState, useEffect } from "react";
import { ChefHat, BookOpen, AlertTriangle, Sparkles, Loader2, Play, Globe, Plus, Trash2, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { api } from "../api/backend";
import type { PantryItem, RecipeItem, AIRecipeResponse, SavedRecipe, ExpiryInsight } from "../api/backend";
import PantryInput from "../components/PantryInput";
import ModeSelector from "../components/ModeSelector";
import RecipeCard from "../components/RecipeCard";

export default function Home() {
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [loadingPantry, setLoadingPantry] = useState(true);
  const [mode, setMode] = useState<"world" | "lab">("world");
  
  const [worldRecipes, setWorldRecipes] = useState<RecipeItem[]>([]);
  const [labRecipes, setLabRecipes] = useState<AIRecipeResponse[]>([]);
  const [loadingWorld, setLoadingWorld] = useState(false);
  const [loadingLab, setLoadingLab] = useState(false);
  const [errorRecipes, setErrorRecipes] = useState("");
  
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [activeTab, setActiveTab] = useState<"cook" | "saved" | "search">("cook");
  
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<RecipeItem[]>([]);
  const [loadingGlobalSearch, setLoadingGlobalSearch] = useState(false);
  const [generatingGlobalSearchAI, setGeneratingGlobalSearchAI] = useState(false);
  const [globalSearchError, setGlobalSearchError] = useState("");
  
  const [expiryInsights, setExpiryInsights] = useState<ExpiryInsight[]>([]);

  const [customRecipes, setCustomRecipes] = useState<RecipeItem[]>([]);
  const [subTab, setSubTab] = useState<"saved" | "creations">("saved");
  
  // Custom recipe modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [recipeName, setRecipeName] = useState("");
  const [recipeCountry, setRecipeCountry] = useState("Unknown");
  const [recipeCuisine, setRecipeCuisine] = useState("Fusion");
  const [recipeTime, setRecipeTime] = useState(30);
  const [recipeIngredients, setRecipeIngredients] = useState<{ name: string; quantity: string }[]>([
    { name: "", quantity: "" }
  ]);
  const [recipeSteps, setRecipeSteps] = useState<string[]>([""]);
  const [saveToCookbook, setSaveToCookbook] = useState(true);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const [createCustomError, setCreateCustomError] = useState("");

  // Load initial data
  useEffect(() => {
    fetchPantry();
    fetchSavedRecipes();
    fetchCustomRecipes();
  }, []);

  // Fetch expiry insights whenever pantry changes
  useEffect(() => {
    if (pantry.length > 0) {
      fetchExpiryInsights();
    } else {
      setExpiryInsights([]);
    }
  }, [pantry]);

  const fetchPantry = async (silent = false) => {
    if (!silent) setLoadingPantry(true);
    try {
      const data = await api.pantry.get();
      setPantry(data);
    } catch (err) {
      console.error("Failed to load pantry", err);
    } finally {
      if (!silent) setLoadingPantry(false);
    }
  };

  const fetchSavedRecipes = async () => {
    try {
      const data = await api.recipes.getSaved();
      setSavedRecipes(data);
    } catch (err) {
      console.error("Failed to load saved recipes", err);
    }
  };

  const fetchCustomRecipes = async () => {
    try {
      const data = await api.recipes.getCustom();
      setCustomRecipes(data);
    } catch (err) {
      console.error("Failed to load custom recipes", err);
    }
  };

  const handleGlobalSearch = async () => {
    const q = globalSearchQuery.trim();
    if (!q) return;
    setLoadingGlobalSearch(true);
    setGlobalSearchError("");
    try {
      const data = await api.recipes.search(q);
      setGlobalSearchResults(data);
    } catch (err: any) {
      console.error(err);
      setGlobalSearchError(err.message || "Failed to search recipes");
    } finally {
      setLoadingGlobalSearch(false);
    }
  };

  const handleGlobalSearchAI = async () => {
    const q = globalSearchQuery.trim();
    if (!q) return;
    setGeneratingGlobalSearchAI(true);
    setGlobalSearchError("");
    try {
      const newRecipe = await api.recipes.searchAI(q);
      setGlobalSearchResults(prev => [newRecipe, ...prev]);
      fetchCustomRecipes();
    } catch (err: any) {
      console.error(err);
      setGlobalSearchError(err.message || "Failed to generate recipe using AI");
    } finally {
      setGeneratingGlobalSearchAI(false);
    }
  };

  const handleCreateCustomRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateCustomError("");
    
    // Validation
    const cleanName = recipeName.trim();
    if (!cleanName) {
      setCreateCustomError("Recipe name is required");
      return;
    }
    
    const validIngredients = recipeIngredients
      .map(ing => ({ name: ing.name.trim().toLowerCase(), quantity: ing.quantity.trim() }))
      .filter(ing => ing.name !== "");
      
    if (validIngredients.length === 0) {
      setCreateCustomError("At least one ingredient is required");
      return;
    }
    
    const validSteps = recipeSteps
      .map(step => step.trim())
      .filter(step => step !== "");
      
    if (validSteps.length === 0) {
      setCreateCustomError("At least one cooking step is required");
      return;
    }
    
    setIsSubmittingCustom(true);
    try {
      await api.recipes.createCustom({
        name: cleanName,
        country: recipeCountry.trim() || "Unknown",
        cuisine_type: recipeCuisine.trim() || "Fusion",
        ingredients: validIngredients,
        steps: validSteps,
        time: recipeTime || 30
      }, saveToCookbook);
      
      // Reset form
      setRecipeName("");
      setRecipeCountry("Unknown");
      setRecipeCuisine("Fusion");
      setRecipeTime(30);
      setRecipeIngredients([{ name: "", quantity: "" }]);
      setRecipeSteps([""]);
      setSaveToCookbook(true);
      
      // Close modal & refresh lists
      setIsCreateModalOpen(false);
      await fetchCustomRecipes();
      await fetchSavedRecipes();
    } catch (err: any) {
      setCreateCustomError(err.message || "Failed to create custom recipe");
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const handleDeleteCustomRecipe = async (id: number) => {
    try {
      await api.recipes.deleteCustom(id);
      await fetchCustomRecipes();
      await fetchSavedRecipes();
    } catch (err) {
      console.error("Failed to delete custom recipe", err);
    }
  };

  const fetchExpiryInsights = async () => {
    try {
      const data = await api.pantry.expiryInsights();
      setExpiryInsights(data.suggestions);
    } catch (err) {
      console.error("Failed to get expiry insights", err);
    }
  };

  const handleAddIngredient = async (name: string, quantity: string, expiry?: string) => {
    await api.pantry.add(name, quantity, expiry);
    await fetchPantry(true);
  };

  const handleDeleteIngredient = async (id: number) => {
    await api.pantry.delete(id);
    await fetchPantry(true);
  };

  const handleCookMode = async (targetMode: "world" | "lab") => {
    if (pantry.length === 0) {
      setErrorRecipes("Add some ingredients to your pantry first!");
      return;
    }

    setErrorRecipes("");
    setActiveTab("cook");
    setMode(targetMode); // Automatically toggle tab panel
    const ingredients = pantry.map(item => item.ingredient);

    if (targetMode === "lab") {
      setLoadingLab(true);
      setLabRecipes([]);
      try {
        const data = await api.recipes.recommend(ingredients, "lab");
        if (data.recipes) {
          setLabRecipes(data.recipes);
        }
      } catch (err: any) {
        setErrorRecipes(err.message || "Failed to generate AI recipes. Please try again.");
      } finally {
        setLoadingLab(false);
      }
    } else {
      setLoadingWorld(true);
      setWorldRecipes([]);
      try {
        const data = await api.recipes.recommend(ingredients, "world");
        if (data.recipes) {
          setWorldRecipes(data.recipes);
        }
      } catch (err: any) {
        setErrorRecipes(err.message || "Failed to find recipes. Please try again.");
      } finally {
        setLoadingWorld(false);
      }
    }
  };

  // Helper to parse saved recipe details
  const parseSavedDetails = (detailsStr: string) => {
    try {
      return JSON.parse(detailsStr);
    } catch {
      return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 space-y-8 relative z-10">
      {/* Top Banner Dashboard */}
      <div className="flex flex-col md:flex-row items-center justify-between border-b-3 border-dashed border-gray-200 pb-6 gap-4">
        <div className="text-center md:text-left">
          <h2 className="font-display font-extrabold text-3xl text-[var(--text-dark)] flex items-center justify-center md:justify-start gap-2.5 select-none">
            <span className="text-3xl hover-bounce">👩‍🍳</span>
            Chef's Command Center
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-bold">
            Toggle your pantry ingredients, check expiry, and whip up AI recipes!
          </p>
        </div>

        {/* Tab switcher: Cook vs Search vs Favorites */}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => setActiveTab("cook")}
            className={`btn-bubbly py-2.5 px-4 cursor-pointer ${
              activeTab === "cook"
                ? "btn-pink shadow-[3px_3px_0px_0px_var(--border-dark)] scale-102"
                : "btn-white shadow-[2px_2px_0px_0px_var(--border-dark)]"
            }`}
          >
            <Play className="h-4 w-4 shrink-0" /> Cooking Board
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`btn-bubbly py-2.5 px-4 cursor-pointer ${
              activeTab === "search"
                ? "btn-orange shadow-[3px_3px_0px_0px_var(--border-dark)] scale-102"
                : "btn-white shadow-[2px_2px_0px_0px_var(--border-dark)]"
            }`}
          >
            <Search className="h-4 w-4 shrink-0" /> Search World
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`btn-bubbly py-2.5 px-4 cursor-pointer ${
              activeTab === "saved"
                ? "btn-purple shadow-[3px_3px_0px_0px_var(--border-dark)] scale-102"
                : "btn-white shadow-[2px_2px_0px_0px_var(--border-dark)]"
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" /> Cookbook ({savedRecipes.length})
          </button>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: Pantry management and insights */}
        <div className="lg:col-span-1 space-y-6">
          {loadingPantry ? (
            <div className="kawaii-card p-8 flex items-center justify-center bg-white">
              <Loader2 className="h-6 w-6 text-[var(--strawberry)] animate-spin" />
            </div>
          ) : (
            <PantryInput
              items={pantry}
              onAdd={handleAddIngredient}
              onDelete={handleDeleteIngredient}
            />
          )}

          {/* Expiry Intelligence Alert Box */}
          {expiryInsights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="kawaii-card-pink p-5 relative overflow-hidden"
            >
              {/* Cute alerts sticker design */}
              <h3 className="font-display font-extrabold text-sm text-[var(--strawberry)] uppercase tracking-wider flex items-center gap-2 mb-3 select-none">
                <AlertTriangle className="h-4.5 w-4.5" /> Expiry Intelligence
              </h3>
              <p className="text-xs text-gray-700 font-bold mb-4 leading-relaxed">
                Save these expiring ingredients from going to waste! Try these recipes:
              </p>
              
              <div className="space-y-3">
                {expiryInsights.map((insight, index) => (
                  <div key={index} className="p-3 bg-white border-2 border-[var(--border-dark)] rounded-2xl space-y-1 shadow-[2px_2px_0px_0px_var(--border-dark)]">
                    <span className="block text-xs font-black text-[var(--text-dark)]">{insight.title}</span>
                    <span className="block text-[11px] text-gray-500 font-bold leading-normal">{insight.description}</span>
                    <span className="block text-[9px] text-[var(--strawberry)] font-extrabold uppercase tracking-wider mt-1 leading-none">
                      Uses: {insight.used_ingredients.join(", ")}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Side: Cooking Board and Results */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === "cook" ? (
              <motion.div
                key="cook-board"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Mode Selector and Cook Actions */}
                <div className="kawaii-card p-5 bg-white flex flex-col md:flex-row items-center gap-4 justify-between">
                  <div className="w-full md:w-[360px]">
                    <ModeSelector mode={mode} onChange={setMode} />
                  </div>
                  
                  <div className="w-full md:w-auto flex justify-end min-h-[50px]">
                    <AnimatePresence mode="wait">
                      {mode === "world" ? (
                        <motion.button
                          key="world-btn"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => handleCookMode("world")}
                          disabled={loadingWorld || pantry.length === 0}
                          className="btn-bubbly btn-pink py-3 px-6 cursor-pointer w-full md:w-auto disabled:opacity-50"
                        >
                          {loadingWorld ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-white" />
                              <span>Searching...</span>
                            </>
                          ) : (
                            <>
                              <Globe className="h-4 w-4 text-white" />
                              <span>Search Web Recipes</span>
                            </>
                          )}
                        </motion.button>
                      ) : (
                        <motion.button
                          key="lab-btn"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => handleCookMode("lab")}
                          disabled={loadingLab || pantry.length === 0}
                          className="btn-bubbly btn-purple py-3 px-6 cursor-pointer w-full md:w-auto disabled:opacity-50"
                        >
                          {loadingLab ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-white" />
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 text-white" />
                              <span>Generate AI Recipes</span>
                            </>
                          )}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Error Banner */}
                {errorRecipes && (
                  <div className="p-4 rounded-xl border-3 border-[var(--border-dark)] bg-red-100 text-red-700 text-sm font-bold">
                    ⚠️ {errorRecipes}
                  </div>
                )}

                {/* World Mode View */}
                {mode === "world" && (
                  <div className="space-y-4">
                    {loadingWorld && (
                      <div className="space-y-4">
                        {[1, 2].map(n => (
                          <div key={n} className="kawaii-card w-full h-48 bg-white flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2.5">
                              {/* Loading pot helper animation inside RecipeCard */}
                              <Loader2 className="h-8 w-8 animate-spin text-[var(--strawberry)]" />
                              <span className="text-xs text-gray-500 font-extrabold uppercase tracking-wider">
                                Retrieving web recipes...
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {!loadingWorld && !errorRecipes && worldRecipes.length > 0 && worldRecipes.map(recipe => {
                      const savedItem = savedRecipes.find(sr => sr.recipe_name === recipe.name);
                      return (
                        <RecipeCard
                          key={recipe.name}
                          recipe={recipe}
                          mode="world"
                          isSaved={!!savedItem}
                          savedId={savedItem?.id}
                          onSaveToggle={fetchSavedRecipes}
                        />
                      );
                    })}

                    {!loadingWorld && !errorRecipes && worldRecipes.length === 0 && (
                      <div className="kawaii-card py-16 px-6 text-center bg-white flex flex-col items-center justify-center">
                        <span className="text-6xl hover-bounce mb-4 select-none">🌐</span>
                        <h4 className="font-display font-extrabold text-lg text-[var(--text-dark)]">
                          World Kitchen Board Ready
                        </h4>
                        <p className="text-xs text-gray-500 max-w-sm mt-1.5 font-bold leading-relaxed">
                          Stock ingredients in your pantry shelves, select your search mode above, and click search to scan global recipes!
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Lab Mode View */}
                {mode === "lab" && (
                  <div className="space-y-4">
                    {loadingLab && (
                      <div className="space-y-4">
                        {[1, 2, 3].map(n => (
                          <div key={n} className="kawaii-card-purple w-full h-48 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2.5">
                              <Loader2 className="h-8 w-8 animate-spin text-[var(--lavender)]" />
                              <span className="text-xs text-gray-500 font-extrabold uppercase tracking-wider">
                                AI Chef is concocting recipes...
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!loadingLab && !errorRecipes && labRecipes.length > 0 && labRecipes.map(recipe => {
                      const savedItem = savedRecipes.find(sr => sr.recipe_name === recipe.name);
                      return (
                        <RecipeCard
                          key={recipe.name}
                          recipe={recipe}
                          mode="lab"
                          isSaved={!!savedItem}
                          savedId={savedItem?.id}
                          onSaveToggle={fetchSavedRecipes}
                        />
                      );
                    })}

                    {!loadingLab && !errorRecipes && labRecipes.length === 0 && (
                      <div className="kawaii-card py-16 px-6 text-center bg-white flex flex-col items-center justify-center">
                        <span className="text-6xl hover-bounce mb-4 select-none">🧪</span>
                        <h4 className="font-display font-extrabold text-lg text-[var(--text-dark)]">
                          AI Kitchen Lab Ready
                        </h4>
                        <p className="text-xs text-gray-500 max-w-sm mt-1.5 font-bold leading-relaxed">
                          Click Generate AI Recipes to invent three tiered gourmet recipes: Simple, Everyday Gourmet, and Gourmet!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ) : activeTab === "search" ? (
              <motion.div
                key="search-board"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Search Bar */}
                <div className="kawaii-card p-4 bg-white flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Search any recipe (e.g. Shakshuka, Pasta, Chocolate Cake)..."
                    value={globalSearchQuery}
                    onChange={(e) => setGlobalSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGlobalSearch()}
                    className="flex-1 text-sm"
                  />
                  <button
                    onClick={handleGlobalSearch}
                    disabled={loadingGlobalSearch}
                    className="btn-bubbly btn-orange py-2.5 px-5 cursor-pointer text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {loadingGlobalSearch ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <Search className="h-4 w-4 text-white" />
                    )}
                    <span>Search</span>
                  </button>
                </div>

                {/* Error Banner */}
                {globalSearchError && (
                  <div className="p-4 rounded-xl border-3 border-[var(--border-dark)] bg-red-100 text-red-700 text-sm font-bold">
                    ⚠️ {globalSearchError}
                  </div>
                )}

                {/* Results display */}
                <div className="space-y-4">
                  {loadingGlobalSearch && (
                    <div className="space-y-4">
                      {[1, 2].map(n => (
                        <div key={n} className="kawaii-card w-full h-48 bg-white flex items-center justify-center">
                          <div className="flex flex-col items-center gap-2.5">
                            <Loader2 className="h-8 w-8 animate-spin text-[var(--carrot)]" />
                            <span className="text-xs text-gray-500 font-extrabold uppercase tracking-wider">
                              Searching database...
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {generatingGlobalSearchAI && (
                    <div className="kawaii-card-purple w-full h-48 flex items-center justify-center animate-pulse">
                      <div className="flex flex-col items-center gap-2.5">
                         <Loader2 className="h-8 w-8 animate-spin text-[var(--lavender)]" />
                         <span className="text-xs text-gray-500 font-extrabold uppercase tracking-wider">
                           AI Chef is cooking up the recipe...
                         </span>
                      </div>
                    </div>
                  )}

                  {!loadingGlobalSearch && !generatingGlobalSearchAI && (
                    <>
                      {globalSearchResults.length > 0 ? (
                        globalSearchResults.map(recipe => {
                          const savedItem = savedRecipes.find(sr => sr.recipe_name === recipe.name);
                          return (
                            <RecipeCard
                              key={recipe.id || recipe.name}
                              recipe={recipe}
                              mode="world"
                              isSaved={!!savedItem}
                              savedId={savedItem?.id}
                              onSaveToggle={fetchSavedRecipes}
                              onDeleteCustom={recipe.id ? (id) => {
                                setGlobalSearchResults(prev => prev.filter(r => r.id !== id));
                                fetchCustomRecipes();
                              } : undefined}
                            />
                          );
                        })
                      ) : (
                        <div className="kawaii-card py-16 px-6 text-center bg-white flex flex-col items-center justify-center">
                          {globalSearchQuery.trim() ? (
                            <>
                              <span className="text-6xl hover-bounce mb-4 select-none">🧐</span>
                              <h4 className="font-display font-extrabold text-lg text-[var(--text-dark)]">
                                No recipes found in database
                              </h4>
                              <p className="text-xs text-gray-500 max-w-sm mt-1.5 font-bold leading-relaxed mb-6">
                                We couldn't find "{globalSearchQuery}" in our recipe vault. Let our AI Chef craft a custom recipe card for you!
                              </p>
                              <button
                                onClick={handleGlobalSearchAI}
                                className="btn-bubbly btn-purple py-3 px-6 cursor-pointer"
                              >
                                <Sparkles className="h-4 w-4 text-white" />
                                <span>Generate with AI Chef</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-6xl hover-bounce mb-4 select-none">🌐</span>
                              <h4 className="font-display font-extrabold text-lg text-[var(--text-dark)]">
                                Search World Recipes
                              </h4>
                              <p className="text-xs text-gray-500 max-w-sm mt-1.5 font-bold leading-relaxed">
                                Enter a recipe name or cuisine keywords to search the global repository!
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            ) : (
              // Saved Recipes tab (My Recipe Book / Cookbook)
              <motion.div
                key="saved-recipes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Sub-tab selection sticker labels */}
                <div className="flex border-b-3 border-[var(--border-dark)] pb-2 gap-4">
                  <button
                    onClick={() => setSubTab("saved")}
                    className={`pb-2 text-sm font-extrabold tracking-wide transition-all border-b-4 cursor-pointer ${
                      subTab === "saved"
                        ? "border-[var(--strawberry)] text-[var(--strawberry)]"
                        : "border-transparent text-gray-400 hover:text-[var(--text-dark)]"
                    }`}
                  >
                    Saved Favorites ({savedRecipes.length})
                  </button>
                  <button
                    onClick={() => setSubTab("creations")}
                    className={`pb-2 text-sm font-extrabold tracking-wide transition-all border-b-4 cursor-pointer ${
                      subTab === "creations"
                        ? "border-[var(--lavender)] text-[var(--lavender)]"
                        : "border-transparent text-gray-400 hover:text-[var(--text-dark)]"
                    }`}
                  >
                    My Creations ({customRecipes.length})
                  </button>
                </div>

                {subTab === "saved" ? (
                  // Saved Favorites List
                  <div className="space-y-4">
                    {savedRecipes.length > 0 ? (
                      savedRecipes.map(saved => {
                        const details = parseSavedDetails(saved.recipe_details);
                        if (!details) return null;
                        return (
                          <RecipeCard
                            key={saved.id}
                            recipe={details}
                            mode={saved.is_custom ? "lab" : "world"}
                            isSaved={true}
                            savedId={saved.id}
                            onSaveToggle={fetchSavedRecipes}
                          />
                        );
                      })
                    ) : (
                      <div className="kawaii-card py-16 px-6 text-center bg-white flex flex-col items-center justify-center">
                        <BookOpen className="h-16 w-16 text-gray-400 mb-4" />
                        <h4 className="font-display font-extrabold text-lg text-[var(--text-dark)]">
                          Your Recipe Book is Empty
                        </h4>
                        <p className="text-xs text-gray-500 max-w-sm mt-1.5 font-bold leading-relaxed">
                          Click the Heart icon on any recipe cards to save them here in your cozy cookbook!
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  // My Creations List
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                        Recipes Crafted by You
                      </h3>
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="btn-bubbly btn-purple cursor-pointer py-2.5 px-4 shadow-[2px_2px_0px_0px_var(--border-dark)]"
                      >
                        <Plus className="h-4 w-4" /> Write New Recipe
                      </button>
                    </div>

                    {customRecipes.length > 0 ? (
                      customRecipes.map(recipe => {
                        const savedItem = savedRecipes.find(sr => sr.recipe_name === recipe.name);
                        return (
                          <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            mode="world"
                            isSaved={!!savedItem}
                            savedId={savedItem?.id}
                            onSaveToggle={fetchSavedRecipes}
                            onDeleteCustom={handleDeleteCustomRecipe}
                          />
                        );
                      })
                    ) : (
                      <div className="kawaii-card py-16 px-6 text-center bg-white flex flex-col items-center justify-center">
                        <ChefHat className="h-16 w-16 text-gray-400 mb-4" />
                        <h4 className="font-display font-extrabold text-lg text-[var(--text-dark)]">
                          No Custom Creations Yet
                        </h4>
                        <p className="text-xs text-gray-500 max-w-sm mt-1.5 font-bold leading-relaxed">
                          Write down secret family recipes or kitchen inventions, save them, and search or save them to your cookbook!
                        </p>
                        <button
                          onClick={() => setIsCreateModalOpen(true)}
                          className="mt-5 btn-bubbly btn-purple cursor-pointer shadow-[3px_3px_0px_0px_var(--border-dark)]"
                        >
                          Write Your First Recipe
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Recipe Modal Overlay */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--text-dark)]/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white border-4 border-[var(--border-dark)] rounded-3xl p-6 shadow-[8px_8px_0px_0px_var(--border-dark)] my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b-3 border-[var(--border-dark)]">
              <h3 className="font-display font-extrabold text-2xl text-[var(--text-dark)] flex items-center gap-2 select-none">
                <span>📝</span>
                Write Custom Recipe
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg border-2 border-[var(--border-dark)] hover:bg-gray-100 text-gray-500 hover:text-[var(--text-dark)] transition-colors cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {createCustomError && (
              <div className="p-3 mb-4 rounded-xl border-3 border-[var(--border-dark)] bg-red-100 text-red-700 text-xs font-bold">
                ⚠️ {createCustomError}
              </div>
            )}

            <form onSubmit={handleCreateCustomRecipe} className="space-y-6">
              {/* General details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
                    Recipe Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Grandma's Secret Lasagna"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="w-full text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
                    Cuisine Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Italian, Indian, Fusion"
                    value={recipeCuisine}
                    onChange={(e) => setRecipeCuisine(e.target.value)}
                    className="w-full text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
                    Country of Origin
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Italy, India, Mexico"
                    value={recipeCountry}
                    onChange={(e) => setRecipeCountry(e.target.value)}
                    className="w-full text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
                    Prep & Cooking Time (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={recipeTime}
                    onChange={(e) => setRecipeTime(parseInt(e.target.value) || 0)}
                    className="w-full text-sm"
                  />
                </div>
              </div>

              {/* Ingredients section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b-3 border-dashed border-gray-200 pb-2">
                  <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                    Ingredients List *
                  </label>
                  <button
                    type="button"
                    onClick={() => setRecipeIngredients([...recipeIngredients, { name: "", quantity: "" }])}
                    className="btn-bubbly btn-purple py-1 px-3 text-[10px] cursor-pointer shadow-[2px_2px_0px_0px_var(--border-dark)]"
                  >
                    <Plus className="h-3 w-3" /> Add Row
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {recipeIngredients.map((ing, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Ingredient name (e.g. Tomato)"
                        value={ing.name}
                        onChange={(e) => {
                          const updated = [...recipeIngredients];
                          updated[index].name = e.target.value;
                          setRecipeIngredients(updated);
                        }}
                        className="flex-3 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Qty (e.g. 2 pieces, 200g)"
                        value={ing.quantity}
                        onChange={(e) => {
                          const updated = [...recipeIngredients];
                          updated[index].quantity = e.target.value;
                          setRecipeIngredients(updated);
                        }}
                        className="flex-2 text-xs"
                      />
                      {recipeIngredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index))}
                          className="p-2 border-2 border-[var(--border-dark)] rounded-xl bg-[var(--strawberry-light)] text-[var(--strawberry)] hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-[1px_1px_0px_0px_var(--border-dark)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b-3 border-dashed border-gray-200 pb-2">
                  <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                    Preparation Steps *
                  </label>
                  <button
                    type="button"
                    onClick={() => setRecipeSteps([...recipeSteps, ""])}
                    className="btn-bubbly btn-purple py-1 px-3 text-[10px] cursor-pointer shadow-[2px_2px_0px_0px_var(--border-dark)]"
                  >
                    <Plus className="h-3 w-3" /> Add Step
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {recipeSteps.map((step, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <span className="h-8 w-8 rounded-full border-3 border-[var(--border-dark)] bg-[var(--lavender-light)] flex items-center justify-center text-xs font-extrabold text-[var(--text-dark)] shrink-0 mt-1 shadow-[1px_1px_0px_0px_var(--border-dark)]">
                        {index + 1}
                      </span>
                      <textarea
                        rows={2}
                        placeholder={`Describe step ${index + 1}...`}
                        value={step}
                        onChange={(e) => {
                          const updated = [...recipeSteps];
                          updated[index] = e.target.value;
                          setRecipeSteps(updated);
                        }}
                        className="flex-1 text-xs resize-none"
                      />
                      {recipeSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRecipeSteps(recipeSteps.filter((_, i) => i !== index))}
                          className="p-2 border-2 border-[var(--border-dark)] rounded-xl bg-[var(--strawberry-light)] text-[var(--strawberry)] hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-[1px_1px_0px_0px_var(--border-dark)] mt-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cookbook checkbox */}
              <div className="flex items-center gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="saveToCookbook"
                  checked={saveToCookbook}
                  onChange={(e) => setSaveToCookbook(e.target.checked)}
                  className="cursor-pointer"
                />
                <label htmlFor="saveToCookbook" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                  Also save to My Recipe Book (Favorites Cookbook)
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t-3 border-[var(--border-dark)]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 btn-bubbly btn-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCustom}
                  className="flex-1 btn-bubbly btn-purple cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCustom ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Recipe</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
