import os
from dotenv import load_dotenv
load_dotenv()

from google import genai
from google.genai import types
import asyncio

async def test():
    key = os.environ.get('GEMINI_API_KEY')
    if not key:
        print("Set GEMINI_API_KEY")
        return
    client = genai.Client(api_key=key.split(',')[0].strip())
    
    # Using types.Content with config dict that has a string for system_instruction
    contents_types = [types.Content(role="user", parts=[types.Part.from_text(text="Hello")])]
    
    print("Test 1: Config as dict with string system_instruction")
    try:
        res = await client.aio.models.generate_content_stream(
            model="gemini-3.6-flash",
            contents=contents_types,
            config={
                "system_instruction": "You are a helpful assistant.",
                "temperature": 0.7
            }
        )
        async for chunk in res:
            pass
        print("Test 1 worked")
    except Exception as e:
        print(f"Test 1 failed: {e}")

    print("\nTest 2: Config as types.GenerateContentConfig")
    try:
        res = await client.aio.models.generate_content_stream(
            model="gemini-3.6-flash",
            contents=contents_types,
            config=types.GenerateContentConfig(
                system_instruction="You are a helpful assistant.",
                temperature=0.7
            )
        )
        async for chunk in res:
            pass
        print("Test 2 worked")
    except Exception as e:
        print(f"Test 2 failed: {e}")

    print("\nTest 3: Using old dict contents and old dict config")
    try:
        res = await client.aio.models.generate_content_stream(
            model="gemini-3.6-flash",
            contents=[{"role": "user", "parts": [{"text": "Hello"}]}],
            config={
                "system_instruction": "You are a helpful assistant.",
                "temperature": 0.7
            }
        )
        async for chunk in res:
            pass
        print("Test 3 worked")
    except Exception as e:
        print(f"Test 3 failed: {e}")

if __name__ == "__main__":
    asyncio.run(test())
