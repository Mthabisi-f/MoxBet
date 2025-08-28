import asyncio
import json
import redis.asyncio as aioredis

redis_client = aioredis.Redis(host="127.0.0.1", port=6379, db=1, decode_responses=True)

async def check_cache():
    keys = await redis_client.keys("match:*")
    print("Match keys:", keys)
    for k in keys:
        v = await redis_client.get(k)
        print(k, json.loads(v) if v else None)

asyncio.run(check_cache())
