from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database.connection import db
from auth_utils import get_current_user
from bson import ObjectId
from datetime import datetime, timezone


router = APIRouter(
    prefix="/api/quizzes",
    tags=["Quizzes"]
)


class QuizSubmission(BaseModel):
    answers: list[int]


# --------------------------------
# GET ALL QUIZZES
# --------------------------------

@router.get("/")
def get_quizzes():

    quizzes = list(
        db.quizzes.find(
            {},
            {
                "_id": 1,
                "title": 1,
                "disaster": 1,
                "description": 1,
                "difficulty": 1,
                "questions": 1
            }
        )
    )

    for quiz in quizzes:

        quiz["id"] = str(quiz["_id"])
        del quiz["_id"]

        for question in quiz.get("questions", []):
            question.pop("correct_answer", None)

    return {
        "count": len(quizzes),
        "quizzes": quizzes
    }


# --------------------------------
# GET SINGLE QUIZ
# --------------------------------

@router.get("/{quiz_id}")
def get_quiz(quiz_id: str):

    try:
        quiz = db.quizzes.find_one({
            "_id": ObjectId(quiz_id)
        })
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid quiz ID"
        )

    if not quiz:
        raise HTTPException(
            status_code=404,
            detail="Quiz not found"
        )

    quiz["id"] = str(quiz["_id"])
    del quiz["_id"]

    for question in quiz.get("questions", []):
        question.pop("correct_answer", None)

    return quiz


# --------------------------------
# SUBMIT QUIZ
# --------------------------------

@router.post("/{quiz_id}/submit")
def submit_quiz(
    quiz_id: str,
    submission: QuizSubmission,
    current_user=Depends(get_current_user)
):

    # Find quiz
    try:
        quiz = db.quizzes.find_one({
            "_id": ObjectId(quiz_id)
        })
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid quiz ID"
        )

    if not quiz:
        raise HTTPException(
            status_code=404,
            detail="Quiz not found"
        )

    questions = quiz.get("questions", [])
    answers = submission.answers

    # Make sure answer count matches question count
    if len(answers) != len(questions):
        raise HTTPException(
            status_code=400,
            detail=f"Please provide exactly {len(questions)} answers"
        )

    # Calculate score
    score = 0

    for index, question in enumerate(questions):

        if answers[index] == question["correct_answer"]:
            score += 1

    total = len(questions)

    percentage = round(
        (score / total) * 100
    ) if total > 0 else 0

    # Feedback
    if percentage >= 80:
        message = "Excellent! You are well prepared."
    elif percentage >= 60:
        message = "Good job! Keep improving your preparedness."
    elif percentage >= 40:
        message = "You need more practice."
    else:
        message = "Keep learning and try the quiz again."

    # Save result
    result = {
        "student_id": current_user["_id"],
        "quiz_id": quiz["_id"],
        "quiz_title": quiz["title"],
        "disaster": quiz["disaster"],
        "score": score,
        "total": total,
        "percentage": percentage,
        "completed_at": datetime.now(timezone.utc)
    }

    db.quiz_results.insert_one(result)

    return {
        "message": "Quiz submitted successfully",
        "quiz": quiz["title"],
        "score": score,
        "total": total,
        "percentage": percentage,
        "feedback": message
    }