import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DEBUG = os.getenv('FLASK_DEBUG', False)
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/nyc_taxi')
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    CHUNK_SIZE = 100000
