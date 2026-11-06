import asyncio
import json
import sqlite3
import sys
import uuid
import httpx

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from main import (
    DB_PATH,
    app,
    db,
    detect_incomplete_query,
    get_dynamic_token_budget,
    _clean_history_text,
    sign_user_token,
)

PDF_ORIGINAL_PROMPT = (
    "Optimiza la siguiente función en Python para que pase de una complejidad temporal de "
    "O(N^2) a O(N log N) o O(N). Explica paso a paso la estructura de datos que elegiste "
    "para lograr la mejora y cómo manejas los casos de desbordamiento en memoria: "
    "[Pega aquí tu código pesado o describe un problema de búsqueda/ordenamiento]."
)


def test_unit_governance_rules():
    print("=== [1/4] Verificando Reglas Unitarias y Matriz Maestra de los 9 Motores ===")

    # 1. Detección de placeholders y plantillas vacías
    assert detect_incomplete_query(PDF_ORIGINAL_PROMPT) is True, "Fallo detectando el prompt original del PDF"
    assert detect_incomplete_query("Analiza este fragmento: <tu código aquí>") is True
    assert detect_incomplete_query("Optimiza la siguiente función en Python:") is True
    assert detect_incomplete_query("Optimiza este código:", has_image=True) is False, "Con imagen activa no debe bloquear"

    # Protección contra falsos positivos en código real
    real_code_prompt = (
        "Optimiza esta función:\n```python\ndef buscar(items, codigo):\n"
        "    return [x[codigo] for x in items]\n```"
    )
    assert detect_incomplete_query(real_code_prompt) is False, "Falso positivo en código real con [codigo]"

    # 2. Presupuesto Pre-Vuelo determinista (max_tokens=120, temp=0.0) en todos los motores
    all_models = ["speed", "classic", "cortex", "root", "zenith", "phantom", "architect", "nexus", "forge", "magister"]
    for m in all_models:
        max_tok, temp_ov, is_brief = get_dynamic_token_budget(m, PDF_ORIGINAL_PROMPT, has_image=False)
        assert max_tok == 120 and temp_ov == 0.0 and is_brief is False, f"Fallo pre-vuelo en {m}: {(max_tok, temp_ov, is_brief)}"

    # 3. Reasoning Headroom en preguntas breves para Cortex (1000) y Root (1200) vs breves estándar
    brief_q = "¿Cuál es la diferencia entre un stack y una queue?"
    expected_brief = {
        "speed": 180,
        "classic": 180,
        "cortex": 1000,
        "root": 1200,
        "zenith": 350,
        "phantom": 200,
        "architect": 250,
        "nexus": 200,
        "forge": 200,
        "magister": 250,
    }
    for m, exp in expected_brief.items():
        max_tok, temp_ov, is_brief = get_dynamic_token_budget(m, brief_q, has_image=False)
        assert max_tok == exp and temp_ov is None and is_brief is True, f"Fallo límite breve en {m}: esperado {exp}, obtenido {max_tok}"

    # 4. Techos estándar de producción de la Matriz Maestra
    expected_standard = {
        "speed": 1200,
        "classic": 1200,
        "cortex": 2400,
        "zenith": 3200,
        "phantom": 1600,
        "architect": 2200,
        "nexus": 1500,
        "forge": 1800,
        "magister": 2200,
        "root": 3500,
    }
    for m, exp in expected_standard.items():
        max_tok, temp_ov, is_brief = get_dynamic_token_budget(m, real_code_prompt, has_image=False)
        assert max_tok == exp and temp_ov is None and is_brief is False, f"Fallo techo estándar en {m}: esperado {exp}, obtenido {max_tok}"

    # 5. Limpieza de historial (<thought> y condensación de bloques largos de código antiguo)
    dirty_hist = "<thought>Razonamiento interno largo</thought>\nAquí tienes:\n```python\n" + ("\n".join([f"x_{i} = {i}" for i in range(40)])) + "\n```"
    cleaned = _clean_history_text(dirty_hist, max_chars=900, condense_code=True)
    assert "<thought>" not in cleaned
    assert "[bloque previo condensado]" in cleaned

    # 6. Verificación de columnas de telemetría en SQLite
    with sqlite3.connect(DB_PATH) as conn:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(messages)").fetchall()}
        for required_col in ("prompt_tokens", "completion_tokens", "total_tokens", "model_used"):
            assert required_col in cols, f"Columna faltante en SQLite messages: {required_col}"

    print("  [OK] Todas las aserciones unitarias, Matriz Maestra y esquema SQLite superadas.")


async def _consume_sse(client: httpx.AsyncClient, payload: dict) -> tuple[str, dict]:
    resp = await client.post("/api/v1/chat/stream", json=payload, timeout=45.0)
    assert resp.status_code == 200, f"HTTP {resp.status_code}: {resp.text}"
    full_text = ""
    usage = {}
    for line in resp.text.splitlines():
        line = line.strip()
        if line.startswith("data: "):
            data = json.loads(line[6:])
            if data.get("token"):
                full_text += data["token"]
            if data.get("usage"):
                usage = data["usage"]
    return full_text.strip(), usage


