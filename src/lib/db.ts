import Dexie, { Table } from 'dexie';

export interface Picker {
  id: string;
  name: string;
  nickname?: string;
  active: boolean;
  createdAt: number;
}

export interface Orchard {
  id: string;
  name: string;
  active: boolean;
  createdAt: number;
}

export interface Workday {
  id: string;
  date: string; // YYYY-MM-DD
  pickerIds: string[]; // List of pickers present this day
  createdAt: number;
  status?: 'open' | 'closed'; // Status field
  closedAt?: number; // Timestamp when closed
  reopenedAt?: number; // Timestamp when reopened
}

export interface Shift {
  id: string;
  workdayId: string;
  orchardId: string;
  orchardNameSnapshot: string;
  pricePerBox: number;
  createdAt: number;
}

export interface Count {
  id: string;
  workdayId: string;
  shiftId: string; // Link to specific shift/price
  pickerId: string;
  boxes: number;
  updatedAt: number;
}

export interface WeeklyClosure {
  id: string; // "YYYY-MM-DD" (start date of week)
  weekStart: string;
  weekEnd: string;
  status: 'open' | 'closed';
  closedAt?: number;
  reopenedAt?: number;
  snapshot?: any; // JSON Object with the full report data at closure time
  note?: string;
}

class TurmeiroDatabase extends Dexie {
  pickers!: Table<Picker>;
  orchards!: Table<Orchard>;
  workdays!: Table<Workday>;
  shifts!: Table<Shift>;
  counts!: Table<Count>;
  weeks!: Table<WeeklyClosure>;

  constructor() {
    super('TurmeiroCaixasDB_v2'); 
    
    (this as any).version(1).stores({
      pickers: 'id, name, active, createdAt',
      orchards: 'id, name, active, createdAt',
      workdays: 'id, date, createdAt, status',
      shifts: 'id, workdayId, orchardId, createdAt, [workdayId+createdAt]',
      counts: 'id, workdayId, shiftId, pickerId, [shiftId+pickerId], [workdayId+pickerId]',
      weeks: 'id, weekStart, status' // New table for weekly closures
    });
  }
}

export const db = new TurmeiroDatabase();