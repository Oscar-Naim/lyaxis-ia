import React, { useState, useRef, useMemo } from 'react';
import {
  Columns,
  AlignJustify,
  Copy,
  Check,
  FileCode,
  CheckCircle2,
  X,
} from 'lucide-react';
import { playCyberSuccess, playCyberClick } from '../sound';

export type DiffChangeType = 'unchanged' | 'added' | 'deleted';

export type DiffViewMode = 'side-by-side' | 'unified';

export interface IntraLineSegment {
  text: string;
  type: DiffChangeType;
}

export interface DiffLine {
  type: DiffChangeType;
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
  intraLineSegments?: IntraLineSegment[];
}

export interface SideBySideCell {
  lineNumber?: number;
  content: string;
  type: 'unchanged' | 'added' | 'deleted' | 'empty';
  intraLineSegments?: IntraLineSegment[];
}

export interface SideBySideRow {
  left: SideBySideCell;
  right: SideBySideCell;
}

export interface DiffViewerProps {
  originalCode: string;
  modifiedCode: string;
  language?: string;
  fileName?: string;
  initialMode?: DiffViewMode;
  onApply?: (newCode: string) => void;
  onClose?: () => void;
  maxHeight?: string | number;
  showLineNumbers?: boolean;
}

/**
 * Tokenizador para diferencias intra-línea (preserva indentación, identificadores y puntuación)
 */
export function tokenizeLineForDiff(line: string): string[] {
  if (!line) return [''];
  const tokens: string[] = [];
  const regex = /([a-zA-Z0-9_]+|\s+|[^\s\w])/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    tokens.push(match[0]);
  }
  return tokens.length > 0 ? tokens : [line];
}

/**
 * Algoritmo Myers LCS O(ND) puro para secuencias arbitrarias
 */
export function myersDiff<T>(
  a: T[],
  b: T[],
  equals: (x: T, y: T) => boolean = (x, y) => x === y
): Array<{ type: DiffChangeType; item: T; originalIndex?: number; modifiedIndex?: number }> {
  const n = a.length;
  const m = b.length;
  const max = n + m;

  // Fast-path: secuencias idénticas
  if (n === m && a.every((item, i) => equals(item, b[i]))) {
    return a.map((item, i) => ({
      type: 'unchanged',
      item,
      originalIndex: i,
      modifiedIndex: i,
    }));
  }

  // Fast-path: secuencia original vacía (todas añadidas)
  if (n === 0) {
    return b.map((item, i) => ({
      type: 'added',
      item,
      modifiedIndex: i,
    }));
  }

  // Fast-path: secuencia modificada vacía (todas eliminadas)
  if (m === 0) {
    return a.map((item, i) => ({
      type: 'deleted',
      item,
      originalIndex: i,
    }));
  }

  const vOffset = max;
  const v = new Int32Array(2 * max + 1);
  const trace: Int32Array[] = [];

  let foundD = -1;

  for (let d = 0; d <= max; d++) {
    // Almacenar instantánea de V para backtracking
    trace.push(new Int32Array(v));

    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[k - 1 + vOffset] < v[k + 1 + vOffset])) {
        x = v[k + 1 + vOffset]; // Movimiento hacia abajo (inserción en B)
      } else {
        x = v[k - 1 + vOffset] + 1; // Movimiento a la derecha (eliminación de A)
      }
      let y = x - k;

      // Atravesar snake diagonal (elementos idénticos consecutivos)
      while (x < n && y < m && equals(a[x], b[y])) {
        x++;
        y++;
      }

      v[k + vOffset] = x;

      if (x >= n && y >= m) {
        foundD = d;
        break;
      }
    }

    if (foundD !== -1) break;
  }

  // Backtracking para reconstruir el camino
  const result: Array<{ type: DiffChangeType; item: T; originalIndex?: number; modifiedIndex?: number }> = [];
  let currX = n;
  let currY = m;

  for (let d = (foundD !== -1 ? foundD : trace.length - 1); d > 0; d--) {
    const vPrev = trace[d];
    const k = currX - currY;

    let prevK: number;
    if (k === -d || (k !== d && vPrev[k - 1 + vOffset] < vPrev[k + 1 + vOffset])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = vPrev[prevK + vOffset];
    const prevY = prevX - prevK;

    // Elementos de la snake diagonal que coinciden
    while (currX > prevX && currY > prevY) {
      currX--;
      currY--;
      result.push({
        type: 'unchanged',
        item: a[currX],
        originalIndex: currX,
        modifiedIndex: currY,
      });
    }

    // Paso de edición
    if (d > 0) {
      if (currX === prevX) {
        // Inserción en B
        currY--;
        result.push({
          type: 'added',
          item: b[currY],
          modifiedIndex: currY,
        });
      } else if (currY === prevY) {
        // Eliminación de A
        currX--;
        result.push({
          type: 'deleted',
          item: a[currX],
          originalIndex: currX,
        });
      }
    }
  }

  // Coincidencias diagonales iniciales
  while (currX > 0 && currY > 0) {
    currX--;
    currY--;
    result.push({
      type: 'unchanged',
      item: a[currX],
      originalIndex: currX,
      modifiedIndex: currY,
    });
  }

  return result.reverse();
}

