from fastapi import APIRouter, Depends
from auth_utils import get_current_user
from database.connection import db


router = APIRouter(
    prefix="/api/student",
    tags=["Student"]
)


@router.get("/profile")
def get_profile(current_user=Depends(get_current_user)):

    return {
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user["role"],
        "created_at": current_user["created_at"]
    }
@router.get("/results")
def get_student_results(
    current_user=Depends(get_current_user)
):

    results = list(
        db.quiz_results.find(
            {
                "student_id": current_user["_id"]
            },
            {
                "_id": 0,
                "quiz_id": 0,
                "student_id": 0
            }
        ).sort("completed_at", -1)
    )

    total_quizzes = len(results)

    if total_quizzes > 0:
        average_score = round(
            sum(result["percentage"] for result in results)
            / total_quizzes
        )
    else:
        average_score = 0

    for result in results:
        if "completed_at" in result:
            result["completed_at"] = result["completed_at"].isoformat()

    return {
        "total_quizzes": total_quizzes,
        "average_score": average_score,
        "results": results
    }
@router.get("/dashboard")
def get_student_dashboard(
    current_user=Depends(get_current_user)
):

    # Get this student's quiz results
    results = list(
        db.quiz_results.find(
            {
                "student_id": current_user["_id"]
            }
        ).sort("completed_at", -1)
    )

    # Basic statistics
    quizzes_completed = len(results)

    if quizzes_completed > 0:
        average_score = round(
            sum(result["percentage"] for result in results)
            / quizzes_completed
        )
    else:
        average_score = 0

    # Get unique disaster categories completed
    disasters_completed = list(
        set(
            result.get("disaster")
            for result in results
            if result.get("disaster")
        )
    )

    # Preparedness score
    preparedness_score = average_score

    # Determine level
    if preparedness_score >= 80:
        level = "Excellent"
    elif preparedness_score >= 60:
        level = "Good"
    elif preparedness_score >= 40:
        level = "Needs Improvement"
    else:
        level = "Beginner"

    # Badges
    # --------------------------------
# ACHIEVEMENTS / BADGES
# --------------------------------

    badges = []

# First quiz
    if quizzes_completed >= 1:
        badges.append({
            "name": "First Responder",
            "description": "Completed your first disaster preparedness quiz."
        })

# Fire achievement
    fire_results = [
        result for result in results
        if result.get("disaster") == "Fire"
    ]

    if any(result.get("percentage", 0) >= 80 for result in fire_results):
        badges.append({
            "name": "Fire Ready",
            "description": "Scored 80% or higher in Fire Safety."
        })

# Flood achievement
    flood_results = [
        result for result in results
        if result.get("disaster") == "Flood"
    ]

    if any(result.get("percentage", 0) >= 80 for result in flood_results):
        badges.append({
            "name": "Flood Guardian",
            "description": "Scored 80% or higher in Flood Safety."
        })

# Earthquake achievement
    earthquake_results = [
        result for result in results
        if result.get("disaster") == "Earthquake"
    ]

    if any(result.get("percentage", 0) >= 80 for result in earthquake_results):
        badges.append({
            "name": "Earthquake Ready",
            "description": "Scored 80% or higher in Earthquake Safety."
        })

# Additional disaster achievements
    disaster_badges = [
        ("Cyclone", "Cyclone Ready", "Scored 80% or higher in Cyclone / Windstorm Safety."),
        ("Landslide", "Landslide Ready", "Scored 80% or higher in Landslide Safety."),
        ("Chemical", "Chemical Safety Ready", "Scored 80% or higher in Chemical / Gas Leak Safety."),
        ("Biological", "Biological Safety Ready", "Scored 80% or higher in Biological Hazard Safety."),
        ("Radiological", "Radiological Safety Ready", "Scored 80% or higher in Radiological Safety.")
    ]

    for disaster_name, badge_name, description in disaster_badges:
        if any(
            result.get("disaster") == disaster_name and
            result.get("percentage", 0) >= 80
            for result in results
        ):
            badges.append({
                "name": badge_name,
                "description": description
            })

# Explorer achievement
    if quizzes_completed >= 3:
        badges.append({
            "name": "Preparedness Explorer",
            "description": "Completed three or more disaster quizzes."
        })

