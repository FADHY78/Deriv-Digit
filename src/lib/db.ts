import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { JournalRecord } from '../types/deriv';

interface DerivAnalyzerDB extends DBSchema {
  journal: {
    key: number;
    value: JournalRecord;
    indexes: {
      'by-symbol': string;
      'by-timestamp': number;
      'by-result': string;
    };
  };
}

const DB_NAME = 'deriv-digit-analyzer-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<DerivAnalyzerDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<DerivAnalyzerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('journal')) {
          const store = db.createObjectStore('journal', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('by-symbol', 'symbol');
          store.createIndex('by-timestamp', 'timestamp');
          store.createIndex('by-result', 'result');
        }
      },
    });
  }
  return dbPromise;
}

export class JournalStore {
  public static async addRecord(record: Omit<JournalRecord, 'id'>): Promise<number> {
    const db = await getDB();
    const id = await db.add('journal', record as JournalRecord);
    return id;
  }

  public static async getAllRecords(): Promise<JournalRecord[]> {
    const db = await getDB();
    return db.getAll('journal');
  }

  public static async getFilteredRecords(filters: {
    symbol?: string;
    contractType?: string;
    result?: 'WIN' | 'LOSS' | 'ALL';
  }): Promise<JournalRecord[]> {
    const all = await this.getAllRecords();
    return all
      .filter((rec) => {
        if (filters.symbol && filters.symbol !== 'ALL' && rec.symbol !== filters.symbol) return false;
        if (filters.contractType && filters.contractType !== 'ALL' && rec.contractType !== filters.contractType) return false;
        if (filters.result && filters.result !== 'ALL' && rec.result !== filters.result) return false;
        return true;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  public static async getAnalyticsSummary(): Promise<{
    totalTrades: number;
    totalWins: number;
    totalLosses: number;
    overallWinRate: number; // e.g. 55.4%
    totalNetProfit: number;
    signalAlignedTradesCount: number;
    signalAlignedWinRate: number; // e.g. 62.1%
    nonSignalWinRate: number;
  }> {
    const records = await this.getAllRecords();
    const totalTrades = records.length;

    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        totalWins: 0,
        totalLosses: 0,
        overallWinRate: 0,
        totalNetProfit: 0,
        signalAlignedTradesCount: 0,
        signalAlignedWinRate: 0,
        nonSignalWinRate: 0,
      };
    }

    let totalWins = 0;
    let totalNetProfit = 0;
    let alignedCount = 0;
    let alignedWins = 0;
    let nonAlignedCount = 0;
    let nonAlignedWins = 0;

    for (const rec of records) {
      const isWin = rec.result === 'WIN';
      if (isWin) totalWins++;
      totalNetProfit += rec.profit;

      if (rec.alignedWithSignal) {
        alignedCount++;
        if (isWin) alignedWins++;
      } else {
        nonAlignedCount++;
        if (isWin) nonAlignedWins++;
      }
    }

    const overallWinRate = Number(((totalWins / totalTrades) * 100).toFixed(1));
    const signalAlignedWinRate = alignedCount > 0 ? Number(((alignedWins / alignedCount) * 100).toFixed(1)) : 0;
    const nonSignalWinRate = nonAlignedCount > 0 ? Number(((nonAlignedWins / nonAlignedCount) * 100).toFixed(1)) : 0;

    return {
      totalTrades,
      totalWins,
      totalLosses: totalTrades - totalWins,
      overallWinRate,
      totalNetProfit: Number(totalNetProfit.toFixed(2)),
      signalAlignedTradesCount: alignedCount,
      signalAlignedWinRate,
      nonSignalWinRate,
    };
  }

  public static async clearAllRecords(): Promise<void> {
    const db = await getDB();
    await db.clear('journal');
  }
}
