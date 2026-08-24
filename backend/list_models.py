import os
import requests
from dotenv import load_dotenv

load_dotenv()

nvidia_key = os.environ.get("NVIDIA_API_KEY")
if nvidia_key:
    print("=== MODELOS DISPONIBLES EN NVIDIA NIM ===")
    try:
        r = requests.get(
            "https://integrate.api.nvidia.com/v1/models",
            headers={"Authorization": f"Bearer {nvidia_key.split(',')[0].strip()}"},
            timeout=10
        )
        if r.status_code == 200:
            models = [m["id"] for m in r.json().get("data", [])]
            for m in sorted(models):
                print(f"  - {m}")
        else:
            print(f"Error {r.status_code}: {r.text}")
    except Exception as e:
        print(f"Error consultando NVIDIA: {e}")

gemini_key = os.environ.get("GEMINI_API_KEY")
if gemini_key:
    print("\n=== MODELOS GEMINI (FALLBACK) ===")
    try:
        from google import genai
        client = genai.Client(api_key=gemini_key.split(',')[0].strip())
        models = client.models.list()
        for m in models:
            print(f"  - {m.name}")
    except Exception as e:
        print(f"Error consultando Gemini: {e}")
