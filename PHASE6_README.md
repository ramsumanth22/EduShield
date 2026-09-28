# EduShield Phase 6 — Emergency Preparedness Center

Built on the confirmed working Phase 5 project.

## Added
- Persistent emergency-kit checklist per authenticated student in MongoDB.
- Student preparedness drill/event feed.
- Emergency contacts panel.
- Safe-zone / evacuation reminder panel.
- Mobile responsive Phase 6 styling.
- Existing authentication, quizzes, rankings, staff analytics and MongoDB data are preserved.

## New APIs
- `GET /api/student/emergency-kit`
- `PUT /api/student/emergency-kit`
- `GET /api/student/drills`

## Important
Do not run the quiz seed script again if the database already contains the 8 quizzes.
Keep your existing working `backend/.env`.
