import os
from pathlib import Path
import redis.asyncio as aioredis
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# -------------------------------
# Lazy global Redis client
# -------------------------------
class RedisClient:
    _client = None

    @classmethod
    def get(cls):
        if cls._client is None:
            cls._client = aioredis.Redis(
                host=os.environ.get("REDIS_HOST", "127.0.0.1"),
                port=int(os.environ.get("REDIS_PORT", 6379)),
                db=int(os.environ.get("REDIS_DB", 1)),
                decode_responses=True
            )
        return cls._client

    @classmethod
    async def close(cls):
        if cls._client:
            await cls._client.close()
            await cls._client.connection_pool.disconnect()
            cls._client = None

# Global variable you can keep using
redis_client = RedisClient.get()


# import os
# from pathlib import Path
# import redis.asyncio as aioredis
# from dotenv import load_dotenv

# BASE_DIR = Path(__file__).resolve().parent.parent
# load_dotenv(BASE_DIR / ".env")

# # -------------------------------
# # Global Redis client
# # -------------------------------
# redis_client = aioredis.Redis(
#     host=os.environ.get("REDIS_HOST", "127.0.0.1"),
#     port=int(os.environ.get("REDIS_PORT", 6379)),
#     db=int(os.environ.get("REDIS_DB", 1)),
#     decode_responses=True
# )
