import os
import time
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from openai import OpenAI

load_dotenv()
api_key = os.getenv("NVIDIA_API_KEY") or os.getenv("NVIDIA_API_KEYS", "").split(",")[0].strip()
client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=api_key)

models_to_test = [
    "meta/llama-3.1-8b-instruct",
    "meta/llama-3.1-70b-instruct",
    "meta/llama-3.2-3b-instruct",
    "meta/llama-3.2-1b-instruct",
    "meta/llama-3.2-11b-vision-instruct",
    "mistralai/mistral-large-2-instruct",
    "mistralai/codestral-22b-instruct-v0.1",
    "mistralai/mixtral-8x22b-v0.1",
    "nvidia/llama-3.1-nemotron-70b-instruct",
    "nvidia/llama-3.1-nemotron-51b-instruct",
    "nvidia/llama-3.1-nemotron-nano-8b-v1",
    "deepseek-ai/deepseek-v4-flash-0731",
    "deepseek-ai/deepseek-coder-6.7b-instruct",
    "google/gemma-3-12b-it",
    "google/gemma-3-4b-it",
    "google/codegemma-7b",
    "ibm/granite-3.0-8b-instruct",
    "ibm/granite-8b-code-instruct",
    "writer/palmyra-creative-122b"
]

results = {}

for model in models_to_test:
    t0 = time.time()
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Di 'OK'"}],
            max_tokens=10,
            temperature=0.2,
            stream=False,
            timeout=8.0
        )
        ans = completion.choices[0].message.content.strip()
        elapsed = time.time() - t0
        print(f"[OK] {model} -> {elapsed:.2f}s: {ans}", flush=True)
        results[model] = {"status": "OK", "time": elapsed}
    except Exception as e:
        elapsed = time.time() - t0
        print(f"[FAIL] {model} ({elapsed:.2f}s): {e}", flush=True)
        results[model] = {"status": "FAIL", "error": str(e)}

print("\n--- RESUMEN MODELOS DISPONIBLES ---", flush=True)
for m, r in results.items():
    if r["status"] == "OK":
        print(f"  + {m} ({r['time']:.2f}s)", flush=True)
