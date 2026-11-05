import { describe, it, expect } from 'vitest';
import type { Message, ConversationTree, PaletteAction } from '../types';
import {
  convertFlatHistoryToTree,
  getActiveBranchMessages,
  addMessageToTree,
  findDeepestLeaf,
  switchActiveBranch,
} from '../utils/treeConverter';
import {
  myersDiff,
  tokenizeLineForDiff,
  computeIntraLineDiff,
  computeUnifiedDiffLines,
  buildSideBySideRows,
} from '../components/DiffViewer';
import { computeFuzzyScore } from '../components/CommandPalette';

// =====================================================================
// 1. MYERS LCS DIFF & INTRA-LINE ENGINE TESTS
// =====================================================================

describe('Myers LCS Diff Engine (Pure TypeScript)', () => {
  it('fast-path: identical sequences produce all unchanged items', () => {
    const a = ['line 1', 'line 2', 'line 3'];
    const b = ['line 1', 'line 2', 'line 3'];
    const diff = myersDiff(a, b);

    expect(diff).toHaveLength(3);
    expect(diff.every((d) => d.type === 'unchanged')).toBe(true);
    expect(diff.map((d) => d.item)).toEqual(a);
  });

  it('fast-path: empty original sequence produces all added items', () => {
    const a: string[] = [];
    const b = ['new line 1', 'new line 2'];
    const diff = myersDiff(a, b);

    expect(diff).toHaveLength(2);
    expect(diff.every((d) => d.type === 'added')).toBe(true);
    expect(diff.map((d) => d.item)).toEqual(b);
  });

  it('fast-path: empty modified sequence produces all deleted items', () => {
    const a = ['old line 1', 'old line 2'];
    const b: string[] = [];
    const diff = myersDiff(a, b);

    expect(diff).toHaveLength(2);
    expect(diff.every((d) => d.type === 'deleted')).toBe(true);
    expect(diff.map((d) => d.item)).toEqual(a);
  });

  it('accurately detects single insertion, deletion, and replacement', () => {
    const a = ['apple', 'banana', 'cherry'];
    const b = ['apple', 'blueberry', 'cherry', 'date'];
    const diff = myersDiff(a, b);

    const deleted = diff.filter((d) => d.type === 'deleted').map((d) => d.item);
    const added = diff.filter((d) => d.type === 'added').map((d) => d.item);
    const unchanged = diff.filter((d) => d.type === 'unchanged').map((d) => d.item);

    expect(deleted).toEqual(['banana']);
    expect(added).toEqual(['blueberry', 'date']);
    expect(unchanged).toEqual(['apple', 'cherry']);
  });

  it('tokenizes lines preserving identifiers, whitespace, and punctuation', () => {
    const tokens = tokenizeLineForDiff('const count = 42; // counter');
    expect(tokens).toEqual([
      'const', ' ', 'count', ' ', '=', ' ', '42', ';', ' ', '/', '/', ' ', 'counter'
    ]);
  });

  it('intra-line diff highlights exact modified word within a paired line', () => {
    const deleted = 'let count = 0;';
    const added = 'let totalCount = 0;';

    const { deletedSegments, addedSegments } = computeIntraLineDiff(deleted, added);

    // Verify deleted has 'count' marked deleted
    const deletedWord = deletedSegments.find((s) => s.text === 'count');
    expect(deletedWord).toBeDefined();
    expect(deletedWord?.type).toBe('deleted');

    // Verify added has 'totalCount' marked added
    const addedWord = addedSegments.find((s) => s.text === 'totalCount');
    expect(addedWord).toBeDefined();
    expect(addedWord?.type).toBe('added');

    // Verify unchanged keywords 'let', ' = ', '0;' remain unchanged
    const unchangedDeleted = deletedSegments.filter((s) => s.type === 'unchanged').map((s) => s.text).join('');
    const unchangedAdded = addedSegments.filter((s) => s.type === 'unchanged').map((s) => s.text).join('');
    expect(unchangedDeleted).toBe(unchangedAdded);
  });

  it('computeUnifiedDiffLines assigns correct line numbers and groupings', () => {
    const orig = 'line A\nline B\nline C';
    const mod = 'line A\nline B modified\nline C\nline D';

    const lines = computeUnifiedDiffLines(orig, mod);
    expect(lines.length).toBeGreaterThanOrEqual(4);

    const lineA = lines[0];
    expect(lineA.type).toBe('unchanged');
    expect(lineA.oldLineNumber).toBe(1);
    expect(lineA.newLineNumber).toBe(1);

    const lastLine = lines[lines.length - 1];
    expect(lastLine.type).toBe('added');
    expect(lastLine.content).toBe('line D');
  });

  it('buildSideBySideRows generates aligned pairs and empty filler cells', () => {
    const orig = 'alpha\nbeta\ngamma';
    const mod = 'alpha\nbeta 1\nbeta 2\ngamma';

    const unified = computeUnifiedDiffLines(orig, mod);
    const rows = buildSideBySideRows(unified);

    expect(rows.length).toBeGreaterThan(0);
    // Find row with empty left side (filler cell corresponding to second addition)
    const fillerRow = rows.find((r) => r.left.type === 'empty' && r.right.type === 'added');
    expect(fillerRow).toBeDefined();
    expect(fillerRow?.left.content).toBe('');
    expect(fillerRow?.right.content).toBe('beta 2');
  });
});

