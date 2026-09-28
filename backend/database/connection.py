import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "edushield")

client = MongoClient(MONGODB_URI)

db = client[DATABASE_NAME]


def test_database_connection():
    try:
        client.admin.command("ping")
        return True
    except Exception as e:
        print("MongoDB connection error:", e)
        return False