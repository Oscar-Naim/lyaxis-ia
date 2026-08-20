export interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  picture: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  model?: 'speed' | 'cortex' | 'architect' | 'classic' | 'phantom' | 'nexus';
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  userId?: string;
  title: string;
  createdAt: string;
  model: 'speed' | 'cortex' | 'architect' | 'classic' | 'phantom' | 'nexus';
}