export interface SillyTavernMessage {
  name?: string;
  mes?: string;
  is_user?: boolean;
  send_date?: string | number;
  id?: string | number;
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  dedupeKey: string;
  name: string;
  mes: string;
  isUser: boolean;
  rawIndex: number;
  sendDate?: string | number;
}
