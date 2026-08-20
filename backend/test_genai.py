import os
from google import genai
from google.genai import types
import asyncio

async def test():
    key = os.environ.get('GEMINI_API_KEY')
    if not key:
        print("Set GEMINI_API_KEY")
        return
    client = genai.Client(api_key=key)
    
    # Try passing dicts (the old way that failed)
    contents_dicts = [{"role": "user", "parts": [{"text": "Hello"}]}]
    try:
        res = await client.aio.models.generate_content_stream(
            model="gemini-1.5-flash",
            contents=contents_dicts,
            config={"temperature": 0.7}
        )
        async for chunk in res:
            pass
        print("Dicts worked")
    except Exception as e:
        print(f"Dicts failed: {e}")
        
    # Try passing types.Content (the new way)
    contents_types = [types.Content(role="user", parts=[types.Part.from_text(text="Hello")])]
    try:
        res = await client.aio.models.generate_content_stream(
            model="gemini-1.5-flash",
            contents=contents_types,
            config={"temperature": 0.7}
        )
        async for chunk in res:
            pass
        print("Types worked")
    except Exception as e:
        print(f"Types failed: {e}")

if __name__ == "__main__":
    asyncio.run(test())
