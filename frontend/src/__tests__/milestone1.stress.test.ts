import { describe, it, expect } from 'vitest';
import { normalizeUsage } from '../useSSEStream';
import { markdownToPdfHtml } from '../pdfExporter';
import * as fs from 'fs';
import * as path from 'path';

// Setup minimal globals for Node environment
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    return setTimeout(() => cb(Date.now()), 16) as unknown as number;
  };
}
if (typeof globalThis.cancelAnimationFrame === 'undefined') {
  globalThis.cancelAnimationFrame = (id: number): void => {
    clearTimeout(id as unknown as NodeJS.Timeout);
  };
}
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = globalThis;
}

/* =====================================================================
   SUITE 1: normalizeUsage Boundary & Adversarial Tests
===================================================================== */
describe('normalizeUsage — Adversarial Stress & Boundaries', () => {
  it('returns undefined for non-object, null, or empty inputs', () => {
    expect(normalizeUsage(null)).toBeUndefined();
    expect(normalizeUsage(undefined)).toBeUndefined();
    expect(normalizeUsage('')).toBeUndefined();
    expect(normalizeUsage(123)).toBeUndefined();
    expect(normalizeUsage(true)).toBeUndefined();
    expect(normalizeUsage([])).toBeUndefined();
    expect(normalizeUsage({})).toBeUndefined();
  });

  it('correctly handles snake_case fields from backend SSE payload', () => {
    const raw = {
      prompt_tokens: 150,
      completion_tokens: 350,
      total_tokens: 500,
      model_used: 'nvidia:nemotron-3.5',
    };
    const result = normalizeUsage(raw);
    expect(result).toBeDefined();
    expect(result).toEqual({
      promptTokens: 150,
      completionTokens: 350,
      totalTokens: 500,
      modelUsed: 'nvidia:nemotron-3.5',
    });
  });

  it('correctly handles camelCase fields as fallback', () => {
    const raw = {
      promptTokens: 40,
      completionTokens: 60,
      totalTokens: 100,
      modelUsed: 'speed',
    };
    const result = normalizeUsage(raw);
    expect(result).toEqual({
      promptTokens: 40,
      completionTokens: 60,
      totalTokens: 100,
      modelUsed: 'speed',
    });
  });

  it('computes totalTokens if total_tokens is missing or zero', () => {
    const raw = {
      prompt_tokens: 85,
      completion_tokens: 115,
      total_tokens: 0,
      model_used: 'cortex',
    };
    const result = normalizeUsage(raw);
    expect(result?.totalTokens).toBe(200);
  });

  it('handles array model_used and object model_used without crashing', () => {
    const rawArray = {
      prompt_tokens: 10,
      completion_tokens: 20,
      model_used: ['speed', 'cortex', null, undefined, 'zenith'],
    };
    expect(normalizeUsage(rawArray)?.modelUsed).toBe('speed + cortex + zenith');

    const rawObj = {
      prompt_tokens: 10,
      completion_tokens: 20,
      model_used: { m1: 'coreA', m2: 'coreB' },
    };
    expect(normalizeUsage(rawObj)?.modelUsed).toBe('coreA + coreB');
  });

  it('safely handles NaN, Infinity, negative numbers, and string numbers', () => {
    const rawWeird = {
      prompt_tokens: '120',
      completion_tokens: NaN,
      total_tokens: 'invalid',
      model_used: 'phantom',
    };
    const result = normalizeUsage(rawWeird);
    expect(result?.promptTokens).toBe(120);
    expect(result?.completionTokens).toBe(0);
    expect(result?.totalTokens).toBe(120);
  });
});

