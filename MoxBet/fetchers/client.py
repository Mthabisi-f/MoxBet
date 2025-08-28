import os
import httpx
from contextlib import asynccontextmanager

# api key 
API_KEY = os.environ.get('APISPORTS_KEY')

def _headers():
    return {
        "x-rapidapi-key": API_KEY,
        "x-rapidapi-host": "",   # set per-request
    }

@asynccontextmanager
async def api_client():
    async with httpx.AsyncClient(timeout=30.0) as client:
        yield client

async def get(client, host, path, params=None):
    headers = _headers()
    headers["x-rapidapi-host"] = host
    url = f"https://{host}/{path.lstrip('/')}"
    try:
        resp = await client.get(url, headers=headers, params=params or {})
        resp.raise_for_status()
        data = resp.json()
        return data
    except Exception as e:
        print(f"Unexpected error occered: {e}")
    return {"response": []}

