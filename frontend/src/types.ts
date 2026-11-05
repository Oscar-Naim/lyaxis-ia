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