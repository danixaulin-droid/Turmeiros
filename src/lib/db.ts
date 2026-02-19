import Dexie, { Table } from "dexie";

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
  status?: "open" | "closed";
  closedAt?: number;
  reopenedAt?: number;
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
  shiftId: string;
  pickerId: string;
  boxes: number;
  updatedAt: number;
}

export interface WeeklyClosure {
  id: string; // "YYYY-MM-DD" (start date of week)
  weekStart: string;
  weekEnd: string;
  status: "open" | "closed";
  closedAt?: number;
  reopenedAt?: number;
  snapshot?: any; // snapshot do relatório ao fechar
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
    super("TurmeiroCaixasDB_v2");

    // v1
    this.version(1).stores({
      pickers: "id, name, active, createdAt",
      orchards: "id, name, active, createdAt",
      workdays: "id, date, createdAt, status",
      shifts: "id, workdayId, orchardId, createdAt, [workdayId+createdAt]",
      counts:
        "id, workdayId, shiftId, pickerId, [shiftId+pickerId], [workdayId+pickerId]",
      weeks: "id, weekStart, status",
    });

    // v2 (mantém igual + backfill status)
    this.version(2)
      .stores({
        pickers: "id, name, active, createdAt",
        orchards: "id, name, active, createdAt",
        workdays: "id, date, createdAt, status",
        shifts: "id, workdayId, orchardId, createdAt, [workdayId+createdAt]",
        counts:
          "id, workdayId, shiftId, pickerId, [shiftId+pickerId], [workdayId+pickerId]",
        weeks: "id, weekStart, status",
      })
      .upgrade(async (tx) => {
        // Backfill status para não quebrar filtros
        const workdays = tx.table("workdays");
        await workdays.toCollection().modify((w: any) => {
          if (!w.status) w.status = w.closedAt ? "closed" : "open";
        });
      });
  }
}

/**
 * ✅ Next 14 / App Router:
 * Evita instanciar Dexie no server (SSR/Build), só cria no browser.
 */
export const db: TurmeiroDatabase =
  typeof window !== "undefined" ? new TurmeiroDatabase() : (null as any);
