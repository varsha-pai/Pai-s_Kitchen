import os
import sys
import json

# Add parent directory to sys.path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import engine, Base, SessionLocal
from app.database.models import Recipe
from app.ai.embeddings import embedding_engine

def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Load recipes from JSON file
        json_path = os.path.join(os.path.dirname(__file__), "app", "data", "recipes.json")
        if not os.path.exists(json_path):
            # Fallback path if run inside app/ directory
            json_path = os.path.join(os.path.dirname(__file__), "data", "recipes.json")

        with open(json_path, "r", encoding="utf-8") as f:
            recipes_data = json.load(f)
            
        print(f"Loaded {len(recipes_data)} recipes from JSON.")
        
        for r_data in recipes_data:
            # Check if recipe already exists
            existing = db.query(Recipe).filter(Recipe.name == r_data["name"]).first()
            if existing:
                print(f"Recipe '{r_data['name']}' already exists, skipping.")
                continue
                
            print(f"Generating embedding and inserting: {r_data['name']}...")
            
            # Create a textual representation of ingredients for embedding search
            # We join ingredient names into a space-separated string
            ingredients_text = " ".join([ing["name"] for ing in r_data["ingredients"]])
            
            # Calculate embedding vector
            vector = embedding_engine.get_embedding(ingredients_text)
            
            # Serialize to JSON string for SQLite storage
            vector_json = json.dumps(vector)
            
            # Create recipe instance
            recipe = Recipe(
                name=r_data["name"],
                country=r_data["country"],
                cuisine_type=r_data["cuisine_type"],
                ingredients=json.dumps(r_data["ingredients"]),
                steps=json.dumps(r_data["steps"]),
                time=r_data["time"],
                embedding=vector_json
            )
            db.add(recipe)
            
        db.commit()
        print("Database seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
