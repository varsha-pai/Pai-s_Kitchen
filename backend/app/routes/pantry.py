from datetime import date, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..database.models import Pantry
from .auth import get_current_user, User
from ..ai.generator import RecipeGenerator

router = APIRouter(prefix="/pantry", tags=["Pantry"])

# Pydantic Schemas
class PantryCreate(BaseModel):
    ingredient: str
    quantity: Optional[str] = "some"
    expiry_date: Optional[str] = None  # Expected format YYYY-MM-DD or empty

class PantryUpdate(BaseModel):
    quantity: Optional[str] = None
    expiry_date: Optional[str] = None

class PantryResponse(BaseModel):
    id: int
    ingredient: str
    quantity: str
    expiry_date: Optional[date] = None

    class Config:
        from_attributes = True

# Routes
@router.get("", response_model=List[PantryResponse])
def get_pantry(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Pantry).filter(Pantry.user_id == current_user.id).all()

@router.post("", response_model=PantryResponse, status_code=status.HTTP_201_CREATED)
def add_pantry_item(item_in: PantryCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Standardize names to lowercase to avoid duplicate mismatches
    ing_name = item_in.ingredient.strip().lower()
    
    # Check if ingredient already exists in user's pantry
    existing = db.query(Pantry).filter(
        Pantry.user_id == current_user.id,
        Pantry.ingredient == ing_name
    ).first()
    
    parsed_date = None
    if item_in.expiry_date:
        try:
            parsed_date = datetime.strptime(item_in.expiry_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expiry date must be in YYYY-MM-DD format"
            )
            
    if existing:
        # Update existing quantity and expiry
        existing.quantity = item_in.quantity or existing.quantity
        if parsed_date:
            existing.expiry_date = parsed_date
        db.commit()
        db.refresh(existing)
        return existing
        
    new_item = Pantry(
        user_id=current_user.id,
        ingredient=ing_name,
        quantity=item_in.quantity,
        expiry_date=parsed_date
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.put("/{item_id}", response_model=PantryResponse)
def update_pantry_item(item_id: int, item_in: PantryUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(Pantry).filter(Pantry.id == item_id, Pantry.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pantry item not found")
        
    if item_in.quantity is not None:
        item.quantity = item_in.quantity
        
    if item_in.expiry_date is not None:
        if item_in.expiry_date == "":
            item.expiry_date = None
        else:
            try:
                item.expiry_date = datetime.strptime(item_in.expiry_date, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Expiry date must be in YYYY-MM-DD format"
                )
                
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pantry_item(item_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(Pantry).filter(Pantry.id == item_id, Pantry.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pantry item not found")
        
    db.delete(item)
    db.commit()
    return

@router.get("/expiry-insights")
def get_pantry_expiry_insights(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    # Fetch pantry items that have an expiry date
    pantry_items = db.query(Pantry).filter(
        Pantry.user_id == current_user.id,
        Pantry.expiry_date.isnot(None)
    ).all()
    
    expiring_items = []
    for item in pantry_items:
        days_left = (item.expiry_date - today).days
        # Items expiring in the next 7 days or already expired
        if days_left <= 7:
            expiring_items.append({
                "ingredient": item.ingredient,
                "days_left": max(0, days_left)
            })
            
    if not expiring_items:
        return {"suggestions": []}
        
    insights = RecipeGenerator.get_expiry_intelligence(expiring_items)
    return insights
