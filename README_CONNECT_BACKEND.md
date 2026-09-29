# EduShield — Frontend + FastAPI Connection

The frontend is now wired to the existing FastAPI backend without changing the HTML/CSS design.

## What is connected

- Login → `POST /api/auth/login`
- Registration → `POST /api/auth/register`
- JWT token → saved as `edushield_token`
- Page refresh → restores the logged-in session
- Student dashboard → `GET /api/student/dashboard`
- Student results → `GET /api/student/results`
- Quiz list → `GET /api/quizzes/`
- Quiz submission → `POST /api/quizzes/{quiz_id}/submit`
- MongoDB scores are displayed on the disaster cards after refresh
- Backend preparedness score is displayed as **Total Campus Preparedness Score**

## Important fix

The frontend disaster IDs (for example `earthquake`, `fire`, `flood`) are not MongoDB quiz IDs. The updated frontend gets the real quiz IDs from `GET /api/quizzes/`, then submits answers to the matching backend quiz.

It also uses the backend question count for Earthquake, Fire, and Flood so the submitted `answers` array matches MongoDB exactly.

## Run the backend

Open PowerShell in:

`backend`

Then run:

```powershell
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

Expected:

`Uvicorn running on https://edushield-7uac.onrender.com`

## Run the frontend

Do **not** open `index.html` directly with `file://`.

Open another PowerShell in:

`edushield-custom`

Run:

```powershell
python -m http.server 5500
```

Then open:

`http://127.0.0.1:5500`

## Test sequence

1. Register a new student.
2. Log in.
3. Confirm the dashboard loads from the backend.
4. Open Earthquake.
5. Answer all questions.
6. Finish the quiz.
7. Confirm the quiz result is saved in MongoDB.
8. Return to the dashboard.
9. Confirm the Earthquake card shows the backend score.
10. Refresh the browser and confirm the login session and score remain available.

## Backend data already expected

The current MongoDB seed data contains:

- Earthquake Safety
- Fire Safety
- Flood Safety

Cyclone, Lightning, and Chemical/Gas Leak have frontend 3D content, but the current backend seed data does not contain quizzes for all of those modules. They will show their 3D content, but a backend quiz must be added before their results can be stored.

## Environment file

Keep your existing `backend/.env` file locally. The downloadable updated project intentionally does not include the real `.env` credentials.

Use this structure:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
DATABASE_NAME=edushield
JWT_SECRET=your_long_random_secret
```
