# EduShield Phase 5 — Student Dashboard Upgrade

This phase builds on the working Phase 4 project.

## Added
- Student achievements and badge panel
- Recent quiz results panel
- Preparedness map across all 8 disasters
- Student leaderboard preview
- Full student leaderboard backed by MongoDB
- Student rank, points and percentile
- Lightweight animated visuals retained; no background video

## New API
`GET /api/student/ranking` — authenticated student leaderboard and rank.

## Run backend
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload
```

Use the existing working `.env`. Do not run the quiz seed again if the database already contains the 8 quizzes.
