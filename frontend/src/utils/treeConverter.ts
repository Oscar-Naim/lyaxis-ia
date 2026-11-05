import type { Message, MessageNode, ConversationTree, ModelType } from '../types';

/**
 * Convierte un historial plano tradicional (Message[]) en un árbol DAG (ConversationTree).
 * Si los mensajes carecen de parentId, los encadena de forma cronológica continua.
 */
export function convertFlatHistoryToTree(
  messages: Message[],
  meta?: Partial<ConversationTree>
): ConversationTree {
  const treeId = meta?.id || `conv-${Date.now()}`;
  const title = meta?.title || 'Conversación LYAXIS';
  const model = meta?.model || 'speed';
  const now = new Date().toISOString();

  if (!messages || messages.length === 0) {
    return {
      id: treeId,
      title,
      rootMessageId: null,
      currentLeafId: null,
      nodes: {},
      model,
      userId: meta?.userId,
      isPinned: meta?.isPinned ?? false,
      folder: meta?.folder,
      createdAt: meta?.createdAt || now,
      updatedAt: meta?.updatedAt || now,
    };
  }

  const nodes: Record<string, MessageNode> = {};

  messages.forEach((msg, idx) => {
    let parentId: string | null = null;
    if (msg.parentId !== undefined) {
      parentId = msg.parentId;
    } else if (idx > 0) {
      parentId = messages[idx - 1].id;
    }

    const ts = typeof msg.timestamp === 'number'
      ? msg.timestamp
      : (msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now());

    nodes[msg.id] = {
      id: msg.id,
      parentId,
      childrenIds: [],
      role: msg.role,
      content: msg.content,
      model: msg.model || model,
      timestamp: ts,
      image: msg.image,
      usage: msg.usage,
      metadata: msg.durationMs ? { durationMs: msg.durationMs } : undefined,
    };
  });

  // Construir referencias bidireccionales childrenIds
  Object.values(nodes).forEach((node) => {
    if (node.parentId && nodes[node.parentId]) {
      const parent = nodes[node.parentId];
      if (!parent.childrenIds.includes(node.id)) {
        parent.childrenIds.push(node.id);
      }
    }
  });

  const rootMessageId = messages[0]?.id || null;
  const currentLeafId = messages[messages.length - 1]?.id || null;

  return {
    id: treeId,
    title,
    rootMessageId,
    currentLeafId,
    nodes,
    model,
    userId: meta?.userId,
    isPinned: meta?.isPinned ?? false,
    folder: meta?.folder,
    createdAt: meta?.createdAt || now,
    updatedAt: meta?.updatedAt || now,
  };
}

/**
 * Obtiene el arreglo lineal activo de mensajes (Message[]) desde la raíz hasta la hoja actual.
 * Compatible al 100% con los componentes existentes de renderizado de chat.
 */
export function getActiveBranchMessages(
  tree: ConversationTree,
  leafId?: string | null
): Message[] {
  if (!tree || !tree.rootMessageId || Object.keys(tree.nodes).length === 0) {
    return [];
  }

  let targetId = leafId || tree.currentLeafId;
  if (!targetId || !tree.nodes[targetId]) {
    // Si la hoja no existe, encontrar cualquier nodo sin hijos o usar la raíz
    const leaves = Object.values(tree.nodes).filter((n) => n.childrenIds.length === 0);
    targetId = leaves.length > 0 ? leaves[leaves.length - 1].id : tree.rootMessageId;
  }

  const branch: Message[] = [];
  let currId: string | null = targetId;
  const visited = new Set<string>(); // Protección estricta contra ciclos

  while (currId && tree.nodes[currId] && !visited.has(currId)) {
    visited.add(currId);
    const node: MessageNode = tree.nodes[currId];
    branch.unshift({
      id: node.id,
      role: (node.role === 'assistant' ? 'model' : node.role) as 'user' | 'model',
      content: node.content,
      timestamp: typeof node.timestamp === 'number'
        ? new Date(node.timestamp).toISOString()
        : String(node.timestamp),
      model: node.model as ModelType | undefined,
      image: node.image,
      usage: node.usage,
      parentId: node.parentId,
    });
    currId = node.parentId;
  }

  return branch;
}

/**
 * Agrega un nuevo nodo al árbol y actualiza currentLeafId.
 */
export function addMessageToTree(
  tree: ConversationTree,
  msg: Partial<MessageNode> & { id: string; content: string; role: MessageNode['role'] }
): ConversationTree {
  const parentId = msg.parentId !== undefined ? msg.parentId : tree.currentLeafId;
  const newNode: MessageNode = {
    id: msg.id,
    parentId,
    childrenIds: [],
    role: msg.role,
    content: msg.content,
    model: msg.model || tree.model,
    timestamp: msg.timestamp || Date.now(),
    image: msg.image,
    usage: msg.usage,
    metadata: msg.metadata,
  };

  const updatedNodes = { ...tree.nodes, [newNode.id]: newNode };

  if (parentId && updatedNodes[parentId]) {
    const parent = updatedNodes[parentId];
    if (!parent.childrenIds.includes(newNode.id)) {
      updatedNodes[parentId] = {
        ...parent,
        childrenIds: [...parent.childrenIds, newNode.id],
      };
    }
  }

  return {
    ...tree,
    rootMessageId: tree.rootMessageId || newNode.id,
    currentLeafId: newNode.id,
    nodes: updatedNodes,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Encuentra la hoja más profunda / reciente a partir de un nodo dado.
 */
export function findDeepestLeaf(tree: ConversationTree, startNodeId: string): string {
  let curr = tree.nodes[startNodeId];
  if (!curr) return startNodeId;
  const visited = new Set<string>();
  while (curr.childrenIds && curr.childrenIds.length > 0 && !visited.has(curr.id)) {
    visited.add(curr.id);
    const nextId = curr.childrenIds[curr.childrenIds.length - 1];
    if (!tree.nodes[nextId]) break;
    curr = tree.nodes[nextId];
  }
  return curr.id;
}

/**
 * Cambia la rama activa navegando hacia un nodo hermano o específico.
 */
export function switchActiveBranch(tree: ConversationTree, targetNodeId: string): ConversationTree {
  if (!tree.nodes[targetNodeId]) return tree;
  const leafId = findDeepestLeaf(tree, targetNodeId);
  return {
    ...tree,
    currentLeafId: leafId,
    updatedAt: new Date().toISOString(),
  };
}
