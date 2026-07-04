import os
import json
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file relative to this file
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=env_path)

import google.generativeai as genai

logger = logging.getLogger(__name__)

# Load API key and configure Gemini API
API_KEY = os.getenv("GEMINI_API_KEY", "")
if API_KEY:
    genai.configure(api_key=API_KEY)
else:
    logger.warning("GEMINI_API_KEY is not set. Pai's Kitchen will run in Mock/Demo Mode for LLM generation.")

class RecipeGenerator:
    @staticmethod
    def _get_model(model_name="gemini-2.5-flash"):
        return genai.GenerativeModel(model_name)

    @classmethod
    def _generate_content_with_fallback(cls, prompt: str, json_mode: bool = True) -> dict:
        config = {"response_mime_type": "application/json"} if json_mode else {}
        
        models_to_try = [
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-flash-latest"
        ]
        
        last_error = None
        for model_name in models_to_try:
            try:
                model = cls._get_model(model_name)
                response = model.generate_content(prompt, generation_config=config)
                return json.loads(response.text) if json_mode else response.text
            except Exception as e:
                last_error = e
                logger.warning(f"Gemini API call failed with model {model_name}: {e}. Trying next fallback...")
                
        logger.error(f"All models failed in generation. Last error: {last_error}")
        raise last_error

    @classmethod
    def generate_creative_recipes(cls, ingredients: list[str], preferences: dict) -> dict:
        """
        Creates exactly 3 creative recipes based on complexity tiers (Simple, Everyday Gourmet, Gourmet)
        using the user's available ingredients and preferences.
        """
        diet = preferences.get("diet", "None")
        allergies = preferences.get("allergies", "None")
        spicy_level = preferences.get("spicy_level", "Medium")

        prompt = f"""
        You are an experimental, Michelin-starred chef.
        You need to invent EXACTLY 3 unique, creative recipes using some or all of the following available ingredients:
        {", ".join(ingredients)}

        User Preferences:
        - Dietary constraints: {diet}
        - Allergies to avoid: {allergies}
        - Desired spiciness: {spicy_level}

        Instructions:
        Invent exactly 3 recipes of different complexity tiers:
        1. "Simple": Easy to prepare, quick (15-20 mins), using basic cooking techniques.
        2. "Everyday Gourmet" (between simple and gourmet): Slightly elevated home cooking, medium complexity, delicious and balanced.
        3. "Gourmet": Complex preparation, sophisticated presentation, Michelin-star level design and textures.

        CRITICAL CONSTRAINTS:
        - You must ONLY use the available ingredients listed above: {", ".join(ingredients)}.
        - DO NOT introduce any new major, non-staple ingredients (such as eggs, egg yolk, meats, cheese, flour, rice, etc.) if they are not in the user's available ingredients list.
        - You may only assume common pantry staples/seasonings (such as salt, sugar, water, black pepper, butter, cooking oil, basic spices).

        Respond ONLY with a JSON object. Do not include markdown code block formatting. Follow this JSON schema exactly:
        {{
            "recipes": [
                {{
                    "name": "Creative Unique Name for the Fusion Dish",
                    "tier": "Simple" | "Everyday Gourmet" | "Gourmet",
                    "origin_inspiration": "Detailed description of cuisines/dishes that inspired this (e.g., 'Italian risotto meets Japanese street food')",
                    "cooking_time": 30, // integer in minutes
                    "flavors": ["Umami", "Tangy", "Sweet"], // array of 2-4 primary flavors
                    "ingredients": [
                        {{"name": "ingredient name", "quantity": "EXACT realistic measurement, e.g., '200g', '2 large', '1 tbsp', '1/2 cup'"}}
                    ],
                    "steps": [
                        "1. Preparation step...",
                        "2. Cooking step..."
                    ],
                    "flavor_description": "A detailed explanation of why these ingredients go together and how the flavors interact.",
                    "nutrition": {{
                        "calories": 450, // integer
                        "protein": "15g",
                        "carbs": "60g",
                        "fat": "12g"
                    }}
                }}
            ]
        }}
        """

        if not API_KEY:
            return cls._mock_creative_recipes(ingredients, diet, spicy_level)

        try:
            return cls._generate_content_with_fallback(prompt, json_mode=True)
        except Exception as e:
            logger.error(f"Error generating creative recipes with Gemini: {e}")
            return cls._mock_creative_recipes(ingredients, diet, spicy_level, is_error=True)

    @classmethod
    def get_substitutions(cls, missing_ingredients: list[str], available_ingredients: list[str] = None) -> dict:
        """
        Retrieves substitutions for missing ingredients, prioritizing items available in the user's pantry.
        """
        available_str = ", ".join(available_ingredients) if available_ingredients else "None"
        prompt = f"""
        Provide kitchen-tested substitutions for the following missing ingredients: {", ".join(missing_ingredients)}.
        
        Available Pantry Ingredients (Prefer these to substitute the missing items if possible):
        {available_str}

        Instructions:
        1. Look at the available pantry ingredients. If any of them can serve as a creative or direct culinary substitute for a missing item (e.g. replacing 'rice' with 'potato' by cubing/grating it, or replacing 'butter' with 'olive oil'), recommend it first!
        2. If none of the available ingredients can work, suggest a standard substitute that is commonly found in average kitchens.
        
        Respond ONLY with a JSON object. Do not include markdown code blocks. Follow this schema exactly:
        {{
            "substitutions": [
                {{
                    "ingredient": "original ingredient name",
                    "substitute": "recommended substitute (prefer from available ingredients if possible)",
                    "reason": "why this works and how to prep it as a substitute (e.g., 'grate the potato to mimic rice texture')"
                }},
                ...
            ]
        }}
        """
        if not API_KEY:
            return cls._mock_substitutions(missing_ingredients, available_ingredients)

        try:
            return cls._generate_content_with_fallback(prompt, json_mode=True)
        except Exception as e:
            logger.error(f"Error generating substitutions: {e}")
            return cls._mock_substitutions(missing_ingredients)

    @classmethod
    def retrieve_world_recipes(cls, ingredients: list[str], preferences: dict) -> dict:
        """
        Retrieves authentic global recipes from the web matching user's ingredients.
        """
        if not API_KEY:
            return None

        diet = preferences.get("diet", "None")
        allergies = preferences.get("allergies", "None")
        spicy_level = preferences.get("spicy_level", "Medium")

        prompt = f"""
        You are a database and search engine for real, existing recipes from around the world.
        Find 5 real recipes that exist on the web and in traditional world cuisines that use the following available ingredients:
        {", ".join(ingredients)}

        User Preferences:
        - Dietary constraints: {diet}
        - Allergies to avoid: {allergies}
        - Desired spiciness: {spicy_level}

        Instructions:
        1. Only return real, authentic dishes created by humans that are well-known or exist in world cuisines (e.g., 'Shakshuka', 'Tomato Egg Fried Rice', 'Garlic Butter Potatoes'). Do not invent new dishes.
        2. Prioritize recipes that can be made using ONLY the available ingredients (ignoring common staples like salt, pepper, oil, sugar, butter, seasonings).
        3. If some recipes require minor missing ingredients, list them in the recipe's ingredients, but they will be marked as missing.
        4. Sort the list of recipes so that those with the fewest missing ingredients are first.
        5. For each recipe, provide the exact authentic ingredients with realistic kitchen measurements.

        Respond ONLY with a JSON object. Do not include markdown code block formatting. Follow this JSON schema exactly:
        {{
            "recipes": [
                {{
                    "name": "Authentic Name of the Recipe",
                    "country": "Country of origin (e.g., 'Italy', 'India')",
                    "cuisine_type": "Cuisine type (e.g., 'Mediterranean', 'South Asian')",
                    "image_url": "A real, active, high-quality image URL of this specific dish from the web (e.g. Unsplash, Wikipedia, major food blogs, or reliable image host CDNs. Must be a valid, directly loadable image URL ending in .jpg, .jpeg, or .png).",
                    "ingredients": [
                        {{"name": "ingredient name", "quantity": "EXACT realistic measurement, e.g., '200g', '2 large', '1 tbsp'"}}
                    ],
                    "steps": [
                        "1. Preparation step...",
                        "2. Cooking step..."
                    ],
                    "time": 30, // cooking time in minutes
                    "match_score": 95.0, // estimated match percentage (0-100) based on how many ingredients user has
                    "missing_ingredients": ["missing ingredient 1", ...] // list of ingredients required but not in available ingredients list (excluding staples)
                }}
            ]
        }}
        """

        try:
            return cls._generate_content_with_fallback(prompt, json_mode=True)
        except Exception as e:
            logger.error(f"Error retrieving web recipes from Gemini: {e}")
            return None

    @classmethod
    def get_expiry_intelligence(cls, expiring_ingredients: list[dict]) -> dict:
        """
        Analyzes ingredients expiring soon and suggests immediate recipes or preservation techniques.
        expiring_ingredients is a list of dicts like: [{"ingredient": "tomato", "days_left": 1}]
        """
        items_str = ", ".join([f"{item['ingredient']} (expires in {item['days_left']} days)" for item in expiring_ingredients])
        prompt = f"""
        I have the following ingredients that are expiring very soon:
        {items_str}

        Suggest recipes to cook today or smart ways to preserve/prep them so they do not go to waste.
        
        Respond ONLY with a JSON object. Follow this schema exactly:
        {{
            "suggestions": [
                {{
                    "title": "Recipe/Preservation Name",
                    "description": "What to make or how to freeze/pickle/dry them.",
                    "used_ingredients": ["ingredient1", "ingredient2"]
                }},
                ...
            ]
        }}
        """
        if not API_KEY:
            return cls._mock_expiry_intelligence(expiring_ingredients)

        try:
            model = cls._get_model()
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Error generating expiry insights: {e}")
            return cls._mock_expiry_intelligence(expiring_ingredients)

    @classmethod
    def generate_recipe_by_name(cls, recipe_name: str, preferences: dict) -> dict:
        """
        Generates a specific recipe card by its name, conforming to user preferences.
        """
        diet = preferences.get("diet", "None")
        allergies = preferences.get("allergies", "None")
        spicy_level = preferences.get("spicy_level", "Medium")

        prompt = f"""
        You are a Michelin-starred chef.
        Create an authentic, detailed recipe card for the dish: '{recipe_name}'.

        User Preferences:
        - Dietary constraints: {diet}
        - Allergies to avoid: {allergies}
        - Desired spiciness: {spicy_level}

        Instructions:
        1. If the recipe violates the dietary constraints or contains allergies, modify the recipe to adapt it (e.g. use egg substitutes, make it vegetarian/vegan-friendly, etc.).
        2. Provide exact ingredients with realistic measurements and quantities.
        3. Provide clear step-by-step preparation and cooking instructions.
        4. Include a detailed description of the flavors and culinary origins.

        Respond ONLY with a JSON object. Do not include markdown code block formatting. Follow this JSON schema exactly:
        {{
            "name": "Recipe Name",
            "country": "Country of origin (e.g., 'Italy', 'India')",
            "cuisine_type": "Cuisine type (e.g., 'Italian', 'Indian')",
            "ingredients": [
                {{"name": "ingredient name", "quantity": "realistic measurement, e.g., '200g', '2 large', '1 tbsp'"}}
            ],
            "steps": [
                "1. Preparation step...",
                "2. Cooking step..."
            ],
            "time": 30, // cooking time in minutes
            "flavor_description": "A detailed description of the flavor profile, taste, and culinary background."
        }}
        """

        if not API_KEY:
            return {
                "name": recipe_name,
                "country": "International",
                "cuisine_type": "Fusion",
                "ingredients": [
                    {"name": "ingredients for " + recipe_name, "quantity": "some"}
                ],
                "steps": [
                    f"1. Prepare all ingredients required for cooking {recipe_name}.",
                    f"2. Simmer and cook {recipe_name} with selected spices.",
                    "3. Garnish and serve warm."
                ],
                "time": 25,
                "flavor_description": f"A cozy mock representation of {recipe_name} adapted for your tastes."
            }

        try:
            return cls._generate_content_with_fallback(prompt, json_mode=True)
        except Exception as e:
            logger.error(f"Error generating recipe by name: {e}")
            raise e

    @classmethod
    def search_web_recipe(cls, recipe_name: str, preferences: dict) -> dict:
        """
        Searches the web/knowledge base for a real recipe matching the specified name.
        """
        diet = preferences.get("diet", "None")
        allergies = preferences.get("allergies", "None")
        spicy_level = preferences.get("spicy_level", "Medium")

        prompt = f"""
        You are a search engine for real, authentic recipes from around the world.
        Search the web and retrieve the exact, authentic recipe for: '{recipe_name}'.

        User Preferences:
        - Dietary constraints: {diet}
        - Allergies to avoid: {allergies}
        - Desired spiciness: {spicy_level}

        Instructions:
        1. Find a real, authentic recipe for '{recipe_name}' that exists on major food blogs or traditional cuisines.
        2. If the authentic recipe contains ingredients violating the user's dietary preferences or allergies, provide suitable modifications, but keep the core recipe authentic.
        3. Retrieve/format the recipe details including cooking time, cuisine country, realistic measurements for ingredients, and step-by-step instructions.

        Respond ONLY with a JSON object. Do not include markdown code block formatting. Follow this JSON schema exactly:
        {{
            "name": "Authentic Recipe Name",
            "country": "Country of origin",
            "cuisine_type": "Cuisine type",
            "ingredients": [
                {{"name": "ingredient name", "quantity": "realistic measurement, e.g., '200g', '1 tbsp'"}}
            ],
            "steps": [
                "1. Preparation step...",
                "2. Cooking step..."
            ],
            "time": 30, // cooking time in minutes
            "flavor_description": "A description of the authentic taste profile and culinary background."
        }}
        """

        if not API_KEY:
            return {
                "name": recipe_name + " (Authentic)",
                "country": "India",
                "cuisine_type": "Traditional",
                "ingredients": [
                    {"name": "main ingredient for " + recipe_name, "quantity": "1 cup"},
                    {"name": "spices", "quantity": "to taste"},
                    {"name": "oil", "quantity": "2 tbsp"}
                ],
                "steps": [
                    f"1. Prepare and clean the ingredients for {recipe_name}.",
                    f"2. Heat oil in a pan, roast seasonings and main ingredients.",
                    f"3. Simmer until fully cooked and serve {recipe_name} hot."
                ],
                "time": 25,
                "flavor_description": f"A traditional and authentic preparation of {recipe_name}."
            }

        try:
            return cls._generate_content_with_fallback(prompt, json_mode=True)
        except Exception as e:
            logger.error(f"Error searching web recipe: {e}")
            raise e

    @classmethod
    def analyze_nutrition(cls, recipe_name: str, ingredients_list: list[str]) -> dict:
        """
        Analyzes the nutrition profile of a given list of ingredients and recipe.
        """
        prompt = f"""
        Analyze the nutritional content for the dish '{recipe_name}' made with: {", ".join(ingredients_list)}.
        Provide realistic estimates for a single portion.
        
        Respond ONLY with a JSON object. Follow this schema:
        {{
            "nutrition": {{
                "calories": 450, // integer
                "protein": "15g",
                "carbs": "55g",
                "fat": "18g"
            }}
        }}
        """
        if not API_KEY:
            return {
                "nutrition": {
                    "calories": 380,
                    "protein": "12g",
                    "carbs": "45g",
                    "fat": "14g"
                }
            }

        try:
            return cls._generate_content_with_fallback(prompt, json_mode=True)
        except Exception as e:
            logger.error(f"Error analyzing nutrition: {e}")
            return {
                "nutrition": {
                    "calories": 400,
                    "protein": "14g",
                    "carbs": "50g",
                    "fat": "16g"
                }
            }

    # --- MOCK FALLBACKS ---

    @staticmethod
    def _mock_creative_recipes(ingredients: list[str], diet: str, spicy: str, is_error: bool = False) -> dict:
        title_prefix = ""
        main_ing = ingredients[0].capitalize() if ingredients else "Pantry"
        sec_ing = ingredients[1] if len(ingredients) > 1 else "spices"
        
        return {
            "recipes": [
                {
                    "name": f"{title_prefix}Simple {main_ing} & {sec_ing.capitalize()} Skillet",
                    "tier": "Simple",
                    "origin_inspiration": "A quick and easy home-style stir fry combining your key ingredients into a fast comfort meal.",
                    "cooking_time": 15,
                    "flavors": ["Savoury", "Garlic"],
                    "ingredients": [{"name": ing, "quantity": "1 cup" if ing != "egg" else "2 large"} for ing in ingredients] + [{"name": "butter", "quantity": "1 tbsp"}],
                    "steps": [
                        "1. Chop main ingredients into thin slices.",
                        "2. Sauté in butter on medium heat for 8 minutes until tender.",
                        "3. Season with salt and serve."
                    ],
                    "flavor_description": "A clean, simple flavor profile showcasing the natural taste of ingredients.",
                    "nutrition": {"calories": 250, "protein": "8g", "carbs": "20g", "fat": "10g"}
                },
                {
                    "name": f"{title_prefix}Everyday {main_ing} & {sec_ing.capitalize()} Medley",
                    "tier": "Everyday Gourmet",
                    "origin_inspiration": "An elevated comfort bowl balancing textures and flavor profiles for an easy gourmet home meal.",
                    "cooking_time": 25,
                    "flavors": ["Umami", "Tangy"],
                    "ingredients": [{"name": ing, "quantity": "1 cup" if ing != "egg" else "2 large"} for ing in ingredients] + [{"name": "olive oil", "quantity": "1 tbsp"}, {"name": "soy sauce", "quantity": "1 tsp"}],
                    "steps": [
                        "1. Toss vegetables in olive oil and roast at 200°C for 15 minutes.",
                        "2. In a skillet, pan-fry eggs or other proteins.",
                        "3. Combine and drizzle with soy sauce."
                    ],
                    "flavor_description": "Perfect balance of roasted earthiness and savory umami seasoning.",
                    "nutrition": {"calories": 380, "protein": "12g", "carbs": "35g", "fat": "14g"}
                },
                {
                    "name": f"{title_prefix}Michelin-Style {main_ing} & {sec_ing.capitalize()} Deconstruct",
                    "tier": "Gourmet",
                    "origin_inspiration": "A complex, fine-dining exploration of your pantry items using advanced techniques and beautiful plating.",
                    "cooking_time": 45,
                    "flavors": ["Rich", "Smoky", "Acidic"],
                    "ingredients": [{"name": ing, "quantity": "150g" if ing != "egg" else "2 yolk"} for ing in ingredients] + [{"name": "herb oil", "quantity": "1 tsp"}, {"name": "balsamic reduction", "quantity": "1 tsp"}],
                    "steps": [
                        "1. Purée main ingredients into a smooth silk consistency.",
                        "2. Slow-cook yolk in water bath at 64°C for 45 minutes.",
                        "3. Plate the purée as a base, top with yolk, and finish with herb oil and balsamic reduction."
                    ],
                    "flavor_description": "A rich, sophisticated interplay of slow-cooked textures and bright acidic reductions.",
                    "nutrition": {"calories": 520, "protein": "18g", "carbs": "40g", "fat": "22g"}
                }
            ]
        }

    @staticmethod
    def _mock_substitutions(missing_ingredients: list[str], available_ingredients: list[str] = None) -> dict:
        subs = []
        pantry = [a.lower().strip() for a in available_ingredients] if available_ingredients else []
        
        common_subs = {
            "butter": ("olive oil or margarine", "similar fat content and cooking properties"),
            "milk": ("almond milk, soy milk, or water", "replaces liquid volume and moisture"),
            "egg": ("applesauce, mashed banana, or flaxseed meal", "acts as a binder in baking, or use tofu for savory dishes"),
            "rice": ("quinoa, riced cauliflower, or couscous", "similar grain-like texture"),
            "tomato": ("tamarind paste, bell pepper, or tomato paste + water", "provides acidity or rich tomato profile"),
            "onion": ("shallots, leeks, or green onions", "similar allium aromatic flavor"),
            "garlic": ("garlic powder, shallots, or asafoetida", "mimics the sulfurous warmth of garlic"),
            "soy sauce": ("tamari, coconut aminos, or salt + Worcestershire sauce", "provides savory, salty umami profile")
        }
        
        for ing in missing_ingredients:
            ing_l = ing.lower().strip()
            
            # Simple pantry matching logic in mock mode
            if ing_l == "rice" and "potato" in pantry:
                sub = "potato (from your pantry)"
                reason = "grate the potato to mimic rice grains, or chop small and pan fry for a similar carb base"
            elif ing_l == "butter" and "olive oil" in pantry:
                sub = "olive oil (from your pantry)"
                reason = "excellent liquid fat replacement for pan searing or cooking"
            elif ing_l == "tomato" and "capsicum" in pantry:
                sub = "capsicum (from your pantry)"
                reason = "adds fresh crisp crunch and bright color, adjusting flavor profile"
            elif ing_l in common_subs:
                sub, reason = common_subs[ing_l]
            else:
                sub, reason = "vegetable broth or water", "provides moisture and base flavor"
                
            subs.append({
                "ingredient": ing,
                "substitute": sub,
                "reason": reason
            })
        return {"substitutions": subs}

    @staticmethod
    def _mock_expiry_intelligence(expiring_ingredients: list[dict]) -> dict:
        suggestions = []
        for item in expiring_ingredients:
            ing = item["ingredient"].capitalize()
            days = item["days_left"]
            suggestions.append({
                "title": f"Quick {ing} Stir-Fry or Soup",
                "description": f"Expiring in {days} days. Sauté the {ing} in oil, garlic, and soy sauce, or simmer it in broth to make a comforting soup.",
                "used_ingredients": [item["ingredient"]]
            })
        if not suggestions:
            suggestions.append({
                "title": "Chef's Kitchen Hash",
                "description": "Chop up any leftover vegetables and sauté them with oil, salt, and pepper for an easy breakfast hash.",
                "used_ingredients": []
            })
        return {"suggestions": suggestions}