// =====================================================================
// 2. DAG BRANCHING CONVERTER & TRAVERSAL TESTS
// =====================================================================

describe('DAG Branching treeConverter Engine', () => {
  it('convertFlatHistoryToTree correctly transforms flat linear history', () => {
    const flatMessages: Message[] = [
      { id: 'm1', role: 'user', content: 'Hello', timestamp: '2026-11-05T00:00:00Z' },
      { id: 'm2', role: 'model', content: 'Hi there', timestamp: '2026-11-05T00:00:01Z' },
      { id: 'm3', role: 'user', content: 'How are you?', timestamp: '2026-11-05T00:00:02Z' },
    ];

    const tree = convertFlatHistoryToTree(flatMessages, { id: 'conv-test', title: 'Test DAG' });

    expect(tree.id).toBe('conv-test');
    expect(tree.rootMessageId).toBe('m1');
    expect(tree.currentLeafId).toBe('m3');
    expect(Object.keys(tree.nodes)).toHaveLength(3);

    // Verify parent-child links
    expect(tree.nodes['m1'].parentId).toBeNull();
    expect(tree.nodes['m1'].childrenIds).toEqual(['m2']);

    expect(tree.nodes['m2'].parentId).toBe('m1');
    expect(tree.nodes['m2'].childrenIds).toEqual(['m3']);

    expect(tree.nodes['m3'].parentId).toBe('m2');
    expect(tree.nodes['m3'].childrenIds).toEqual([]);
  });

  it('getActiveBranchMessages reconstructs exact branch from root to leaf', () => {
    const flatMessages: Message[] = [
      { id: 'm1', role: 'user', content: 'Question 1', timestamp: '2026-11-05T00:00:00Z' },
      { id: 'm2', role: 'model', content: 'Answer 1', timestamp: '2026-11-05T00:00:01Z' },
    ];
    const tree = convertFlatHistoryToTree(flatMessages);

    const activeBranch = getActiveBranchMessages(tree);
    expect(activeBranch).toHaveLength(2);
    expect(activeBranch[0].id).toBe('m1');
    expect(activeBranch[1].id).toBe('m2');
  });

  it('addMessageToTree branches from an existing node without mutating history', () => {
    const flatMessages: Message[] = [
      { id: 'm1', role: 'user', content: 'Question 1', timestamp: '2026-11-05T00:00:00Z' },
      { id: 'm2', role: 'model', content: 'Answer 1', timestamp: '2026-11-05T00:00:01Z' },
    ];
    let tree = convertFlatHistoryToTree(flatMessages);

    // Branch off from m1 with an alternative question m3
    tree = addMessageToTree(tree, {
      id: 'm3',
      parentId: 'm1',
      role: 'user',
      content: 'Alternative Question 1',
    });

    // Parent m1 now has two children: m2 and m3
    expect(tree.nodes['m1'].childrenIds).toEqual(['m2', 'm3']);
    expect(tree.currentLeafId).toBe('m3');

    // Active branch now reflects m1 -> m3
    const branch = getActiveBranchMessages(tree);
    expect(branch.map((b) => b.id)).toEqual(['m1', 'm3']);

    // Original answer m2 is still preserved in the graph intact!
    expect(tree.nodes['m2']).toBeDefined();
    expect(tree.nodes['m2'].content).toBe('Answer 1');
  });

  it('findDeepestLeaf and switchActiveBranch navigate between alternative branches', () => {
    const flatMessages: Message[] = [
      { id: 'm1', role: 'user', content: 'Q1', timestamp: '2026-11-05T00:00:00Z' },
      { id: 'm2', role: 'model', content: 'A1', timestamp: '2026-11-05T00:00:01Z' },
    ];
    let tree = convertFlatHistoryToTree(flatMessages);

    // Create branch 2: m3 -> m4
    tree = addMessageToTree(tree, { id: 'm3', parentId: 'm1', role: 'user', content: 'Alt Q1' });
    tree = addMessageToTree(tree, { id: 'm4', parentId: 'm3', role: 'model', content: 'Alt A1' });

    // Active leaf is currently m4
    expect(tree.currentLeafId).toBe('m4');

    // Switch back to original branch m2
    tree = switchActiveBranch(tree, 'm2');
    expect(tree.currentLeafId).toBe('m2');

    const branch = getActiveBranchMessages(tree);
    expect(branch.map((b) => b.id)).toEqual(['m1', 'm2']);
  });

  it('cycle guard prevents infinite loop on circular parent reference', () => {
    // Construct an artificial cyclic graph
    const cyclicTree: ConversationTree = {
      id: 'cyclic',
      title: 'Cyclic Graph',
      rootMessageId: 'n1',
      currentLeafId: 'n2',
      nodes: {
        n1: { id: 'n1', parentId: 'n2', childrenIds: ['n2'], role: 'user', content: 'N1', timestamp: 1 },
        n2: { id: 'n2', parentId: 'n1', childrenIds: ['n1'], role: 'model', content: 'N2', timestamp: 2 },
      },
      createdAt: '2026-11-05T00:00:00Z',
      updatedAt: '2026-11-05T00:00:00Z',
    };

    // Traversal must terminate safely without hanging
    const branch = getActiveBranchMessages(cyclicTree);
    expect(branch).toHaveLength(2);

    // findDeepestLeaf must also terminate safely without hanging
    const deepest = findDeepestLeaf(cyclicTree, 'n1');
    expect(['n1', 'n2']).toContain(deepest);
  });
});

