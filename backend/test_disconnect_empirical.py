import asyncio
import json
import os
import sys
import uuid
from unittest.mock import AsyncMock, patch

# Ensure utf-8 stdout
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import (
    ChatMessage,
    _get_prompt_cache,
    _set_prompt_cache,
    _mem_prompt_cache,
    db,
    generate_ai_stream,
)
from starlette.requests import Request


class MockASGIConnection:
    """Simulates an ASGI HTTP connection with controllable disconnect events."""
    def __init__(self):
        self.queue = asyncio.Queue()
        self.queue.put_nowait({"type": "http.request", "body": b"{}", "more_body": False})

    async def receive(self):
        return await self.queue.get()

    def disconnect_client(self):
        self.queue.put_nowait({"type": "http.disconnect"})

    def make_request(self) -> Request:
        scope = {
            "type": "http",
            "method": "POST",
            "path": "/api/v1/chat/stream",
            "headers": [],
        }
        return Request(scope, self.receive)


class MockChunkChoiceDelta:
    def __init__(self, content):
        self.content = content

class MockChunkChoice:
    def __init__(self, content):
        self.delta = MockChunkChoiceDelta(content)

class MockChunk:
    def __init__(self, content, usage=None):
        self.choices = [MockChunkChoice(content)] if content is not None else []
        self.usage = usage


class MockStream:
    """Mock provider stream that yields tokens with delays and tracks closure."""
    def __init__(self, tokens, delay=0.03):
        self.tokens = list(tokens)
        self.delay = delay
        self.closed = False

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.closed or not self.tokens:
            raise StopAsyncIteration
        await asyncio.sleep(self.delay)
        tok = self.tokens.pop(0)
        return MockChunk(tok)

    async def close(self):
        self.closed = True


async def test_monomodel_disconnect_and_cache_integrity():
    print("\n======================================================================")
    print("TEST 1: Monomodel Stream Disconnect & Prompt Cache Integrity")
    print("======================================================================")

    # Clean cache
    _mem_prompt_cache.clear()
    test_query = f"¿Cómo optimizar algoritmos recursivos en python? {uuid.uuid4().hex[:6]}"
    model_key = "speed"

    conn = MockASGIConnection()
    req = conn.make_request()

    # Create tokens that exceed 40 characters so _set_prompt_cache would accept it if called
    chunk1 = "Para optimizar un algoritmo recursivo en Python "  # 47 chars
    chunk2 = "puedes utilizar memoización con @functools.lru_cache. "
    chunk3 = "Esto reduce la complejidad de O(2^N) a O(N)."
    chunk4 = " Además, puedes convertirlo a iterativo."

    mock_stream = MockStream([chunk1, chunk2, chunk3, chunk4], delay=0.03)

    tokens_received = []
    lines_yielded = []

    with patch("main.client_nvidia.chat.completions.create", AsyncMock(return_value=mock_stream)), \
         patch("main.client_groq.chat.completions.create", AsyncMock(return_value=mock_stream)), \
         patch("main.client_gemini.chat.completions.create", AsyncMock(return_value=mock_stream)), \
         patch("main.client_openrouter.chat.completions.create", AsyncMock(return_value=mock_stream)):

        gen = generate_ai_stream(
            conversation_id=None,
            user_id="test_user",
            messages=[ChatMessage(role="user", content=test_query)],
            temperature=0.3,
            model_type=model_key,
            triad_mode=False,
            request=req,
        )

        async for sse_line in gen:
            lines_yielded.append(sse_line)
            if sse_line.startswith("data: "):
                payload = json.loads(sse_line[6:].strip())
                if "token" in payload:
                    tokens_received.append(payload["token"])
                    print(f"  [Client received token chunk]: {payload['token'][:30]!r}...")
                    if len(tokens_received) == 1:
                        print("  --> SIMULATING CLIENT DISCONNECT after 1 token chunk (47 chars)...")
                        conn.disconnect_client()

    print(f"  [Stream ended]. Total chunks received by client: {len(tokens_received)}")
    print(f"  [Upstream stream closed cleanly]: {mock_stream.closed}")
    
    # Check lines yielded for done: true
    has_done = any('"done": true' in line.lower() for line in lines_yielded)
    print(f"  [Generator yielded 'done: true' to disconnected socket]: {has_done}")

    # Check prompt_cache
    cached = _get_prompt_cache(model_key, test_query)
    print(f"  [Prompt Cache entry in memory/DB]: {cached!r}")

    # EMPIRICAL EVALUATION
    results = {
        "stream_closed": mock_stream.closed,
        "tokens_received": len(tokens_received),
        "cache_polluted": cached is not None,
        "done_yielded_after_disconnect": has_done,
        "cached_value": cached,
    }

    if cached is not None:
        print("\n  ❌ DEFECT CONFIRMED: Truncated response was stored into prompt_cache!")
        print(f"     Polluted content: {cached!r}")
    else:
        print("\n  ✅ SUCCESS: prompt_cache was protected from truncated pollution.")

    if has_done:
        print("  ❌ DEFECT CONFIRMED: 'done: true' was yielded to dead client socket!")
    else:
        print("  ✅ SUCCESS: 'done: true' was suppressed after disconnect.")

    return results


