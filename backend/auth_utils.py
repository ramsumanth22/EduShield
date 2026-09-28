import os

import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from database.connection import db

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    secret_key = os.getenv("JWT_SECRET", "").strip()

    if not secret_key or secret_key in {"your_long_random_secret", "change_me"}:
        raise HTTPException(status_code=500, detail="JWT_SECRET is not configured")

    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        user_id = payload.get("user_id")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        try:
            object_id = ObjectId(user_id)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = db.users.find_one({"_id": object_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return user

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
