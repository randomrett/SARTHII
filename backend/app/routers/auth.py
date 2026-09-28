from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserOut, Token, UserRoleUpdate
from app.security import verify_password, get_password_hash, create_access_token, get_current_user, require_role

router = APIRouter(prefix="/auth", tags=["Auth"])

VALID_ROLES = ["admin", "manager", "field_worker"]

def seed_default_users_if_empty(db: Session):
    try:
        if db.query(User).count() == 0:
            demo_users = [
                User(
                    email="admin@saarthi.ai",
                    hashed_password=get_password_hash("password123"),
                    full_name="Admin User",
                    role="admin"
                ),
                User(
                    email="manager@saarthi.ai",
                    hashed_password=get_password_hash("password123"),
                    full_name="Site Manager",
                    role="manager"
                ),
                User(
                    email="worker@saarthi.ai",
                    hashed_password=get_password_hash("password123"),
                    full_name="Field Supervisor",
                    role="field_worker"
                )
            ]
            db.add_all(demo_users)
            db.commit()
            print("⚡ [SAARTHI AUTH] Seeded default demo accounts (admin, manager, field_worker).")

        from app.models.project import Project
        from app.models.activity import Activity

        if db.query(Project).count() == 0:
            demo_project = Project(
                id="PROJ-001",
                title="Delhi Metro Phase IV — Underground Line 8",
                description="Metro corridor underground tunneling & station construction."
            )
            db.add(demo_project)
            db.commit()

        if db.query(Activity).count() == 0:
            demo_activities = [
                Activity(id="ACT-001", name="Raft Foundation Concrete Pour", zone="Zone A", planned_start="2026-03-01", planned_end="2026-03-25", progress=75.0, status="in_progress", category="Civil Works", unit="cum", target_quantity=1200, completed_quantity=900),
                Activity(id="ACT-002", name="Diaphragm Wall Wall Excavation", zone="Zone A", planned_start="2026-03-10", planned_end="2026-04-10", progress=40.0, status="in_progress", category="Excavation", unit="m", target_quantity=450, completed_quantity=180),
                Activity(id="ACT-003", name="Column Rebar Bending & Cage Fixing", zone="Zone B", planned_start="2026-03-15", planned_end="2026-04-15", progress=25.0, status="in_progress", category="Reinforcement", unit="MT", target_quantity=85, completed_quantity=21.25),
                Activity(id="ACT-004", name="Deck Slab Shuttering & Formwork", zone="Zone B", planned_start="2026-03-20", planned_end="2026-04-20", progress=10.0, status="in_progress", category="Formwork", unit="sqm", target_quantity=2400, completed_quantity=240),
                Activity(id="ACT-005", name="TBM Tunnel Ring Segment Erection", zone="North Shaft", planned_start="2026-04-01", planned_end="2026-05-30", progress=0.0, status="not_started", category="Tunneling", unit="rings", target_quantity=320, completed_quantity=0)
            ]
            db.add_all(demo_activities)
            db.commit()
            print("⚡ [SAARTHI SEED] Seeded default baseline schedule activities.")
    except Exception as e:
        print("[SAARTHI AUTH] Seeding error:", e)

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    role = user_in.role if user_in.role in VALID_ROLES else "field_worker"

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name or user_in.email.split('@')[0].capitalize(),
        role=role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    seed_default_users_if_empty(db)
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email, "role": user.role, "user_id": user.id})
    user_out = UserOut.model_validate(user)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_out
    )

@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Admin-only: List all registered system users."""
    seed_default_users_if_empty(db)
    return db.query(User).order_by(User.created_at.desc()).all()

@router.put("/users/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: str,
    role_in: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Admin-only: Assign or change user role."""
    if role_in.role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {VALID_ROLES}"
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    target_user.role = role_in.role
    db.commit()
    db.refresh(target_user)
    return target_user