// =====================================================================
// 3. COMMAND PALETTE FUZZY SCORING TESTS
// =====================================================================

describe('CommandPalette Fuzzy Scoring Algorithm', () => {
  const sampleAction: PaletteAction = {
    id: 'speed',
    category: 'engine',
    title: 'Activar Motor: Speed',
    subtitle: 'Daily Driver ultra-rápido',
    keywords: ['speed', 'motor', 'ia', '@speed'],
    shortcut: '@speed',
    perform: () => {},
    priority: 20,
  };

  it('exact match returns highest score (+200)', () => {
    const score = computeFuzzyScore('@speed', sampleAction);
    expect(score).toBeGreaterThanOrEqual(200);
  });

  it('exact prefix match returns >= 100 points', () => {
    const score = computeFuzzyScore('act', sampleAction);
    expect(score).toBeGreaterThanOrEqual(100);
  });

  it('acronym match yields bonus points', () => {
    const multiWordAction: PaletteAction = {
      id: 'cmd-new',
      category: 'session',
      title: 'Nueva Sesion Chat',
      keywords: [],
      perform: () => {},
    };
    const score = computeFuzzyScore('nsc', multiWordAction);
    expect(score).toBeGreaterThanOrEqual(60);
  });

  it('subsequence matching applies character distance penalty', () => {
    const action: PaletteAction = {
      id: 'test',
      category: 'engine',
      title: 'abcdefghij',
      keywords: [],
      perform: () => {},
    };
    // Close characters: 'abc'
    const closeScore = computeFuzzyScore('abc', action);
    // Spaced characters: 'adj'
    const spacedScore = computeFuzzyScore('adj', action);

    expect(closeScore).toBeGreaterThan(spacedScore);
  });

  it('returns 0 for non-matching queries', () => {
    const score = computeFuzzyScore('xyz999nonexistent', sampleAction);
    expect(score).toBe(0);
  });
});
