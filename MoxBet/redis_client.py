import redis.asyncio as aioredis

# Global Redis client
redis_client = aioredis.Redis(host="127.0.0.1", port=6379, db=1, decode_responses=True)

