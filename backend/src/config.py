import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

class Config:
    DEBUG = os.getenv('FLASK_DEBUG', False)

    # SQLite by default (fast setup), PostgreSQL if DATABASE_URL env var set
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        DATABASE_URL = db_url
    else:
        db_path = Path(__file__).parent.parent.parent / 'nyc_taxi.db'
        DATABASE_URL = str(db_path)

    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    CHUNK_SIZE = 100000