/**
 * Calcula diferencias intra-línea emparejando líneas eliminadas y añadidas
 */
export function computeIntraLineDiff(
  deletedLine: string,
  addedLine: string
): { deletedSegments: IntraLineSegment[]; addedSegments: IntraLineSegment[] } {
  const tokensA = tokenizeLineForDiff(deletedLine);
  const tokensB = tokenizeLineForDiff(addedLine);

  const tokenDiff = myersDiff(tokensA, tokensB);

  const deletedSegments: IntraLineSegment[] = [];
  const addedSegments: IntraLineSegment[] = [];

  for (const token of tokenDiff) {
    if (token.type === 'unchanged') {
      deletedSegments.push({ text: token.item, type: 'unchanged' });
      addedSegments.push({ text: token.item, type: 'unchanged' });
    } else if (token.type === 'deleted') {
      deletedSegments.push({ text: token.item, type: 'deleted' });
    } else if (token.type === 'added') {
      addedSegments.push({ text: token.item, type: 'added' });
    }
  }

  return { deletedSegments, addedSegments };
}

/**
 * Procesa el diff línea a línea completo y genera DiffLine[] para vista unificada
 */
export function computeUnifiedDiffLines(originalCode: string, modifiedCode: string): DiffLine[] {
  const rawLinesA = originalCode.replace(/\r\n/g, '\n').split('\n');
  const rawLinesB = modifiedCode.replace(/\r\n/g, '\n').split('\n');

  const diffItems = myersDiff(rawLinesA, rawLinesB);
  const lines: DiffLine[] = [];

  let oldLineCounter = 1;
  let newLineCounter = 1;

  let i = 0;
  while (i < diffItems.length) {
    const item = diffItems[i];

    if (item.type === 'unchanged') {
      lines.push({
        type: 'unchanged',
        oldLineNumber: oldLineCounter++,
        newLineNumber: newLineCounter++,
        content: item.item,
      });
      i++;
    } else if (item.type === 'deleted') {
      // Detectar bloque consecutivo de eliminaciones seguido de adiciones
      const delGroup: Array<{ item: string; originalIndex?: number }> = [];
      while (i < diffItems.length && diffItems[i].type === 'deleted') {
        delGroup.push(diffItems[i]);
        i++;
      }

      const addGroup: Array<{ item: string; modifiedIndex?: number }> = [];
      while (i < diffItems.length && diffItems[i].type === 'added') {
        addGroup.push(diffItems[i]);
        i++;
      }

      const pairCount = Math.min(delGroup.length, addGroup.length);

      // Emparejar líneas para intra-line highlighting
      for (let p = 0; p < delGroup.length; p++) {
        if (p < pairCount) {
          const { deletedSegments } = computeIntraLineDiff(delGroup[p].item, addGroup[p].item);
          lines.push({
            type: 'deleted',
            oldLineNumber: oldLineCounter++,
            content: delGroup[p].item,
            intraLineSegments: deletedSegments,
          });
        } else {
          lines.push({
            type: 'deleted',
            oldLineNumber: oldLineCounter++,
            content: delGroup[p].item,
          });
        }
      }

      for (let p = 0; p < addGroup.length; p++) {
        if (p < pairCount) {
          const { addedSegments } = computeIntraLineDiff(delGroup[p].item, addGroup[p].item);
          lines.push({
            type: 'added',
            newLineNumber: newLineCounter++,
            content: addGroup[p].item,
            intraLineSegments: addedSegments,
          });
        } else {
          lines.push({
            type: 'added',
            newLineNumber: newLineCounter++,
            content: addGroup[p].item,
          });
        }
      }
    } else {
      // Adición aislada
      lines.push({
        type: 'added',
        newLineNumber: newLineCounter++,
        content: item.item,
      });
      i++;
    }
  }

  return lines;
}

