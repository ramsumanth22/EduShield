# EduShield Phase 1 — Authentication

This version adds secure Student/Staff role-based authentication.

## 1. Backend environment

Copy `backend/.env.example` to `backend/.env` and fill in:

- `MONGODB_URI`
- `DATABASE_NAME=edushield`
- `JWT_SECRET` — use a long random secret
- `STAFF_REGISTRATION_CODE` — private code for staff registration

Do not commit `backend/.env` to Git.

## 2. Install backend packages

From the `backend` folder:

```bash
python -m venv venv
venv\\Scripts\\activate
pip install fastapi uvicorn pymongo python-dotenv bcrypt PyJWT email-validator
```

## 3. Start FastAPI

```bash
uvicorn main:app --reload
```

Open `https://edushield-7uac.onrender.com/docs` to test the API.

## 4. Start the frontend

Open the `edushield-custom` folder using VS Code Live Server (recommended), rather than opening `index.html` directly with `file://`.

## 5. Test order

1. Register a Student.
2. Log in as Student.
3. Logout.
4. Register a Staff account using `STAFF_REGISTRATION_CODE`.
5. Log in as Staff.
6. Confirm a Student cannot log in through the Staff tab and a Staff account cannot log in through the Student tab.
