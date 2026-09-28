from datetime import datetime, timezone, timedelta
import os

import bcrypt
import jwt
from fastapi import APIRouter, HTTPException

from database.connection import db
from schemas.user import UserLogin, UserRegister


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET", "").strip()
    if not secret or secret in {"your_long_random_secret", "change_me"}:
        raise HTTPException(
            status_code=500,
            detail="JWT_SECRET is not configured. Add a secure JWT_SECRET to backend/.env."
        )
    return secret


@router.post("/register")
def register_user(user: UserRegister):
    role = user.role.strip().lower()

    if role not in {"student", "staff"}:
        raise HTTPException(status_code=400, detail="Role must be student or staff")

    if role == "staff":
        expected_code = os.getenv("STAFF_REGISTRATION_CODE", "").strip()
        if not expected_code:
            raise HTTPException(
                status_code=503,
                detail="Staff registration is not configured by the administrator."
            )
        if not user.staff_code or user.staff_code.strip() != expected_code:
            raise HTTPException(status_code=403, detail="Invalid staff registration code")
    else:
        # Students do not need a staff code.
        user.staff_code = None

    email = str(user.email).lower().strip()
    existing_user = db.users.find_one({"email": email})

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = bcrypt.hashpw(
        user.password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

    user_document = {
        "name": user.name.strip(),
        "email": email,
        "password": hashed_password,
        "role": role,
        "class_name": user.class_name.strip() if user.class_name else None,
        "created_at": datetime.now(timezone.utc),
    }

    result = db.users.insert_one(user_document)

    return {
        "message": "User registered successfully",
        "user_id": str(result.inserted_id),
        "role": role,
    }


@router.post("/login")
def login_user(credentials: UserLogin):
    email = str(credentials.email).lower().strip()
    requested_role = credentials.role.strip().lower()

    if requested_role not in {"student", "staff"}:
        raise HTTPException(status_code=400, detail="Role must be student or staff")

    user = db.users.find_one({"email": email})

    if not user or user.get("role", "").lower() != requested_role:
        raise HTTPException(status_code=401, detail="Invalid email, password, or account type")

    password_hash = user.get("password", "")
    try:
        password_correct = bcrypt.checkpw(
            credentials.password.encode("utf-8"),
            password_hash.encode("utf-8")
        )
    except (ValueError, TypeError):
        password_correct = False

    if not password_correct:
        raise HTTPException(status_code=401, detail="Invalid email, password, or account type")

    secret_key = _jwt_secret()

    payload = {
        "user_id": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }

    token = jwt.encode(payload, secret_key, algorithm="HS256")

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "name": user.get("name", "User"),
            "email": user["email"],
            "role": user["role"],
            "class_name": user.get("class_name"),
        },
    }