/**
 * Convierte DiffLine[] a SideBySideRow[] alineando bloques de cambio
 */
export function buildSideBySideRows(unifiedLines: DiffLine[]): SideBySideRow[] {
  const rows: SideBySideRow[] = [];
  let i = 0;

  while (i < unifiedLines.length) {
    const line = unifiedLines[i];

    if (line.type === 'unchanged') {
      rows.push({
        left: {
          lineNumber: line.oldLineNumber,
          content: line.content,
          type: 'unchanged',
        },
        right: {
          lineNumber: line.newLineNumber,
          content: line.content,
          type: 'unchanged',
        },
      });
      i++;
    } else {
      // Bloque de cambios: recolectar eliminaciones y adiciones contiguas
      const dels: DiffLine[] = [];
      const adds: DiffLine[] = [];

      while (i < unifiedLines.length && (unifiedLines[i].type === 'deleted' || unifiedLines[i].type === 'added')) {
        if (unifiedLines[i].type === 'deleted') dels.push(unifiedLines[i]);
        else adds.push(unifiedLines[i]);
        i++;
      }

      const maxLen = Math.max(dels.length, adds.length);
      for (let r = 0; r < maxLen; r++) {
        const del = dels[r];
        const add = adds[r];

        rows.push({
          left: del
            ? {
                lineNumber: del.oldLineNumber,
                content: del.content,
                type: 'deleted',
                intraLineSegments: del.intraLineSegments,
              }
            : {
                content: '',
                type: 'empty',
              },
          right: add
            ? {
                lineNumber: add.newLineNumber,
                content: add.content,
                type: 'added',
                intraLineSegments: add.intraLineSegments,
              }
            : {
                content: '',
                type: 'empty',
              },
        });
      }
    }
  }

  return rows;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  originalCode,
  modifiedCode,
  language = 'typescript',
  fileName,
  initialMode = 'side-by-side',
  onApply,
  onClose,
  maxHeight = '520px',
  showLineNumbers = true,
}) => {
  const [mode, setMode] = useState<DiffViewMode>(initialMode);
  const [copied, setCopied] = useState(false);

  // Scroll synchronization refs
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const scrollingSourceRef = useRef<'left' | 'right' | null>(null);

  const handleLeftScroll = () => {
    if (scrollingSourceRef.current === 'right') return;
    scrollingSourceRef.current = 'left';
    if (rightScrollRef.current && leftScrollRef.current) {
      rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
      rightScrollRef.current.scrollLeft = leftScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      scrollingSourceRef.current = null;
    });
  };

  const handleRightScroll = () => {
    if (scrollingSourceRef.current === 'left') return;
    scrollingSourceRef.current = 'right';
    if (leftScrollRef.current && rightScrollRef.current) {
      leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
      leftScrollRef.current.scrollLeft = rightScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      scrollingSourceRef.current = null;
    });
  };

  // Compute unified diff lines
  const unifiedLines = useMemo(() => {
    return computeUnifiedDiffLines(originalCode, modifiedCode);
  }, [originalCode, modifiedCode]);

  // Compute side-by-side rows
  const sideBySideRows = useMemo(() => {
    return buildSideBySideRows(unifiedLines);
  }, [unifiedLines]);

  // Statistics
  const { addedCount, deletedCount } = useMemo(() => {
    let adds = 0;
    let dels = 0;
    for (const l of unifiedLines) {
      if (l.type === 'added') adds++;
      else if (l.type === 'deleted') dels++;
    }
    return { addedCount: adds, deletedCount: dels };
  }, [unifiedLines]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(modifiedCode);
      setCopied(true);
      playCyberSuccess();
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(15);
      }
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderSegmentedLine = (segments?: IntraLineSegment[], fallbackContent = '') => {
    if (!segments || segments.length === 0) {
      return fallbackContent;
    }
    return segments.map((seg, sIdx) => {
      if (seg.type === 'unchanged') {
        return <span key={sIdx}>{seg.text}</span>;
      }
      if (seg.type === 'added') {
        return (
          <span
            key={sIdx}
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.38)',
              borderRadius: '2px',
              fontWeight: 600,
              color: '#86efac',
            }}
          >
            {seg.text}
          </span>
        );
      }
      return (
        <span
          key={sIdx}
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.38)',
            borderRadius: '2px',
            fontWeight: 600,
            color: '#fca5a5',
          }}
        >
          {seg.text}
        </span>
      );
    });
  };

  return (
    <div
      style={{
        backgroundColor: 'rgba(8, 12, 24, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 12px 36px -8px rgba(0, 0, 0, 0.85)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'inherit',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          backgroundColor: 'rgba(5, 7, 17, 0.85)',
          gap: '10px',
        }}
      >
        {/* Left: Window dots & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#ff5f56' }} />
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#27c93f' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileCode size={14} color="#00d9ff" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>
              {fileName || `Diff: ${language}`}
            </span>
          </div>

          {/* Stats chip */}
          <div
            className="lx-tabular"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            <span style={{ color: '#10b981' }}>+{addedCount}</span>
            <span style={{ color: '#ef4444' }}>-{deletedCount}</span>
          </div>
        </div>

        {/* Right: Mode toggle, Copy, Apply, Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Mode Switcher */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '6px',
              padding: '2px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode('side-by-side');
                playCyberClick();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: mode === 'side-by-side' ? 'rgba(0, 217, 255, 0.15)' : 'transparent',
                color: mode === 'side-by-side' ? '#00d9ff' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
              }}
              title="Vista Lado a Lado"
            >
              <Columns size={12} />
              <span className="hidden sm:inline">Lado a Lado</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('unified');
                playCyberClick();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: mode === 'unified' ? 'rgba(0, 217, 255, 0.15)' : 'transparent',
                color: mode === 'unified' ? '#00d9ff' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
              }}
              title="Vista Unificada"
            >
              <AlignJustify size={12} />
              <span className="hidden sm:inline">Unificado</span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 9px',
              borderRadius: '6px',
              backgroundColor: copied ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: copied ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              color: copied ? '#10b981' : '#cbd5e1',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              boxShadow: copied ? '0 0 14px rgba(16, 185, 129, 0.35)' : 'none',
              transition: 'all 0.15s ease',
            }}
            title="Copiar código modificado"
          >
            {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>

          {/* Apply Button */}
          {onApply && (
            <button
              type="button"
              onClick={() => {
                playCyberSuccess();
                onApply(modifiedCode);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.18)',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                color: '#10b981',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700,
                transition: 'all 0.15s ease',
              }}
            >
              <CheckCircle2 size={12} />
              <span>Aplicar Cambios</span>
            </button>
          )}

          {/* Close Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                borderRadius: '6px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
              aria-label="Cerrar comparador"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Main Diff Content Container */}
      <div
        style={{
          maxHeight,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#080c18',
        }}
      >
        {mode === 'side-by-side' ? (
          /* Side by Side Mode */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            {/* Left Column (Original) */}
            <div
              ref={leftScrollRef}
              onScroll={handleLeftScroll}
              style={{
                overflowY: 'auto',
                overflowX: 'auto',
                borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                fontFamily: 'var(--lx-font-mono, monospace)',
                fontSize: '12px',
                lineHeight: '20px',
              }}
            >
              <div style={{ minWidth: '100%', width: 'max-content' }}>
                {sideBySideRows.map((row, idx) => {
                  const cell = row.left;
                  const isDeleted = cell.type === 'deleted';
                  const isEmpty = cell.type === 'empty';

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        backgroundColor: isDeleted
                          ? 'rgba(239, 68, 68, 0.12)'
                          : isEmpty
                          ? 'rgba(255, 255, 255, 0.015)'
                          : 'transparent',
                        color: isDeleted ? '#fca5a5' : '#cbd5e1',
                        minHeight: '20px',
                      }}
                    >
                      {showLineNumbers && (
                        <span
                          className="lx-tabular"
                          style={{
                            width: '42px',
                            padding: '0 8px',
                            textAlign: 'right',
                            userSelect: 'none',
                            color: 'rgba(255, 255, 255, 0.25)',
                            backgroundColor: '#050711',
                            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                            flexShrink: 0,
                          }}
                        >
                          {cell.lineNumber ?? ''}
                        </span>
                      )}
                      <span
                        style={{
                          width: '18px',
                          textAlign: 'center',
                          userSelect: 'none',
                          color: isDeleted ? '#ef4444' : 'transparent',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {isDeleted ? '-' : ''}
                      </span>
                      <pre
                        style={{
                          margin: 0,
                          padding: '0 8px',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          lineHeight: 'inherit',
                          whiteSpace: 'pre',
                        }}
                      >
                        {renderSegmentedLine(cell.intraLineSegments, cell.content)}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column (Modified) */}
            <div
              ref={rightScrollRef}
              onScroll={handleRightScroll}
              style={{
                overflowY: 'auto',
                overflowX: 'auto',
                fontFamily: 'var(--lx-font-mono, monospace)',
                fontSize: '12px',
                lineHeight: '20px',
              }}
            >
              <div style={{ minWidth: '100%', width: 'max-content' }}>
                {sideBySideRows.map((row, idx) => {
                  const cell = row.right;
                  const isAdded = cell.type === 'added';
                  const isEmpty = cell.type === 'empty';

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        backgroundColor: isAdded
                          ? 'rgba(16, 185, 129, 0.12)'
                          : isEmpty
                          ? 'rgba(255, 255, 255, 0.015)'
                          : 'transparent',
                        color: isAdded ? '#86efac' : '#cbd5e1',
                        minHeight: '20px',
                      }}
                    >
                      {showLineNumbers && (
                        <span
                          className="lx-tabular"
                          style={{
                            width: '42px',
                            padding: '0 8px',
                            textAlign: 'right',
                            userSelect: 'none',
                            color: 'rgba(255, 255, 255, 0.25)',
                            backgroundColor: '#050711',
                            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                            flexShrink: 0,
                          }}
                        >
                          {cell.lineNumber ?? ''}
                        </span>
                      )}
                      <span
                        style={{
                          width: '18px',
                          textAlign: 'center',
                          userSelect: 'none',
                          color: isAdded ? '#10b981' : 'transparent',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {isAdded ? '+' : ''}
                      </span>
                      <pre
                        style={{
                          margin: 0,
                          padding: '0 8px',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          lineHeight: 'inherit',
                          whiteSpace: 'pre',
                        }}
                      >
                        {renderSegmentedLine(cell.intraLineSegments, cell.content)}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Unified Inline Mode */
          <div
            style={{
              overflowY: 'auto',
              overflowX: 'auto',
              fontFamily: 'var(--lx-font-mono, monospace)',
              fontSize: '12px',
              lineHeight: '20px',
            }}
          >
            <div style={{ minWidth: '100%', width: 'max-content' }}>
              {unifiedLines.map((line, idx) => {
                const isDeleted = line.type === 'deleted';
                const isAdded = line.type === 'added';

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      backgroundColor: isDeleted
                        ? 'rgba(239, 68, 68, 0.12)'
                        : isAdded
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'transparent',
                      color: isDeleted ? '#fca5a5' : isAdded ? '#86efac' : '#cbd5e1',
                      minHeight: '20px',
                    }}
                  >
                    {showLineNumbers && (
                      <>
                        <span
                          className="lx-tabular"
                          style={{
                            width: '38px',
                            padding: '0 6px',
                            textAlign: 'right',
                            userSelect: 'none',
                            color: 'rgba(255, 255, 255, 0.25)',
                            backgroundColor: '#050711',
                            borderRight: '1px solid rgba(255, 255, 255, 0.04)',
                            flexShrink: 0,
                          }}
                        >
                          {line.oldLineNumber ?? ''}
                        </span>
                        <span
                          className="lx-tabular"
                          style={{
                            width: '38px',
                            padding: '0 6px',
                            textAlign: 'right',
                            userSelect: 'none',
                            color: 'rgba(255, 255, 255, 0.25)',
                            backgroundColor: '#050711',
                            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                            flexShrink: 0,
                          }}
                        >
                          {line.newLineNumber ?? ''}
                        </span>
                      </>
                    )}
                    <span
                      style={{
                        width: '20px',
                        textAlign: 'center',
                        userSelect: 'none',
                        color: isDeleted ? '#ef4444' : isAdded ? '#10b981' : 'transparent',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {isDeleted ? '-' : isAdded ? '+' : ' '}
                    </span>
                    <pre
                      style={{
                        margin: 0,
                        padding: '0 8px',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        lineHeight: 'inherit',
                        whiteSpace: 'pre',
                      }}
                    >
                      {renderSegmentedLine(line.intraLineSegments, line.content)}
                    </pre>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
