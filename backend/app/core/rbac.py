from fastapi import Depends, HTTPException, status
from app.core.dependencies import get_current_user
from app.models.user import User


def require_admin(current_user: User = Depends(get_current_user)):
    """
    Dependency to require admin role.
    Admin can manage master/configuration data.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def require_admin_or_user(current_user: User = Depends(get_current_user)):
    """
    Dependency to require either admin or user role.
    Both roles can perform costing and access operations.
    """
    if current_user.role not in ["admin", "user"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Valid role required (admin or user)"
        )
    return current_user
