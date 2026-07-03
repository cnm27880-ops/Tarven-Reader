export interface SillyTavernMessage {
  name?: string;
  mes?: string;
  is_user?: boolean;
  send_date?: string | number;
  [key: string]: any;
}

export interface ChatMessage {
  id: string; // we'll generate an ID for React keys and deduplication
  name: string;
  mes: string;
  isUser: boolean;
  rawIndex: number;
}
