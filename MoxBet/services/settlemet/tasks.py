import os
import asyncio
import json
from MoxBet.redis_client import redis_client


# @shared_task
async def get_finished_fixtures():
    finished_keys = await redis_client.keys("finished:*")  # Get all finished match keys
    matches = []

    # async def fetch_match(k):
    #     try:
    #         # Only fetch keys that are string type
    #         key_type = await redis_client.type(k)
    #         if key_type != "string":
    #             print(f"[REDIS] Skipping key {k}: type is {key_type}")
    #             return None

    #         value = await redis_client.get(k)
    #         if value:
    #             return json.loads(value)
    #     except Exception as e:
    #         print(f"[REDIS] Error fetching key {k}: {e}")
    #     return None

    key_list = list(finished_keys)

    async def fetch_match(k):
        try:
            value = await redis_client.get(k)
            return json.loads(value) if value else None
        except Exception as e:
            print(f"Error fetching key {k}: {e}")
        return None


    tasks = [fetch_match(k) for k in key_list]
    results = await asyncio.gather(*tasks)
    matches = [m for m in results if m]
    return matches
