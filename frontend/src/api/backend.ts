const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  preferences: string;
}

export interface UserPreferences {
  diet: string; // "None" | "Vegetarian" | "Vegan" | "Gluten-Free"
  allergies: string; // comma separated list
  spicy_level: string; // "Low" | "Medium" | "High"
}

export interface PantryItem {
  id: number;
  ingredient: string;
  quantity: string;
  expiry_date?: string; // YYYY-MM-DD
}

export interface RecipeItem {
  id?: number;
  user_id?: number;
  name: string;
  country: string;
  cuisine_type: string;
  ingredients: { name: string; quantity: string }[];
  steps: string[];
  time: number;
  match_score?: number;
  missing_ingredients?: string[];
}

export interface AIRecipeResponse {
  name: string;
  tier?: string;
  origin_inspiration: string;
  cooking_time: number;
  flavors: string[];
  ingredients: { name: string; quantity: string }[];
  steps: string[];
  flavor_description: string;
  nutrition: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
  };
}

export interface SavedRecipe {
  id: number;
  recipe_name: string;
  recipe_details: string; // JSON string representing RecipeItem or AIRecipeResponse
  is_custom: boolean;
}

export interface Substitution {
  ingredient: string;
  substitute: string;
  reason: string;
}

export interface ExpiryInsight {
  title: string;
  description: string;
  used_ingredients: string[];
}

// Helper to handle fetch requests with authentication
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("pai_kitchen_token");
  
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (response.status === 204) {
    return {} as T;
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.detail || "Something went wrong");
  }
  
  return data as T;
}

export const api = {
  auth: {
    register: async (name: string, email: string, password: string): Promise<UserResponse> => {
      return apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
    },
    login: async (email: string, password: string): Promise<{ access_token: string; token_type: string }> => {
      const data = await apiFetch<{ access_token: string; token_type: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("pai_kitchen_token", data.access_token);
      return data;
    },
    me: async (): Promise<UserResponse> => {
      return apiFetch("/auth/me");
    },
    logout: () => {
      localStorage.removeItem("pai_kitchen_token");
    },
    updatePreferences: async (pref: UserPreferences): Promise<UserResponse> => {
      return apiFetch(`/auth/preferences?preferences=${encodeURIComponent(JSON.stringify(pref))}`, {
        method: "PUT",
      });
    }
  },
  
  pantry: {
    get: async (): Promise<PantryItem[]> => {
      return apiFetch("/pantry");
    },
    add: async (ingredient: string, quantity: string, expiryDate?: string): Promise<PantryItem> => {
      return apiFetch("/pantry", {
        method: "POST",
        body: JSON.stringify({ ingredient, quantity, expiry_date: expiryDate || null }),
      });
    },
    update: async (id: number, quantity?: string, expiryDate?: string): Promise<PantryItem> => {
      return apiFetch(`/pantry/${id}`, {
        method: "PUT",
        body: JSON.stringify({ quantity, expiry_date: expiryDate }),
      });
    },
    delete: async (id: number): Promise<void> => {
      return apiFetch(`/pantry/${id}`, { method: "DELETE" });
    },
    expiryInsights: async (): Promise<{ suggestions: ExpiryInsight[] }> => {
      return apiFetch("/pantry/expiry-insights");
    }
  },
  
  recipes: {
    recommend: async (ingredients: string[], mode: "world" | "lab"): Promise<{ mode: string; recipes?: any[] }> => {
      return apiFetch("/recipes/recommend", {
        method: "POST",
        body: JSON.stringify({ ingredients, mode }),
      });
    },
    substitute: async (missingIngredients: string[]): Promise<{ substitutions: Substitution[] }> => {
      return apiFetch("/recipes/substitute", {
        method: "POST",
        body: JSON.stringify({ missing_ingredients: missingIngredients }),
      });
    },
    nutrition: async (recipeName: string, ingredients: string[]): Promise<{ nutrition: { calories: number; protein: string; carbs: string; fat: string } }> => {
      return apiFetch("/recipes/nutrition", {
        method: "POST",
        body: JSON.stringify({ recipe_name: recipeName, ingredients }),
      });
    },
    getSaved: async (): Promise<SavedRecipe[]> => {
      return apiFetch("/recipes/saved");
    },
    save: async (recipeName: string, recipeDetails: any, isCustom: boolean): Promise<SavedRecipe> => {
      return apiFetch("/recipes/saved", {
        method: "POST",
        body: JSON.stringify({
          recipe_name: recipeName,
          recipe_details: recipeDetails,
          is_custom: isCustom,
        }),
      });
    },
    deleteSaved: async (id: number): Promise<void> => {
      return apiFetch(`/recipes/saved/${id}`, { method: "DELETE" });
    },
    getCustom: async (): Promise<RecipeItem[]> => {
      const data = await apiFetch<any[]>("/recipes/custom");
      return data.map(recipe => ({
        id: recipe.id,
        user_id: recipe.user_id,
        name: recipe.name,
        country: recipe.country,
        cuisine_type: recipe.cuisine_type,
        ingredients: typeof recipe.ingredients === "string" ? JSON.parse(recipe.ingredients) : recipe.ingredients,
        steps: typeof recipe.steps === "string" ? JSON.parse(recipe.steps) : recipe.steps,
        time: recipe.time
      }));
    },
    createCustom: async (recipe: Omit<RecipeItem, "id" | "user_id">, saveToCookbook: boolean): Promise<RecipeItem> => {
      const data = await apiFetch<any>("/recipes/custom", {
        method: "POST",
        body: JSON.stringify({
          ...recipe,
          save_to_cookbook: saveToCookbook
        }),
      });
      return {
        id: data.id,
        user_id: data.user_id,
        name: data.name,
        country: data.country,
        cuisine_type: data.cuisine_type,
        ingredients: typeof data.ingredients === "string" ? JSON.parse(data.ingredients) : data.ingredients,
        steps: typeof data.steps === "string" ? JSON.parse(data.steps) : data.steps,
        time: data.time
      };
    },
    deleteCustom: async (id: number): Promise<void> => {
      return apiFetch(`/recipes/custom/${id}`, { method: "DELETE" });
    }
  }
};
