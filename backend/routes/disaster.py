from fastapi import APIRouter
from database.connection import db


router = APIRouter(
    prefix="/api/disasters",
    tags=["Disasters"]
)


@router.get("/")
def get_disasters():

    disasters = list(
        db.disasters.find(
            {},
            {"_id": 1, "name": 1, "description": 1, "severity": 1}
        )
    )

    for disaster in disasters:
        disaster["id"] = str(disaster["_id"])
        del disaster["_id"]

    return {
        "count": len(disasters),
        "disasters": disasters
    }


@router.get("/{disaster_id}")
def get_disaster(disaster_id: str):

    from bson import ObjectId

    disaster = db.disasters.find_one({
        "_id": ObjectId(disaster_id)
    })

    if not disaster:
        return {
            "message": "Disaster not found"
        }

    disaster["id"] = str(disaster["_id"])
    del disaster["_id"]

    return disaster