async def run_live_tests():
    db.execute("DELETE FROM prompt_cache WHERE response LIKE '%QuickSort%' OR response LIKE '%<thought>%'")
    test_uid = f"test-gov-{uuid.uuid4().hex[:8]}"
    test_token = sign_user_token(test_uid)
    auth_headers = {"Authorization": f"Bearer {test_token}"}
    created_convs = []
    transport = httpx.ASGITransport(app=app)

    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver", headers=auth_headers) as client:
            print("\n=== [2/4] Test en Vivo 1: Interceptor Pre-Vuelo (Prompt del PDF en Speed, Cortex y Zenith) ===")
            for motor in ("speed", "cortex", "zenith"):
                cid = f"conv-preflight-{motor}-{uuid.uuid4().hex[:6]}"
                created_convs.append(cid)
                text, usage = await _consume_sse(
                    client,
                    {
                        "conversation_id": cid,
                        "user_id": test_uid,
                        "model": motor,
                        "messages": [{"role": "user", "content": PDF_ORIGINAL_PROMPT}],
                    },
                )
                comp_tokens = int(usage.get("completion_tokens") or 0)
                print(f"  -> [{motor.upper()}] completion_tokens={comp_tokens} | model_used={usage.get('model_used')}")
                print(f"     Respuesta: {text}")
                assert len(text) > 10, f"Respuesta vacía en {motor}"
                assert "```" not in text, f"{motor} inventó bloques de código ante plantilla vacía"
                assert comp_tokens < 90, f"{motor} excedió presupuesto pre-vuelo: {comp_tokens} tokens"

            print("\n=== [3/4] Test en Vivo 2: Reasoning Headroom en Cortex y Root (Pregunta Breve) ===")
            short_algo_q = "¿Por qué QuickSort es O(N log N) promedio pero O(N^2) peor caso?"
            for motor in ("cortex", "root"):
                cid = f"conv-reasoning-{motor}-{uuid.uuid4().hex[:6]}"
                created_convs.append(cid)
                text, usage = await _consume_sse(
                    client,
                    {
                        "conversation_id": cid,
                        "user_id": test_uid,
                        "model": motor,
                        "messages": [{"role": "user", "content": short_algo_q}],
                    },
                )
                comp_tokens = int(usage.get("completion_tokens") or 0)
                has_unclosed_thought = ("<thought>" in text.lower()) and ("</thought>" not in text.lower())
                visible_after_thought = text.split("</thought>")[-1].strip() if "</thought>" in text else text.strip()
                print(f"  -> [{motor.upper()}] completion_tokens={comp_tokens} | visible_chars={len(visible_after_thought)} | model_used={usage.get('model_used')}")
                assert not has_unclosed_thought, f"{motor} truncó el bloque <thought> sin cerrarlo"
                assert len(visible_after_thought) > 30, f"{motor} no emitió respuesta visible tras el pensamiento"

            print("\n=== [4/4] Test en Vivo 3: Techo Estándar Speed con Código Real + Telemetría DB ===")
            cid_real = f"conv-real-speed-{uuid.uuid4().hex[:6]}"
            created_convs.append(cid_real)
            real_opt_q = (
                "Optimiza esta función O(N^2) a O(N) en Python:\n"
                "```python\n"
                "def tiene_duplicados(nums):\n"
                "    for i in range(len(nums)):\n"
                "        for j in range(i + 1, len(nums)):\n"
                "            if nums[i] == nums[j]:\n"
                "                return True\n"
                "    return False\n"
                "```"
            )
            text_real, usage_real = await _consume_sse(
                client,
                {
                    "conversation_id": cid_real,
                    "user_id": test_uid,
                    "model": "speed",
                    "messages": [{"role": "user", "content": real_opt_q}],
                },
            )
            comp_real = int(usage_real.get("completion_tokens") or 0)
            print(f"  -> [SPEED REAL] completion_tokens={comp_real} (techo 1200) | model_used={usage_real.get('model_used')}")
            assert "set" in text_real.lower(), "Speed no entregó la optimización con set"
            assert 0 < comp_real <= 1200, f"Speed fuera de rango: {comp_real}"

            # Verificar persistencia en DB y endpoint /api/v1/telemetry
            msgs_resp = await client.get(f"/api/v1/conversations/{cid_real}/messages", params={"user_id": test_uid})
            assert msgs_resp.status_code == 200
            saved_msgs = msgs_resp.json()
            model_msgs = [m for m in saved_msgs if m.get("role") == "model"]
            assert len(model_msgs) == 1, "No se persistió el mensaje del asistente"
            assert int(model_msgs[0].get("total_tokens") or 0) > 0, f"total_tokens no persistido: {model_msgs[0]}"
            assert model_msgs[0].get("model_used"), f"model_used no persistido: {model_msgs[0]}"

            tel_resp = await client.get("/api/v1/telemetry", params={"user_id": test_uid})
            assert tel_resp.status_code == 200
            tel_stats = tel_resp.json().get("userStats", {})
            print(f"  -> [TELEMETRÍA DB] promptTokens={tel_stats.get('promptTokens')}, completionTokens={tel_stats.get('completionTokens')}, totalTokens={tel_stats.get('totalTokens')}")
            assert int(tel_stats.get("totalTokens") or 0) > 0, "Telemetría acumulada en 0"

    finally:
        # Limpiar datos temporales de prueba en DB y caché de pruebas
        for cid in created_convs:
            db.execute("DELETE FROM messages WHERE conversation_id = ?", (cid,))
            db.execute("DELETE FROM conversations WHERE id = ?", (cid,))
        db.execute("DELETE FROM prompt_cache WHERE response LIKE '%QuickSort%' OR response LIKE '%tiene_duplicados%'")


if __name__ == "__main__":
    test_unit_governance_rules()
    asyncio.run(run_live_tests())
    print("\n✅ SUITE DE GOBERNANZA DE TOKENS SUPERADA AL 100%.")