async def test_triad_phase1_disconnect():
    print("\n======================================================================")
    print("TEST 2: TRIAD Phase 1 (CREATE/BREAK) Concurrent Disconnect & Cancellation")
    print("======================================================================")

    test_query = (
        "Diseña la arquitectura técnica de microservicios distribuida para un motor de pagos financieros "
        "con alta concurrencia usando Kafka, PostgreSQL con Debezium CDC y reconciliación Saga distribuida. "
        "Detalla puntos de falla, cuellos de botella de red y particionado de eventos."
    )
    conn = MockASGIConnection()
    req = conn.make_request()

    create_stream = MockStream([f"CreateChunk{i} " for i in range(10)], delay=0.03)
    break_stream = MockStream([f"BreakChunk{i} " for i in range(10)], delay=0.03)
    rebuild_stream = MockStream([f"RebuildChunk{i} " for i in range(10)], delay=0.03)

    def side_effect_dispatch(*args, **kwargs):
        msgs = kwargs.get("messages", [])
        sys_content = msgs[0].get("content", "") if msgs and isinstance(msgs[0], dict) else ""
        if "NÚCLEO III" in sys_content or "Cortex Pro" in sys_content:
            return rebuild_stream
        elif "NÚCLEO II" in sys_content or "Phantom" in sys_content:
            return break_stream
        elif "NÚCLEO I" in sys_content or "Speed" in sys_content:
            return create_stream

        model = kwargs.get("model", "")
        if "pro" in model or "max" in model or "lightning" in model or "120b" in model:
            return rebuild_stream
        elif "ultra" in model or "versatile" in model or "70b" in model or "haiku" in model:
            return break_stream
        elif "8b" in model or "bolt" in model or "flash" in model or "plus" in model:
            return create_stream
        else:
            return rebuild_stream

    with patch("main.client_nvidia.chat.completions.create", AsyncMock(side_effect=side_effect_dispatch)), \
         patch("main.client_groq.chat.completions.create", AsyncMock(side_effect=side_effect_dispatch)), \
         patch("main.client_gemini.chat.completions.create", AsyncMock(side_effect=side_effect_dispatch)), \
         patch("main.client_openrouter.chat.completions.create", AsyncMock(side_effect=side_effect_dispatch)):

        gen = generate_ai_stream(
            conversation_id=None,
            user_id="test_user",
            messages=[ChatMessage(role="user", content=test_query)],
            temperature=0.5,
            model_type="speed",
            triad_mode=True,
            request=req,
        )

        tokens_received = []
        lines_yielded = []

        async for sse_line in gen:
            lines_yielded.append(sse_line)
            if sse_line.startswith("data: "):
                payload = json.loads(sse_line[6:].strip())
                if "token" in payload:
                    tokens_received.append(payload["token"])
                    if len(tokens_received) == 2:
                        print(f"  --> SIMULATING CLIENT DISCONNECT during TRIAD Phase 1 (at token 2)...")
                        conn.disconnect_client()

    print(f"  [TRIAD ended]. Tokens received: {len(tokens_received)}")
    print(f"  [CREATE stream closed]: {create_stream.closed}")
    print(f"  [BREAK stream closed]: {break_stream.closed}")
    
    rebuild_executed = len(rebuild_stream.tokens) < 10
    print(f"  [Phase 2 REBUILD executed after disconnect]: {rebuild_executed}")

    has_done = any('"done": true' in line.lower() for line in lines_yielded)
    print(f"  [TRIAD yielded 'done: true' to disconnected socket]: {has_done}")

    results = {
        "create_closed": create_stream.closed,
        "break_closed": break_stream.closed,
        "rebuild_executed": rebuild_executed,
        "done_yielded": has_done,
    }

    if rebuild_executed:
        print("  ❌ DEFECT CONFIRMED: Phase 2 REBUILD ran despite client disconnect in Phase 1!")
    else:
        print("  ✅ SUCCESS: Phase 2 REBUILD was prevented.")

    if has_done:
        print("  ❌ DEFECT CONFIRMED: 'done: true' was yielded after disconnect in Phase 1!")
    else:
        print("  ✅ SUCCESS: 'done: true' was suppressed.")

    return results