# High preparedness achievement
    if preparedness_score >= 90:
        badges.append({
            "name": "EduShield Champion",
            "description": "Achieved a preparedness score of 90% or higher."
        })

    # Recent results
    recent_results = []

    for result in results[:5]:

        recent_results.append({
            "quiz_title": result.get("quiz_title"),
            "disaster": result.get("disaster"),
            "score": result.get("score"),
            "total": result.get("total"),
            "percentage": result.get("percentage"),
            "completed_at": (
                result["completed_at"].isoformat()
                if result.get("completed_at")
                else None
            )
        })

    return {
        "student": {
            "id": str(current_user["_id"]),
            "name": current_user.get("name"),
            "email": current_user.get("email")
        },
        "preparedness_score": preparedness_score,
        "level": level,
        "quizzes_completed": quizzes_completed,
        "average_score": average_score,
        "disasters_completed": len(disasters_completed),
        "disaster_categories": disasters_completed,
        "badges": badges,
        "recent_results": recent_results
    }

@router.get("/ranking")
def get_student_ranking(current_user=Depends(get_current_user)):
    """Return the authenticated student's points, rank and leaderboard preview."""
    students = list(db.users.find({"role": "student"}, {"_id": 1, "name": 1, "email": 1}))
    leaderboard = []
    for student in students:
        results = list(db.quiz_results.find({"student_id": student["_id"]}, {"percentage": 1}))
        scores = [int(r.get("percentage", 0)) for r in results]
        leaderboard.append({
            "id": str(student["_id"]),
            "name": student.get("name", "Student"),
            "quizzes_completed": len(scores),
            "average_score": round(sum(scores) / len(scores)) if scores else 0,
            "points": sum(scores)
        })

    leaderboard.sort(key=lambda x: (-x["points"], -x["average_score"], x["name"].lower()))
    for index, item in enumerate(leaderboard, 1):
        item["rank"] = index

    current_id = str(current_user["_id"])
    me = next((x for x in leaderboard if x["id"] == current_id), None)
    total = len(leaderboard)
    rank = me["rank"] if me else None
    percentile = round((total - rank) / max(1, total) * 100) if rank else 0

    return {
        "rank": rank,
        "total_students": total,
        "percentile": percentile,
        "points": me["points"] if me else 0,
        "average_score": me["average_score"] if me else 0,
        "leaderboard": leaderboard[:10]
    }


# --------------------------------
# EMERGENCY KIT - PERSISTENT PER STUDENT
# --------------------------------

EMERGENCY_KIT_ITEMS = [
    "Drinking water",
    "First-aid kit",
    "Flashlight",
    "Whistle",
    "Power bank / batteries",
    "Essential medicines",
    "Emergency contact card",
    "Important documents",
    "Non-perishable snacks",
    "Face mask",
    "Small radio",
    "Hand sanitizer"
]

@router.get("/emergency-kit")
def get_emergency_kit(current_user=Depends(get_current_user)):
    """Return the authenticated student's saved emergency-kit checklist."""
    doc = db.student_kits.find_one({"student_id": current_user["_id"]}, {"_id": 0, "checked": 1})
    checked = doc.get("checked", {}) if doc else {}
    return {"items": EMERGENCY_KIT_ITEMS, "checked": checked}

@router.put("/emergency-kit")
def save_emergency_kit(payload: dict, current_user=Depends(get_current_user)):
    """Persist the authenticated student's emergency-kit checklist."""
    incoming = payload.get("checked", {})
    if not isinstance(incoming, dict):
        incoming = {}
    checked = {str(i): bool(incoming.get(str(i), False)) for i in range(len(EMERGENCY_KIT_ITEMS))}
    db.student_kits.update_one(
        {"student_id": current_user["_id"]},
        {"$set": {"student_id": current_user["_id"], "checked": checked}},
        upsert=True
    )
    done = sum(1 for value in checked.values() if value)
    return {"message": "Emergency kit checklist saved", "checked": checked, "score": round(done / len(EMERGENCY_KIT_ITEMS) * 100)}

# --------------------------------
# DRILLS / PREPAREDNESS EVENTS
# --------------------------------

@router.get("/drills")
def get_drills(current_user=Depends(get_current_user)):
    """Return school preparedness drills/events shown on the student dashboard."""
    return {
        "drills": [
            {"title": "Earthquake Drill", "date": "15 Sep", "type": "Earthquake", "status": "Scheduled"},
            {"title": "Fire Evacuation Drill", "date": "22 Sep", "type": "Fire", "status": "Scheduled"},
            {"title": "Flood Response Workshop", "date": "30 Sep", "type": "Flood", "status": "Upcoming"}
        ]
    }
