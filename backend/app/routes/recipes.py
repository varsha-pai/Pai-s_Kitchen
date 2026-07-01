import json
import urllib.request
import urllib.parse
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..database.models import Recipe, SavedRecipe, Pantry
from .auth import get_current_user, User
from ..ai.embeddings import embedding_engine
from ..ai.generator import RecipeGenerator

router = APIRouter(prefix="/recipes", tags=["Recipes"])

# Pydantic Schemas
class RecommendRequest(BaseModel):
    ingredients: List[str]
    mode: str  # "world" or "lab"

class SubstituteRequest(BaseModel):
    missing_ingredients: List[str]

class NutritionRequest(BaseModel):
    recipe_name: str
    ingredients: List[str]

# Wikipedia verified recipe image fetcher
def get_wikipedia_image_url(dish_name: str) -> Optional[str]:
    # 1. Try direct Wikipedia Rest Summary lookup
    clean_name = urllib.parse.quote(dish_name.strip().replace(" ", "_"))
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{clean_name}"
    headers = {
        "User-Agent": "PaiKitchenApp/1.0 (contact: support@paikitchen.local) Python-urllib/3.x"
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=3) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                if "originalimage" in data and "source" in data["originalimage"]:
                    return data["originalimage"]["source"]
                if "thumbnail" in data and "source" in data["thumbnail"]:
                    return data["thumbnail"]["source"]
    except Exception:
        pass

    # 2. Fallback to Wikipedia Opensearch matching best article title
    try:
        search_query = urllib.parse.quote(dish_name.strip())
        search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={search_query}&format=json&utf8=1&srlimit=1"
        req = urllib.request.Request(search_url, headers=headers)
        with urllib.request.urlopen(req, timeout=3) as response:
            if response.status == 200:
                results = json.loads(response.read().decode("utf-8")).get("query", {}).get("search", [])
                if results:
                    best_title = urllib.parse.quote(results[0]["title"].replace(" ", "_"))
                    summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{best_title}"
                    req2 = urllib.request.Request(summary_url, headers=headers)
                    with urllib.request.urlopen(req2, timeout=3) as response2:
                        if response2.status == 200:
                            data2 = json.loads(response2.read().decode("utf-8"))
                            if "originalimage" in data2 and "source" in data2["originalimage"]:
                                return data2["originalimage"]["source"]
                            if "thumbnail" in data2 and "source" in data2["thumbnail"]:
                                return data2["thumbnail"]["source"]
    except Exception:
        pass
    return None

# Helpers for ingredient matching, preference matching, spicy calculations...

class SaveRecipeRequest(BaseModel):
    recipe_name: str
    recipe_details: dict  # Full JSON details of the recipe
    is_custom: bool

class SavedRecipeResponse(BaseModel):
    id: int
    recipe_name: str
    recipe_details: str  # JSON string
    is_custom: bool

    class Config:
        from_attributes = True

class IngredientItem(BaseModel):
    name: str
    quantity: str

class CustomRecipeRequest(BaseModel):
    name: str
    country: Optional[str] = "Unknown"
    cuisine_type: Optional[str] = "Fusion"
    ingredients: List[IngredientItem]
    steps: List[str]
    time: Optional[int] = 30
    save_to_cookbook: Optional[bool] = False

class CustomRecipeResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: str
    country: str
    cuisine_type: str
    ingredients: str
    steps: str
    time: int

    class Config:
        from_attributes = True

# Helper functions for recipe ranking
def is_staple_or_seasoning(ingredient: str) -> bool:
    ing = ingredient.lower().strip()
    
    # Common pantry staples, oils, basic spices, and seasonings
    staple_exacts = {
        "salt", "sugar", "water", "butter", "ghee", "oil", "olive oil", "vegetable oil",
        "black pepper", "pepper", "white pepper", "salt & pepper", "paprika", "turmeric",
        "cumin", "coriander", "oregano", "basil", "cardamom", "chili powder", "chili",
        "turmeric powder", "coriander powder", "cumin seeds", "cumin powder", "sesame oil",
        "soy sauce", "vinegar", "honey", "mayonnaise", "mustard"
    }
    
    if ing in staple_exacts:
        return True
        
    words = ing.split()
    for word in words:
        if word in ["salt", "sugar", "oil", "ghee", "butter", "powder", "seasoning", "paprika", "turmeric", "cumin", "oregano", "basil"]:
            return True
            
    return False