async def test_triad_phase2_rebuild_disconnect():
    print("\n======================================================================")
    print("TEST 3: TRIAD Phase 2 (REBUILD) Disconnect")
    print("======================================================================")

    test_query = (
        "Diseña la arquitectura técnica de microservicios distribuida para un motor de pagos financieros "
        "con alta concurrencia usando Kafka, PostgreSQL con Debezium CDC y reconciliación Saga distribuida. "
        "Detalla puntos de falla, cuellos de botella de red y particionado de eventos."
    )
    conn = MockASGIConnection()
    req = conn.make_request()

    create_stream = MockStream(["C1 ", "C2 "], delay=0.01)
    break_stream = MockStream(["B1 ", "B2 "], delay=0.01)
    rebuild_stream = MockStream([f"RebuildChunk{i} " for i in range(10)], delay=0.03)

    def side_effect_dispatch(*args, **kwargs):
        msgs = kwargs.get("messages", [])
        sys_content = msgs[0].get("content", "") if msgs and isinstance(msgs[0], dict) else ""
        if "NÚCLEO III" in sys_content or "Cortex Pro" in sys_content:
            return rebuild_stream
        elif "NÚCLEO II" in sys_content or "Phantom" in sys_content:
            return break_stream
        elif "NÚCLEO I" in sys_content or "Speed" in sys_content:
            return create_stream

        model = kwargs.get("model", "")
        if "pro" in model or "max" in model or "lightning" in model or "120b" in model:
            return rebuild_stream
        elif "ultra" in model or "versatile" in model or "70b" in model or "haiku" in model:
            return break_stream
        elif "8b" in model or "bolt" in model or "flash" in model or "plus" in model:
            return create_stream
        else:
            return rebuild_stream

    with patch("main.client_nvidia.chat.completions.create", AsyncMock(side_effect=side_effect_dispatch)), \
         patch("main.client_groq.chat.completions.create", AsyncMock(side_effect=side_effect_dispatch)), \
         patch("main.client_gemini.chat.completions.create", AsyncMock(side_effect=side_effect_dispatch)), \
         patch("main.client_openrouter.chat.completions.create", AsyncMock(side_effect=side_effect_dispatch)):

        gen = generate_ai_stream(
            conversation_id=None,
            user_id="test_user",
            messages=[ChatMessage(role="user", content=test_query)],
            temperature=0.5,
            model_type="speed",
            triad_mode=True,
            request=req,
        )

        tokens_received = []
        lines_yielded = []
        rebuild_tokens = 0

        async for sse_line in gen:
            lines_yielded.append(sse_line)
            if sse_line.startswith("data: "):
                payload = json.loads(sse_line[6:].strip())
                if "token" in payload:
                    tokens_received.append(payload["token"])
                    if payload.get("core") == "rebuild":
                        rebuild_tokens += 1
                        if rebuild_tokens == 2:
                            print(f"  --> SIMULATING CLIENT DISCONNECT during Phase 2 (REBUILD at token 2)...")
                            conn.disconnect_client()

    print(f"  [TRIAD Rebuild ended]. Total tokens: {len(tokens_received)}, Rebuild tokens: {rebuild_tokens}")
    print(f"  [REBUILD stream closed]: {rebuild_stream.closed}")

    has_done = any('"done": true' in line.lower() for line in lines_yielded)
    print(f"  [TRIAD yielded 'done: true' to disconnected socket after Rebuild disconnect]: {has_done}")

    results = {
        "rebuild_closed": rebuild_stream.closed,
        "rebuild_tokens": rebuild_tokens,
        "done_yielded": has_done,
    }

    if has_done:
        print("  ❌ DEFECT CONFIRMED: 'done: true' was yielded after Rebuild disconnect!")
    else:
        print("  ✅ SUCCESS: 'done: true' was suppressed after Rebuild disconnect.")

    return results


