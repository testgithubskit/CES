from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.core.rbac import require_admin
from app.core.security import get_password_hash
from app.schemas.listing import RecordList
from app.services.custom_fields import apply_values, catalog, pop_custom, with_fields

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.get("/", response_model=RecordList[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return catalog(db, "user", db.query(User).order_by(User.id.asc()).all(), UserResponse)


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    data = payload.model_dump()
    custom_fields = pop_custom(data)
    existing = db.query(User).filter(User.email == data["email"]).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    if data["role"] not in ("admin", "user"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role must be admin or user")
    user = User(
        name=data["name"],
        email=data["email"],
        password_hash=get_password_hash(data["password"]),
        role=data["role"],
        is_active=data["is_active"],
    )
    db.add(user)
    db.flush()
    apply_values(db, "user", user.id, custom_fields)
    db.commit()
    db.refresh(user)
    return with_fields(db, "user", user, UserResponse)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    data = payload.model_dump(exclude_unset=True)
    custom_fields = pop_custom(data)
    password = data.pop("password", None)
    if user.id == current_user.id and data.get("role") and data["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot remove your own admin access")
    if password:
        user.password_hash = get_password_hash(password)
    for field, value in data.items():
        setattr(user, field, value)
    apply_values(db, "user", user.id, custom_fields)
    db.commit()
    db.refresh(user)
    return with_fields(db, "user", user, UserResponse)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account")
    db.delete(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This user is linked to existing records and cannot be deleted",
        )
