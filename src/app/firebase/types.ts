export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  color: string;
}

export interface Document {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  authorName: string;
  cells: Record<string, Cell>;
}

export interface Cell {
  value: string;
  formula?: string;
  computedValue?: number | string;
  format?: CellFormat;
}

export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
}

export interface Presence {
  userId: string;
  userName: string;
  userColor: string;
  lastSeen: Date;
  cursor?: {
    row: number;
    col: number;
  };
}

export interface WriteState {
  status: 'saved' | 'saving';
  lastSaved?: Date;
}