async def test_immediate_disconnect_before_first_token():
    print("\n======================================================================")
    print("TEST 4: Immediate Disconnect Before First Token Arrives")
    print("======================================================================")

    _mem_prompt_cache.clear()
    test_query = f"¿Cuáles son los principios SOLID? {uuid.uuid4().hex[:6]}"
    conn = MockASGIConnection()
    req = conn.make_request()

    # Disconnect client immediately before stream yields anything
    conn.disconnect_client()

    mock_stream = MockStream(["Token1", "Token2", "Token3"], delay=0.02)
    lines_yielded = []

    with patch("main.client_nvidia.chat.completions.create", AsyncMock(return_value=mock_stream)), \
         patch("main.client_groq.chat.completions.create", AsyncMock(return_value=mock_stream)), \
         patch("main.client_gemini.chat.completions.create", AsyncMock(return_value=mock_stream)), \
         patch("main.client_openrouter.chat.completions.create", AsyncMock(return_value=mock_stream)):

        gen = generate_ai_stream(
            conversation_id=None,
            user_id="test_user",
            messages=[ChatMessage(role="user", content=test_query)],
            temperature=0.3,
            model_type="speed",
            triad_mode=False,
            request=req,
        )

        async for sse_line in gen:
            lines_yielded.append(sse_line)

    print(f"  [Immediate disconnect]. Lines yielded: {len(lines_yielded)}")
    print(f"  [Upstream stream closed]: {mock_stream.closed}")
    has_done = any('"done": true' in line.lower() for line in lines_yielded)
    has_tokens = any('"token":' in line for line in lines_yielded)
    print(f"  [Yielded tokens to disconnected client]: {has_tokens}")
    print(f"  [Yielded done: true]: {has_done}")

    cached = _get_prompt_cache("speed", test_query)
    print(f"  [Prompt Cache entry]: {cached!r}")

    return {
        "stream_closed": mock_stream.closed,
        "lines_yielded": len(lines_yielded),
        "has_tokens": has_tokens,
        "has_done": has_done,
        "cached": cached,
    }


async def main():
    res1 = await test_monomodel_disconnect_and_cache_integrity()
    res2 = await test_triad_phase1_disconnect()
    res3 = await test_triad_phase2_rebuild_disconnect()
    res4 = await test_immediate_disconnect_before_first_token()

    print("\n======================================================================")
    print("FINAL CHALLENGE VERDICT DATA")
    print("======================================================================")
    print(json.dumps({
        "test_1_monomodel": res1,
        "test_2_triad_phase1": res2,
        "test_3_triad_phase2": res3,
        "test_4_immediate_disconnect": res4,
    }, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
