import os
from pathlib import Path
import redis.asyncio as aioredis
import environ
from dotenv import load_dotenv

# -------------------------------
# Load environment variables
# -------------------------------
# BASE_DIR = Path(__file__).resolve().parent.parent
# env = environ.Env()
# environ.Env.read_env(os.path.join(BASE_DIR, ".env"))
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# -------------------------------
# Global Redis client
# -------------------------------
redis_client = aioredis.Redis(
    host=os.environ.get("REDIS_HOST", "127.0.0.1"),
    port=int(os.environ.get("REDIS_PORT", 6379)),
    db=int(os.environ.get("REDIS_DB", 1)),
    decode_responses=True
)
