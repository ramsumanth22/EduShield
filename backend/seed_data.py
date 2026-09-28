from database.connection import db


disasters = [
    {
        "name": "Earthquake",
        "description": "Learn what to do before, during, and after an earthquake.",
        "severity": "high"
    },
    {
        "name": "Fire",
        "description": "Learn fire prevention, evacuation, and emergency response.",
        "severity": "high"
    },
    {
        "name": "Flood",
        "description": "Learn how to stay safe before and during flooding.",
        "severity": "high"
    },
    {
        "name": "Cyclone",
        "description": "Learn how to prepare for strong winds, heavy rain, and cyclones.",
        "severity": "high"
    },
    {
        "name": "Lightning",
        "description": "Learn how to stay safe during thunderstorms and lightning.",
        "severity": "medium"
    }
]


existing_count = db.disasters.count_documents({})

if existing_count == 0:
    db.disasters.insert_many(disasters)
    print("Disaster data inserted successfully!")
else:
    print("Disaster data already exists.")