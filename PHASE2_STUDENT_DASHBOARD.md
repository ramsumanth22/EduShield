# EduShield Phase 2 — Student Dashboard

This phase upgrades the student experience while preserving the Phase 1 FastAPI/MongoDB authentication.

## Included
- Modern student dashboard inspired by the supplied design.
- Preparedness score, quiz count, average score and completed disaster stats.
- Natural and human-induced disaster module grids.
- Quick access: Safety Audit, Emergency Contacts, Emergency Kit and Rankings.
- Learning progress panel and daily safety tip.
- Interactive Emergency Kit checklist stored locally in the browser.
- Student points screen (leaderboard API connection is planned for the staff/ranking phase).
- Lightweight animated disaster-world hero instead of a full-screen background video.
- Heavy background video files removed from the project.
- Existing disaster learning, quiz and 3D explore screens retained.

## Run
From `backend`:

```powershell
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

Open the frontend through VS Code Live Server (not `file://`).

## Notes
- Keep your own `backend/.env`; only `.env.example` is shipped.
- Do not commit MongoDB credentials or JWT secrets.
- Phase 2 ranking screen is intentionally a lightweight frontend step; real leaderboard aggregation will be connected in the next phase.
