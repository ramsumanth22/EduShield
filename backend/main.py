from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import test_database_connection
from routes.auth import router as auth_router
from routes.student import router as student_router
from routes.disaster import router as disaster_router
from routes.quiz import router as quiz_router
from routes.staff import router as staff_router

app = FastAPI(
    title="EduShield API",
    description="Disaster Preparedness Platform for Schools and Colleges",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Authentication routes
app.include_router(auth_router)

# Student routes
app.include_router(student_router)

app.include_router(disaster_router)

app.include_router(quiz_router)
app.include_router(staff_router)

@app.get("/")
def root():
    return {
        "message": "EduShield Backend is running!",
        "status": "success"
    }


@app.get("/api/health")
def health_check():

    database_status = test_database_connection()

    return {
        "status": "healthy",
        "service": "EduShield Backend",
        "database": "connected" if database_status else "not connected"
    }