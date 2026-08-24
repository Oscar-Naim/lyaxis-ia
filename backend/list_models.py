import os
import requests
from dotenv import load_dotenv

load_dotenv()

nvidia_key = os.environ.get("NVIDIA_API_KEY")
if not nvidia_key:
    print("Error: NVIDIA_API_KEY no encontrada en .env")
    exit(1)

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
        print(f"\nTotal: {len(models)} modelos disponibles en tu cuenta.")
    else:
        print(f"Error {r.status_code}: {r.text}")
except Exception as e:
    print(f"Error consultando NVIDIA NIM: {e}")