def is_ingredient_match(user_ing: str, recipe_ing: str) -> bool:
    u = user_ing.lower().strip()
    r = recipe_ing.lower().strip()
    
    if u == r:
        return True
        
    def clean_plural(s: str) -> str:
        if s.endswith("es"):
            return s[:-2]
        if s.endswith("s") and not s.endswith("ss"):
            return s[:-1]
        return s
        
    u_clean = clean_plural(u)
    r_clean = clean_plural(r)
    
    if u_clean == r_clean:
        return True
        
    if u_clean in r_clean or r_clean in u_clean:
        return True
        
    ignore_words = {"fresh", "organic", "ground", "diced", "chopped", "sliced", "cooked", "raw", "large", "medium", "small", "breast", "breasts", "style", "fillet", "fillets"}
    u_words = {w for w in u_clean.split() if w not in ignore_words and len(w) > 2}
    r_words = {w for w in r_clean.split() if w not in ignore_words and len(w) > 2}
    
    if u_words and r_words and u_words.intersection(r_words):
        return True
        
    return False

def calculate_ingredient_match(user_ingredients: List[str], recipe_ingredients: List[dict]) -> float:
    if not recipe_ingredients:
        return 0.0
        
    user_set = {ing.lower().strip() for ing in user_ingredients}
    recipe_set = {ing["name"].lower().strip() for ing in recipe_ingredients}
    
    recipe_required = {ing for ing in recipe_set if not is_staple_or_seasoning(ing) or ing in user_set}
    
    if not recipe_required:
        return 1.0
        
    match_count = 0
    for req_ing in recipe_required:
        for user_ing in user_ingredients:
            if is_ingredient_match(user_ing, req_ing):
                match_count += 1
                break
                
    return match_count / len(recipe_required)

def calculate_preference_match(user: User, recipe: Recipe) -> float:
    try:
        preferences = json.loads(user.preferences)
    except:
        preferences = {}
        
    diet = preferences.get("diet", "None").lower()
    allergies = [a.lower().strip() for a in preferences.get("allergies", "").split(",") if a.strip()]
    spicy_level = preferences.get("spicy_level", "Medium").lower()
    
    # 1. Check Diet constraints
    recipe_name_lower = recipe.name.lower()
    recipe_ingredients = recipe.ingredients_list
    
    # Simple check for vegetarian/vegan violations
    non_veg_keywords = ["chicken", "beef", "pork", "fish", "shrimp", "mutton", "lamb", "bacon", "meat"]
    has_meat = any(any(kw in ing["name"].lower() for kw in non_veg_keywords) for ing in recipe_ingredients) or any(kw in recipe_name_lower for kw in non_veg_keywords)
    
    if diet == "vegetarian" and has_meat:
        return 0.0  # Big penalty
    if diet == "vegan" and (has_meat or any("egg" in ing["name"].lower() or "cheese" in ing["name"].lower() or "butter" in ing["name"].lower() or "milk" in ing["name"].lower() for ing in recipe_ingredients)):
        return 0.0
        
    # 2. Check Allergies
    for allergy in allergies:
        if any(allergy in ing["name"].lower() for ing in recipe_ingredients) or allergy in recipe_name_lower:
            return 0.0
            
    # 3. Spicy match
    # Cuisines that are typically spicy
    spicy_cuisines = ["indian", "mexican", "thai", "korean"]
    recipe_cuisine = recipe.cuisine_type.lower()
    
    is_spicy_cuisine = recipe_cuisine in spicy_cuisines or "chili" in recipe_name_lower or any("chili" in ing["name"].lower() for ing in recipe_ingredients)
    
    if spicy_level == "high" and is_spicy_cuisine:
        return 1.0
    elif spicy_level == "low" and is_spicy_cuisine:
        return 0.2
        
    return 0.8

