export interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  picture: string;
}

export type ModelType = 'speed' | 'cortex' | 'architect' | 'classic' | 'phantom' | 'nexus' | 'forge' | 'magister' | 'root';
export type ModelId = ModelType;

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  model?: ModelType;
  isStreaming?: boolean;
  image?: string;
}

export interface Conversation {
  id: string;
  userId?: string;
  title: string;
  createdAt: string;
  model: ModelType;
}