import os
import asyncio
import json
from MoxBet.redis_client import redis_client



loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)

def get_finished_fixtures_sync():
    return loop.run_until_complete(get_finished_fixtures_async())

# async version
async def get_finished_fixtures_async():
    finished_keys = await redis_client.keys("finished:*")
    sem = asyncio.Semaphore(50)

    async def fetch_match(k):
        async with sem:
            try:
                value = await redis_client.get(k)
                return json.loads(value) if value else None
            except Exception as e:
                print(f"Error fetching key {k}: {e}")
            return None

    tasks = [fetch_match(k) for k in finished_keys]
    results = await asyncio.gather(*tasks)
    return [m for m in results if m]


# @shared_task
# def get_finished_fixtures_sync():
#     return asyncio.run(get_finished_fixtures_async())

# async def get_finished_fixtures_async():
#     finished_keys = await redis_client.keys("finished:*")
#     matches = []

#     sem = asyncio.Semaphore(50)

#     async def fetch_match(k):
#         async with sem:
#             try:
#                 value = await redis_client.get(k)
#                 return json.loads(value) if value else None
#             except Exception as e:
#                 print(f"Error fetching key {k}: {e}")
#             return None

#     tasks = [fetch_match(k) for k in finished_keys]
#     results = await asyncio.gather(*tasks)
#     matches = [m for m in results if m]
#     return matches
