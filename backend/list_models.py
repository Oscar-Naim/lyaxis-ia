import os
from dotenv import load_dotenv
load_dotenv()

from google import genai

key = os.environ.get('GEMINI_API_KEY')
if not key:
    print("NO API KEY")
    exit(1)
try:
    client = genai.Client(api_key=key.split(',')[0].strip())
    models = client.models.list()
    for m in models:
        print(m.name)
except Exception as e:
    print(e)