# Routes
@router.post("/recommend")
def recommend_recipes(req: RecommendRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_ingredients = [ing.strip().lower() for ing in req.ingredients if ing.strip()]
    
    if not user_ingredients:
        raise HTTPException(status_code=400, detail="Ingredients list cannot be empty")
        
    if req.mode == "lab":
        # AI Kitchen Lab Mode: Generate a completely new recipe
        try:
            user_pref = json.loads(current_user.preferences)
        except:
            user_pref = {}
        lab_recipes = RecipeGenerator.generate_creative_recipes(user_ingredients, user_pref)
        recipes_list = lab_recipes.get("recipes", []) if lab_recipes else []
        return {"mode": "lab", "recipes": recipes_list}
        
    else:
        # World Kitchen Mode: Retrieve real global recipes from the web (using Gemini 2.5)
        try:
            user_pref = json.loads(current_user.preferences)
        except:
            user_pref = {}
            
        web_recipes = RecipeGenerator.retrieve_world_recipes(user_ingredients, user_pref)
        if web_recipes and "recipes" in web_recipes:
            for r in web_recipes["recipes"]:
                recipe_ingredients = r.get("ingredients", [])
                
                # Check which recipe ingredients are in the user's pantry
                matched_ingredients = []
                missing_ingredients = []
                
                for recipe_ing in recipe_ingredients:
                    ring_name = recipe_ing.get("name", "").lower().strip()
                    if not ring_name:
                        continue
                        
                    # Staples are never considered missing
                    if is_staple_or_seasoning(ring_name):
                        continue
                        
                    # Check if it matches any user ingredient
                    is_matched = False
                    for user_ing in user_ingredients:
                        if is_ingredient_match(user_ing, ring_name):
                            is_matched = True
                            break
                            
                    if is_matched:
                        matched_ingredients.append(ring_name)
                    else:
                        missing_ingredients.append(recipe_ing.get("name", ""))
                
                r["missing_ingredients"] = missing_ingredients
                
                # Calculate match score based on matching required ingredients
                total_req_count = len(matched_ingredients) + len(missing_ingredients)
                if total_req_count > 0:
                    r["match_score"] = round((len(matched_ingredients) / total_req_count) * 100, 1)
                else:
                    r["match_score"] = 100.0
                
                # Fetch legitimate verified image from official Wikipedia Rest API
                wiki_img = get_wikipedia_image_url(r["name"])
                if wiki_img:
                    r["image_url"] = wiki_img
            return {"mode": "world", "recipes": web_recipes["recipes"][:5]}
            
        # Fallback: RAG vector search + ranking from local DB
        # 1. Create search query embedding
        query_text = " ".join(user_ingredients)
        query_embedding = embedding_engine.get_embedding(query_text)
        
        # 2. Retrieve all recipes (global ones + user's custom ones)
        db_recipes = db.query(Recipe).filter((Recipe.user_id == None) | (Recipe.user_id == current_user.id)).all()
        scored_recipes = []
        
        for recipe in db_recipes:
            if not recipe.embedding:
                continue
                
            # Deserialize embedding
            recipe_embedding = json.loads(recipe.embedding)
            
            # Cosine similarity (cuisine/semantic match)
            cuisine_sim = embedding_engine.calculate_similarity(query_embedding, recipe_embedding)
            
            # Ingredient match ratio (how many of recipe ingredients user has)
            ing_match = calculate_ingredient_match(user_ingredients, recipe.ingredients_list)
            
            # User preferences match
            pref_match = calculate_preference_match(current_user, recipe)
            
            # If user preferences rule this dish out (e.g. vegetarian violation), we filter it
            if pref_match == 0.0 and ing_match < 1.0:
                continue
                
            # Score formula: 0.5 * ingredient_match + 0.3 * cuisine_similarity + 0.2 * user_preferences
            final_score = (0.5 * ing_match + 0.3 * cuisine_sim + 0.2 * pref_match) * 100
            
            # Find missing ingredients (excluding common staples, unless the user actually has them in their pantry)
            # A recipe ingredient is missing if it is not in the user's pantry and is not a staple.
            user_ing_set = {ing.lower().strip() for ing in user_ingredients}
            
            missing = []
            for ing in recipe.ingredients_list:
                ing_lower = ing["name"].lower().strip()
                if ing_lower not in user_ing_set and not is_staple_or_seasoning(ing_lower):
                    missing.append(ing_lower)
            
            # Fetch verified recipe image from Wikipedia rest API
            wiki_img = get_wikipedia_image_url(recipe.name)
            
            scored_recipes.append({
                "id": recipe.id,
                "name": recipe.name,
                "country": recipe.country,
                "cuisine_type": recipe.cuisine_type,
                "image_url": wiki_img,
                "ingredients": recipe.ingredients_list,
                "steps": recipe.steps_list,
                "time": recipe.time,
                "match_score": round(final_score, 1),
                "missing_ingredients": missing
            })
            
        # Sort recipes: group by number of missing ingredients (ascending), then sort by match score (descending)
        scored_recipes.sort(key=lambda x: (len(x["missing_ingredients"]), -x["match_score"]))
        
        return {"mode": "world", "recipes": scored_recipes[:5]}

@router.post("/substitute")
def get_substitutions(req: SubstituteRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    missing = [m.strip() for m in req.missing_ingredients if m.strip()]
    if not missing:
        return {"substitutions": []}
    
    # Query user's actual pantry ingredients
    pantry_items = db.query(Pantry).filter(Pantry.user_id == current_user.id).all()
    user_ingredients = [item.ingredient for item in pantry_items]
    
    return RecipeGenerator.get_substitutions(missing, user_ingredients)

@router.post("/nutrition")
def analyze_nutrition(req: NutritionRequest, current_user: User = Depends(get_current_user)):
    return RecipeGenerator.analyze_nutrition(req.recipe_name, req.ingredients)

@router.get("/saved", response_model=List[SavedRecipeResponse])
def get_saved_recipes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(SavedRecipe).filter(SavedRecipe.user_id == current_user.id).order_by(SavedRecipe.created_at.desc()).all()

@router.post("/saved", response_model=SavedRecipeResponse)
def save_recipe(req: SaveRecipeRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_save = SavedRecipe(
        user_id=current_user.id,
        recipe_name=req.recipe_name,
        recipe_details=json.dumps(req.recipe_details),
        is_custom=req.is_custom
    )
    db.add(new_save)
    db.commit()
    db.refresh(new_save)
    return new_save

@router.delete("/saved/{saved_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_recipe(saved_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    saved = db.query(SavedRecipe).filter(SavedRecipe.id == saved_id, SavedRecipe.user_id == current_user.id).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Saved recipe not found")
    db.delete(saved)
    db.commit()
    return

@router.get("/custom", response_model=List[CustomRecipeResponse])
def get_custom_recipes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Recipe).filter(Recipe.user_id == current_user.id).all()

@router.post("/custom", response_model=CustomRecipeResponse)
def create_custom_recipe(req: CustomRecipeRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Standardize ingredients names for search
    ingredients_text = " ".join([ing.name.strip().lower() for ing in req.ingredients])
    
    # Calculate embedding
    vector = embedding_engine.get_embedding(ingredients_text)
    vector_json = json.dumps(vector)
    
    # Convert ingredients to JSON structure
    ingredients_data = [{"name": ing.name.strip().lower(), "quantity": ing.quantity.strip()} for ing in req.ingredients]
    
    new_recipe = Recipe(
        user_id=current_user.id,
        name=req.name.strip(),
        country=req.country.strip(),
        cuisine_type=req.cuisine_type.strip(),
        ingredients=json.dumps(ingredients_data),
        steps=json.dumps([step.strip() for step in req.steps if step.strip()]),
        time=req.time,
        embedding=vector_json
    )
    
    db.add(new_recipe)
    db.commit()
    db.refresh(new_recipe)
    
    # Optionally save to cookbook too
    if req.save_to_cookbook:
        recipe_details = {
            "id": new_recipe.id,
            "user_id": current_user.id,
            "name": new_recipe.name,
            "country": new_recipe.country,
            "cuisine_type": new_recipe.cuisine_type,
            "ingredients": ingredients_data,
            "steps": new_recipe.steps_list,
            "time": new_recipe.time
        }
        new_save = SavedRecipe(
            user_id=current_user.id,
            recipe_name=new_recipe.name,
            recipe_details=json.dumps(recipe_details),
            is_custom=False
        )
        db.add(new_save)
        db.commit()
        
    return new_recipe

@router.delete("/custom/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_recipe(recipe_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id, Recipe.user_id == current_user.id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
        
    # Delete from Saved Recipes too if saved
    saved = db.query(SavedRecipe).filter(
        SavedRecipe.user_id == current_user.id,
        SavedRecipe.recipe_name == recipe.name
    ).first()
    if saved:
        db.delete(saved)
        
    db.delete(recipe)
    db.commit()
    return