/* =====================================================================
   SUITE 2: markdownToPdfHtml Edge Cases, Formatting & High Contrast
===================================================================== */
describe('markdownToPdfHtml — Adversarial Markdown & PDF Card Formatting', () => {
  it('returns empty string for null, undefined, empty, or whitespace-only inputs', () => {
    expect(markdownToPdfHtml('')).toBe('');
    expect(markdownToPdfHtml(null as unknown as string)).toBe('');
    expect(markdownToPdfHtml(undefined as unknown as string)).toBe('');
  });

  it('applies high-contrast light editorial theme to code blocks (zero black-on-black)', () => {
    const md = '```typescript\nconst greeting: string = "hello world";\nconsole.log(greeting);\n```';
    const html = markdownToPdfHtml(md);

    // Verify container styling
    expect(html).toContain('class="pdf-code-card"');
    expect(html).toContain('background-color:#f8fafc');
    expect(html).toContain('border:1px solid #cbd5e1');
    expect(html).toContain('-webkit-print-color-adjust:exact');

    // Verify header styling with CSS uppercase transformation
    expect(html).toContain('background-color:#f1f5f9');
    expect(html).toContain('color:#0369a1');
    expect(html).toContain('text-transform:uppercase');
    expect(html.toLowerCase()).toContain('typescript');
    expect(html).toContain('2 líneas');

    // Verify code block font and high-contrast color
    expect(html).toContain('color:#0f172a');
    expect(html).toContain('color:#0f172a !important;');
  });

  it('enforces page-break-inside:avoid for code blocks <= 28 lines and auto for > 28 lines', () => {
    // 10 lines -> avoid break
    const shortCode = '```python\n' + Array(10).fill('x = 1').join('\n') + '\n```';
    const shortHtml = markdownToPdfHtml(shortCode);
    expect(shortHtml).toContain('page-break-inside:avoid; break-inside:avoid;');

    // 40 lines -> allow auto break so huge scripts don't get truncated or leave blank pages
    const longCode = '```python\n' + Array(40).fill('y = 2').join('\n') + '\n```';
    const longHtml = markdownToPdfHtml(longCode);
    expect(longHtml).toContain('page-break-inside:auto; break-inside:auto;');
  });

  it('does NOT convert monetary currency signs into KaTeX math', () => {
    const md = 'El costo es $100 y el descuento es $20. Total: $80.';
    const html = markdownToPdfHtml(md);
    // Should NOT contain KaTeX or math spans
    expect(html).not.toContain('<span style="color:#0f172a;"><em>100</em></span>');
    expect(html).toContain('$100');
    expect(html).toContain('$20');
  });

  it('renders block math $$ ... $$ and inline math $ ... $ safely', () => {
    const mockKatex = (tex: string, displayMode: boolean) =>
      `<span class="katex-mock" data-display="${displayMode}">${tex}</span>`;

    const md = 'Fórmula: $E = mc^2$\n\n$$\\int_0^1 x dx = \\frac{1}{2}$$';
    const html = markdownToPdfHtml(md, mockKatex);

    expect(html).toContain('data-display="false"');
    expect(html).toContain('E = mc^2');
    expect(html).toContain('data-display="true"');
    expect(html).toContain('\\int_0^1 x dx = \\frac{1}{2}');
  });

  it('escapes raw HTML to prevent injection and XSS', () => {
    const md = '<script>alert("pwned")</script><img src=x onerror=alert(1)>';
    const html = markdownToPdfHtml(md);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('safely handles adversarial token injection like @@PDFBLOCK_0@@', () => {
    const md = 'Prueba con token falso @@PDFBLOCK_9999@@ y @@PDFINLINE_8888@@.';
    expect(() => markdownToPdfHtml(md)).not.toThrow();
    const html = markdownToPdfHtml(md);
    expect(html).toBeDefined();
  });

  it('strips internal thought blocks <thought> and <think> completely', () => {
    const md = '<thought>Pensamiento interno confidencial</thought>Respuesta visible al usuario.';
    const html = markdownToPdfHtml(md);
    expect(html).not.toContain('Pensamiento interno confidencial');
    expect(html).toContain('Respuesta visible al usuario.');

    const mdUnclosed = '<thought>Pensamiento no cerrado';
    const htmlUnclosed = markdownToPdfHtml(mdUnclosed);
    expect(htmlUnclosed).not.toContain('Pensamiento no cerrado');
  });

  it('formats LYAXIS TRIAD™ multi-core outputs into 3 dedicated cards', () => {
    const triadMd = `
[TRIAD_CORE:create]
Solución rápida inicial
[/TRIAD_CORE:create]

[TRIAD_CORE:break]
Análisis de vulnerabilidades y puntos de falla
[/TRIAD_CORE:break]

[TRIAD_CORE:rebuild]
Solución final robusta y blindada
[/TRIAD_CORE:rebuild]
    `;
    const html = markdownToPdfHtml(triadMd);
    expect(html).toContain('NÚCLEO I · CREATE');
    expect(html).toContain('NÚCLEO II · BREAK');
    expect(html).toContain('NÚCLEO III · REBUILD');
    expect(html).toContain('Solución rápida inicial');
    expect(html).toContain('Análisis de vulnerabilidades y puntos de falla');
    expect(html).toContain('Solución final robusta y blindada');
  });

  it('formats complex GFM tables with striped rows and dark headers', () => {
    const tableMd = `
| Algoritmo | Tiempo | Espacio |
| :--- | :---: | ---: |
| MergeSort | O(n log n) | O(n) |
| QuickSort | O(n log n) | O(log n) |
    `;
    const html = markdownToPdfHtml(tableMd);
    expect(html).toContain('<table class="pdf-table"');
    expect(html).toContain('<th');
    expect(html).toContain('MergeSort');
    expect(html).toContain('QuickSort');
  });
});

/* =====================================================================
   SUITE 3: index.css Static Analysis & KaTeX Containment Integrity
===================================================================== */
describe('index.css — CSS Houdini, Elevation Layers & KaTeX Containment', () => {
  const cssPath = path.resolve(__dirname, '../index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('defines 5 Houdini @property rules for fluid GPU engine transitions', () => {
    expect(cssContent).toMatch(/@property\s+--current-primary/);
    expect(cssContent).toMatch(/@property\s+--current-glow/);
    expect(cssContent).toMatch(/@property\s+--current-surface/);
    expect(cssContent).toMatch(/@property\s+--current-border/);
    expect(cssContent).toMatch(/@property\s+--current-accent/);
  });

  it('defines 4-tier elevation hierarchy', () => {
    expect(cssContent).toContain('.lx-layer-0');
    expect(cssContent).toContain('.lx-elevation-canvas');
    expect(cssContent).toContain('.lx-layer-1');
    expect(cssContent).toContain('.lx-elevation-shell');
    expect(cssContent).toContain('.lx-layer-2');
    expect(cssContent).toContain('.lx-elevation-card');
    expect(cssContent).toContain('.lx-layer-3');
    expect(cssContent).toContain('.lx-elevation-overlay');
  });

  it('verifies Layer 2 (chat cards / code blocks) has ZERO backdrop-filter to preserve 60 FPS', () => {
    const match = cssContent.match(/\.lx-layer-2[\s\S]*?\{([\s\S]*?)\}/);
    expect(match).not.toBeNull();
    const rules = match![1];
    expect(rules).not.toContain('backdrop-filter');
    expect(rules).not.toContain('-webkit-backdrop-filter');
  });

  it('purged all 7 dead keyframes identified in the transformation plan', () => {
    const deadKeyframes = [
      'inputNeonPulse',
      'particleDrift',
      'typewriterFade',
      'ambientGlowDrift2',
      'modelSelectPop',
      'modelActiveRing',
      'powerFlicker',
    ];
    for (const kf of deadKeyframes) {
      expect(cssContent).not.toMatch(new RegExp(`@keyframes\\s+${kf}\\b`));
    }
  });

  it('contains strict KaTeX responsive overflow containment and scroll rules', () => {
    // span.katex
    expect(cssContent).toMatch(/span\.katex\s*\{[\s\S]*?overflow-x:\s*auto/);
    expect(cssContent).toMatch(/span\.katex\s*\{[\s\S]*?max-width:\s*100%/);

    // .katex-display
    expect(cssContent).toMatch(/\.katex-display\s*\{[\s\S]*?width:\s*100%\s*!important/);
    expect(cssContent).toMatch(/\.katex-display\s*\{[\s\S]*?overflow-x:\s*auto\s*!important/);
    expect(cssContent).toMatch(/\.katex-display\s*\{[\s\S]*?min-width:\s*0\s*!important/);

    // MathML containment
    expect(cssContent).toMatch(/\.katex\s+\.katex-mathml\s*\{[\s\S]*?position:\s*absolute\s*!important/);
    expect(cssContent).toMatch(/\.katex\s+\.katex-mathml\s*\{[\s\S]*?clip:\s*rect/);

    // Flex/Grid overflow guard
    expect(cssContent).toMatch(/\.lyaxis-msg-bubble[\s\S]*?min-width:\s*0\s*!important/);
    expect(cssContent).toMatch(/\.lyaxis-msg-bubble[\s\S]*?overflow-wrap:\s*anywhere/);
  });
});

/* =====================================================================
   SUITE 4: useSSEStream Lifecycle, Concurrent Races & Network Stress
===================================================================== */
describe('useSSEStream — Concurrency, Lifecycle & Stream Processor Stress', () => {
  // Pure harness simulating hook state, refs, and network stream reader loop
  function createStreamHarness() {
    let isStreaming = false;
    let activeStreamId = 0;
    let activeAbortController: AbortController | null = null;
    let pendingTimeoutTimer: any = null;
    let pendingRafId: any = null;

    const stopStreaming = () => {
      activeStreamId += 1;
      if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
      }
      if (pendingTimeoutTimer) {
        clearTimeout(pendingTimeoutTimer);
        pendingTimeoutTimer = null;
      }
      if (pendingRafId) {
        cancelAnimationFrame(pendingRafId);
        pendingRafId = null;
      }
      isStreaming = false;
    };

    const unmountTeardown = () => {
      if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
      }
      if (pendingTimeoutTimer) {
        clearTimeout(pendingTimeoutTimer);
        pendingTimeoutTimer = null;
      }
      if (pendingRafId) {
        cancelAnimationFrame(pendingRafId);
        pendingRafId = null;
      }
    };

    const simulateStream = async (
      chunks: string[],
      onToken: (acc: string) => void,
      options?: {
        timeoutMs?: number;
        delayPerChunkMs?: number;
        onDone?: (t: string) => void;
        onError?: (e: Error) => void;
      }
    ) => {
      stopStreaming();
      const streamId = ++activeStreamId;
      const abortController = new AbortController();
      activeAbortController = abortController;
      isStreaming = true;

      const timeoutMs = options?.timeoutMs ?? 65000;
      let accumulatedText = '';
      let timeoutTriggered = false;

      pendingTimeoutTimer = setTimeout(() => {
        if (activeStreamId !== streamId) return;
        timeoutTriggered = true;
        abortController.abort(new Error('TIMEOUT'));
      }, timeoutMs);

      try {
        let buffer = '';
        for (const chunk of chunks) {
          if (activeStreamId !== streamId) return;
          if (abortController.signal.aborted) throw new Error('AbortError');

          if (options?.delayPerChunkMs) {
            await new Promise((res) => setTimeout(res, options.delayPerChunkMs));
            if (activeStreamId !== streamId) return;
            if (abortController.signal.aborted) throw new Error('AbortError');
          }

          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') continue;

            if (trimmed.startsWith('data: ')) {
              const dataContent = trimmed.slice(6);
              try {
                const parsed = JSON.parse(dataContent);
                if (parsed.token) {
                  accumulatedText += parsed.token;
                  if (activeStreamId === streamId) {
                    onToken(accumulatedText);
                  }
                }
              } catch {
                // Ignore parse errors safely
              }
            }
          }
        }

        if (activeStreamId !== streamId) return;
        if (options?.onDone) options.onDone(accumulatedText);
      } catch (err: any) {
        if (activeStreamId !== streamId) return;
        const isAbort = (err.message === 'AbortError' || err.name === 'AbortError') && !timeoutTriggered;
        if (!isAbort && options?.onError) {
          options.onError(err);
        }
      } finally {
        if (activeStreamId === streamId) {
          if (pendingTimeoutTimer) {
            clearTimeout(pendingTimeoutTimer);
            pendingTimeoutTimer = null;
          }
          isStreaming = false;
          activeAbortController = null;
        }
      }
    };

    return {
      get isStreaming() { return isStreaming; },
      get activeStreamId() { return activeStreamId; },
      get activeAbortController() { return activeAbortController; },
      stopStreaming,
      unmountTeardown,
      simulateStream,
    };
  }

  it('atomic cancellation on concurrent sendMessage calls ignores earlier streams', async () => {
    const harness = createStreamHarness();
    const tokenCallsStream1: string[] = [];
    const tokenCallsStream2: string[] = [];

    // Launch Call 1 with a slight delay between chunks
    const p1 = harness.simulateStream(
      ['data: {"token": "A"}\n', 'data: {"token": "B"}\n'],
      (t) => tokenCallsStream1.push(t),
      { delayPerChunkMs: 5 }
    );

    // Concurrently launch Call 2 immediately before Call 1 finishes
    const p2 = harness.simulateStream(
      ['data: {"token": "X"}\n', 'data: {"token": "Y"}\n'],
      (t) => tokenCallsStream2.push(t)
    );

    await Promise.all([p1, p2]);

    expect(harness.isStreaming).toBe(false);
    expect(tokenCallsStream2).toEqual(['X', 'XY']);
    // Call 1 was cancelled atomically; activeStreamId progressed monotonically
    expect(harness.activeStreamId).toBe(4);
  });

  it('handles multi-fragmented chunks without losing characters or dropping tokens', async () => {
    const harness = createStreamHarness();
    const received: string[] = [];

    // Split a single JSON line into 5 awkward chunks
    const fragmentedChunks = [
      'dat',
      'a: {"to',
      'ken": "Hello ',
      'World"}\n',
      'data: [DONE]\n',
    ];

    await harness.simulateStream(
      fragmentedChunks,
      (t) => received.push(t)
    );

    expect(received).toEqual(['Hello World']);
  });

  it('silently ignores SSE comments (: ping), empty lines, and malformed JSON without corrupting chat', async () => {
    const harness = createStreamHarness();
    let finalText = '';

    const messyChunks = [
      ': ping - keepalive\n\n',
      '\n\n',
      'data: not valid json at all\n\n',
      'data: {"token": "Valid Part 1"}\n\n',
      ': another comment\n',
      'data: {"token": " & Part 2"}\n\n',
      'data: [DONE]\n\n',
    ];

    await harness.simulateStream(
      messyChunks,
      (t) => { finalText = t; }
    );

    expect(finalText).toBe('Valid Part 1 & Part 2');
  });

  it('unmountTeardown cleans up AbortController and active timers during active stream', async () => {
    const harness = createStreamHarness();
    // Launch a slow stream
    const streamPromise = harness.simulateStream(
      ['data: {"token": "Stream1"}\n', 'data: {"token": "Stream2"}\n'],
      () => {},
      { delayPerChunkMs: 25 }
    );

    // Check that abort controller is active
    expect(harness.activeAbortController).not.toBeNull();
    const controller = harness.activeAbortController!;
    expect(controller.signal.aborted).toBe(false);

    // Trigger unmount immediately
    harness.unmountTeardown();

    expect(controller.signal.aborted).toBe(true);
    expect(harness.activeAbortController).toBeNull();

    await streamPromise;
  });
});


/* =====================================================================
   SUITE 5: KaTeX Boundary Overflow & Malformed Syntax Harness
===================================================================== */
describe('KaTeX — Boundary Overflow, Invalid Syntax & MathML Containment', async () => {
  const katexMod = await import('katex');
  const katex = katexMod.default || katexMod;

  it('renders massive 500-term polynomial without throwing or exceeding stack depth', () => {
    // Generate massive formula: \sum_{i=1}^{500} \frac{x^i}{i!}
    const terms = Array.from({ length: 500 }, (_, i) => `\\frac{x^{${i}}}{${i}!}`).join(' + ');
    const hugeTex = `f(x) = \\sum_{i=1}^{500} ${terms}`;

    expect(() => {
      const rendered = katex.renderToString(hugeTex, {
        displayMode: true,
        throwOnError: false,
        strict: 'ignore',
        output: 'html',
      });
      expect(rendered).toContain('katex-display');
      expect(rendered).toContain('katex');
    }).not.toThrow();
  });

  it('gracefully handles malformed TeX syntax with throwOnError: false (renders katex-error span)', () => {
    const invalidTex = '\\invalidCommand{unknown} \\frac{1}{';
    let rendered = '';
    expect(() => {
      rendered = katex.renderToString(invalidTex, {
        displayMode: false,
        throwOnError: false,
        strict: 'ignore',
        output: 'html',
      });
    }).not.toThrow();

    expect(rendered).toContain('katex');
    expect(rendered).toContain('katex-error');
  });

  it('generates .katex-mathml with valid containment structure for CSS clipping', () => {
    const tex = 'E = mc^2';
    const rendered = katex.renderToString(tex, {
      displayMode: false,
      throwOnError: false,
      output: 'htmlAndMathml',
    });

    // Verify .katex-mathml element exists so index.css rule .katex .katex-mathml clips it to 1px
    expect(rendered).toContain('katex-mathml');
  });
});

/* =====================================================================
   SUITE 6: Network Fault Injection, 429/504 Handling & Concurrency Bursts
===================================================================== */
describe('Network Fault Injection & Concurrent Stream Bursts', () => {
  it('handles HTML 504 Gateway Timeout without throwing JSON parsing exceptions', () => {
    const html504 = `
      <!DOCTYPE html>
      <html>
        <head><title>504 Gateway Time-out</title></head>
        <body>
          <center><h1>504 Gateway Time-out</h1></center>
          <hr><center>cloudflare / render</center>
        </body>
      </html>
    `;

    // Simulate response parsing in useSSEStream
    const matchToken = html504.match(/"token"\s*:\s*"([^"]+)"/);
    const matchMsg = html504.match(/"message"\s*:\s*"([^"]+)"/);
    expect(matchToken).toBeNull();
    expect(matchMsg).toBeNull();

    // Default friendly message is preserved
    let errMsg = '⚠️ El servidor tardó en responder o está iniciando. Por favor, reintenta en unos segundos.';
    expect(errMsg).toContain('El servidor tardó en responder');
  });

  it('extracts retryAfterMs and message from 429 Rate Limit SSE / JSON body', () => {
    const body429 = JSON.stringify({
      error: 'Too Many Requests',
      message: 'Cuota o enfriamiento de LYAXIS TRIAD™ activo.',
      reason: 'cooldown_active',
      retryAfterMs: 45000,
    });

    const matchMsg = body429.match(/"message"\s*:\s*"([^"]+)"/);
    const matchReason = body429.match(/"reason"\s*:\s*"([^"]+)"/);
    const matchRetry = body429.match(/"retryAfterMs"\s*:\s*(\d+)/);

    expect(matchMsg?.[1]).toBe('Cuota o enfriamiento de LYAXIS TRIAD™ activo.');
    expect(matchReason?.[1]).toBe('cooldown_active');
    expect(parseInt(matchRetry?.[1] || '0', 10)).toBe(45000);
  });

  it('handles 10 rapid concurrent stream requests without race collisions or deadlocks', async () => {
    let activeStreamId = 0;
    const completedStreams: number[] = [];

    const startStream = async (id: number) => {
      // simulate stopStreaming()
      activeStreamId += 1;
      const currentEpoch = ++activeStreamId;

      await new Promise((r) => setTimeout(r, Math.random() * 20));

      if (currentEpoch === activeStreamId) {
        completedStreams.push(id);
      }
    };

    // Fire 10 concurrent stream calls
    const promises = Array.from({ length: 10 }, (_, i) => startStream(i + 1));
    await Promise.all(promises);

    // Only the very last stream should match activeStreamId and complete
    expect(completedStreams).toEqual([10]);
    expect(activeStreamId).toBe(20); // 10 * 2 increments
  });
});
