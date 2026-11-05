export interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  picture: string;
  token?: string;
}

export type ModelType = 'speed' | 'cortex' | 'zenith' | 'architect' | 'classic' | 'phantom' | 'nexus' | 'forge' | 'magister' | 'root';
export type ModelId = ModelType;

/** Telemetría real de tokens reportada por el backend al cerrar el stream (o guardada en BD). */
export interface MessageUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  modelUsed?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  model?: ModelType;
  isStreaming?: boolean;
  image?: string;
  usage?: MessageUsage;
  durationMs?: number;
  parentId?: string | null;
}

export type ContrastTheme = 'oled' | 'cyber' | 'daylight';

export interface Conversation {
  id: string;
  userId?: string;
  title: string;
  createdAt: string;
  model: ModelType;
  pinned?: boolean;
  folder?: string;
}

// =====================================================================
// DAG CONVERSATION BRANCHING CONTRACTS (MILESTONE 3)
// =====================================================================

export type MessageRole = 'user' | 'model' | 'assistant' | 'system';

export interface MessageNode {
  id: string;
  parentId: string | null;
  childrenIds: string[];
  role: MessageRole;
  content: string;
  model?: ModelType | string;
  timestamp: number | string;
  image?: string;
  usage?: MessageUsage;
  metadata?: Record<string, unknown>;
}

export interface ConversationTree {
  id: string;
  title: string;
  rootMessageId: string | null;
  currentLeafId: string | null;
  nodes: Record<string, MessageNode>;
  model?: ModelType;
  userId?: string;
  isPinned?: boolean;
  folder?: string;
  createdAt: number | string;
  updatedAt: number | string;
}

// =====================================================================
// COMMAND PALETTE CONTRACTS (MILESTONE 3)
// =====================================================================

export type PaletteCategory =
  | 'engine'
  | 'session'
  | 'export'
  | 'parameters'
  | 'history'
  | 'view'
  | 'models'
  | 'triad'
  | 'chat'
  | 'views'
  | 'fx';

export interface PaletteAction {
  id: string;
  category: PaletteCategory;
  title: string;
  subtitle?: string;
  keywords?: string[];
  icon?: unknown;
  color?: string;
  badge?: string;
  shortcut?: string;
  perform?: () => void | Promise<void>;
  onExecute?: () => void;
  priority?: number;
}