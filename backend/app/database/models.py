import json
from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, Date, DateTime, func
from sqlalchemy.orm import relationship
from .connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    preferences = Column(Text, default="{}")  # Stored as JSON string (diet, allergies, spices)

    # Relationships
    pantry_items = relationship("Pantry", back_populates="user", cascade="all, delete-orphan")
    saved_recipes = relationship("SavedRecipe", back_populates="user", cascade="all, delete-orphan")
    custom_recipes = relationship("Recipe", back_populates="creator", cascade="all, delete-orphan")

class Pantry(Base):
    __tablename__ = "pantry"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ingredient = Column(String, nullable=False, index=True)
    quantity = Column(String, default="some")  # e.g., "500g", "3 pieces"
    expiry_date = Column(Date, nullable=True)   # Expiry tracking
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="pantry_items")

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    name = Column(String, index=True, nullable=False)
    country = Column(String, default="Unknown")
    ingredients = Column(Text, nullable=False)  # JSON-serialized list of strings
    steps = Column(Text, nullable=False)        # JSON-serialized list of strings
    time = Column(Integer, default=30)          # Prep+cooking time in minutes
    cuisine_type = Column(String, default="Fusion")
    embedding = Column(Text, nullable=True)     # JSON-serialized list of floats (384 dimensions)

    # Relationships
    creator = relationship("User", back_populates="custom_recipes")

    @property
    def ingredients_list(self):
        try:
            return json.loads(self.ingredients)
        except:
            return []

    @property
    def steps_list(self):
        try:
            return json.loads(self.steps)
        except:
            return []

class SavedRecipe(Base):
    __tablename__ = "saved_recipes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipe_name = Column(String, nullable=False)
    recipe_details = Column(Text, nullable=False)  # JSON-serialized full recipe card (ingredients, steps, source, nutrition)
    is_custom = Column(Boolean, default=False)     # True if AI-generated, False if existing dish
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="saved_recipes")
