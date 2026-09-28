from fastapi import APIRouter, Depends, HTTPException
from database.connection import db
from auth_utils import get_current_user


router = APIRouter(
    prefix="/api/staff",
    tags=["Staff"]
)


# --------------------------------
# GET STAFF DASHBOARD
# --------------------------------

@router.get("/dashboard")
def get_staff_dashboard(current_user=Depends(get_current_user)):
    """Staff analytics: enrollment, performance, rankings and disaster completion."""
    if current_user.get("role", "").lower() != "staff":
        raise HTTPException(status_code=403, detail="Staff access required")

    students = list(db.users.find({"role": "student"}, {"_id": 1, "name": 1, "email": 1}))
    quiz_count = db.quizzes.count_documents({})
    student_data = []
    disaster_stats = {}
    total_results = 0
    all_scores = []

    for student in students:
        sid = student["_id"]
        results = list(db.quiz_results.find({"student_id": sid}, {"percentage": 1, "disaster": 1, "completed_at": 1}))
        scores = [int(r.get("percentage", 0)) for r in results]
        avg = round(sum(scores) / len(scores)) if scores else 0
        completed = len(set(str(r.get("disaster", "")).strip().lower() for r in results if r.get("disaster")))
        all_scores.extend(scores)
        total_results += len(results)

        for r in results:
            name = r.get("disaster", "Unknown")
            key = str(name).strip()
            if key:
                disaster_stats.setdefault(key, {"completed": 0, "scores": []})
                disaster_stats[key]["completed"] += 1
                disaster_stats[key]["scores"].append(int(r.get("percentage", 0)))

        status = "Unrated" if not scores else ("Excellent" if avg >= 80 else "Pass" if avg >= 60 else "Needs Training")
        student_data.append({"id": str(sid), "name": student.get("name", "Student"), "email": student.get("email", ""), "quizzes_completed": len(results), "disasters_completed": completed, "average_score": avg, "status": status, "points": sum(scores)})

    student_data.sort(key=lambda x: (-x["points"], -x["average_score"], x["name"].lower()))
    for rank, student in enumerate(student_data, 1):
        student["rank"] = rank

    average_score = round(sum(all_scores) / len(all_scores)) if all_scores else 0
    total_students = len(students)
    high_performers = sum(1 for s in student_data if s["average_score"] >= 80)
    needs_training = sum(1 for s in student_data if s["average_score"] < 60 and s["quizzes_completed"] > 0)
    readiness = "NO DATA" if not total_students else "HIGH READINESS" if average_score >= 75 else "MODERATE" if average_score >= 50 else "CRITICAL RISK"

    disaster_breakdown = []
    for disaster, value in sorted(disaster_stats.items()):
        disaster_breakdown.append({"disaster": disaster, "completed": value["completed"], "average_score": round(sum(value["scores"]) / len(value["scores"])) if value["scores"] else 0})

    return {
        "total_students": total_students,
        "active_students": sum(1 for s in student_data if s["quizzes_completed"] > 0),
        "total_quizzes_available": quiz_count,
        "total_completed_quizzes": total_results,
        "average_score": average_score,
        "average_preparedness": average_score,
        "readiness": readiness,
        "high_performers": high_performers,
        "needs_training": needs_training,
        "students": student_data,
        "rankings": student_data[:10],
        "disaster_breakdown": disaster_breakdown
    }


# --------------------------------
# GET INDIVIDUAL STUDENT PERFORMANCE
# --------------------------------

@router.get("/students/{student_id}")
def get_student_performance(student_id: str, current_user=Depends(get_current_user)):
    if current_user.get("role", "").lower() != "staff":
        raise HTTPException(status_code=403, detail="Staff access required")

    from bson import ObjectId
    try:
        object_id = ObjectId(student_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid student ID")

    student = db.users.find_one({"_id": object_id, "role": "student"}, {"_id": 1, "name": 1, "email": 1})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    results = list(db.quiz_results.find({"student_id": object_id}, {"_id": 0}).sort("completed_at", -1))
    scores = [int(r.get("percentage", 0)) for r in results]
    average = round(sum(scores) / len(scores)) if scores else 0
    status = "Unrated" if not scores else ("Excellent" if average >= 80 else "Pass" if average >= 60 else "Needs Training")

    for result in results:
        if result.get("completed_at"):
            result["completed_at"] = result["completed_at"].isoformat()

    return {
        "student": {"id": str(student["_id"]), "name": student.get("name", "Student"), "email": student.get("email", "") , "status": status},
        "quizzes_completed": len(results),
        "average_score": average,
        "preparedness_score": average,
        "points": sum(scores),
        "disasters_completed": len(set(r.get("disaster") for r in results if r.get("disaster"))),
        "results": results
    }


# --------------------------------
# RESET STUDENT QUIZ RESULTS
# --------------------------------

@router.delete("/students/{student_id}/results")
def reset_student_results(
    student_id: str,
    current_user=Depends(get_current_user)
):

    # Only staff can perform this action
    if current_user.get("role", "").lower() != "staff":
        raise HTTPException(
            status_code=403,
            detail="Staff access required"
        )

    from bson import ObjectId

    try:
        object_id = ObjectId(student_id)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid student ID"
        )

    # Make sure student exists
    student = db.users.find_one({
        "_id": object_id,
        "role": "student"
    })

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    # Delete all quiz results
    result = db.quiz_results.delete_many({
        "student_id": object_id
    })

    return {
        "message": "Student quiz results reset successfully",
        "student": student.get("name", "Student"),
        "deleted_results": result.deleted_count
    }