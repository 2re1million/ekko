import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { Meeting, ActionItem } from '@/shared/types';
import { v4 as uuidv4 } from 'uuid';

export class DatabaseService {
  private db!: sqlite3.Database;
  private dbPath: string;

  constructor() {
    this.dbPath = path.join(os.homedir(), 'MeetingIntelligence', 'meetings.db');
    this.ensureDirectoryExists();
    this.initializeDatabase();
  }

  private ensureDirectoryExists() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private initializeDatabase() {
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        throw err;
      }
      console.log('Connected to SQLite database at:', this.dbPath);
    });

    this.createTables();
  }

  private createTables() {
    const createMeetingsTable = `
      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        duration INTEGER NOT NULL,
        participants TEXT NOT NULL, -- JSON array
        transcript TEXT,
        summary TEXT,
        decisions TEXT, -- JSON array
        audioFilePath TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        tags TEXT, -- JSON array
        notes TEXT
      )
    `;

    const createActionItemsTable = `
      CREATE TABLE IF NOT EXISTS action_items (
        id TEXT PRIMARY KEY,
        meetingId TEXT NOT NULL,
        task TEXT NOT NULL,
        assignee TEXT NOT NULL,
        dueDate TEXT,
        priority TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        FOREIGN KEY (meetingId) REFERENCES meetings (id) ON DELETE CASCADE
      )
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);
      CREATE INDEX IF NOT EXISTS idx_meetings_title ON meetings(title);
      CREATE INDEX IF NOT EXISTS idx_action_items_meeting ON action_items(meetingId);
      CREATE INDEX IF NOT EXISTS idx_action_items_assignee ON action_items(assignee);
    `;

    this.db.serialize(() => {
      this.db.run(createMeetingsTable);
      this.db.run(createActionItemsTable);
      this.db.run(createIndexes);
    });
  }

  async getAllMeetings(): Promise<Meeting[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM meetings 
        ORDER BY date DESC
      `;

      this.db.all(query, async (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const meetings: Meeting[] = [];
        for (const row of rows) {
          const actionItems = await this.getActionItemsForMeeting(row.id);
          meetings.push({
            ...row,
            participants: JSON.parse(row.participants || '[]'),
            decisions: JSON.parse(row.decisions || '[]'),
            tags: JSON.parse(row.tags || '[]'),
            actionItems
          });
        }

        resolve(meetings);
      });
    });
  }

  async getMeeting(id: string): Promise<Meeting | null> {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM meetings WHERE id = ?';
      
      this.db.get(query, [id], async (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          resolve(null);
          return;
        }

        const actionItems = await this.getActionItemsForMeeting(id);
        const meeting: Meeting = {
          ...row,
          participants: JSON.parse(row.participants || '[]'),
          decisions: JSON.parse(row.decisions || '[]'),
          tags: JSON.parse(row.tags || '[]'),
          actionItems
        };

        resolve(meeting);
      });
    });
  }

  async saveMeeting(meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<Meeting> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const fullMeeting: Meeting = {
      ...meeting,
      id,
      createdAt: now,
      updatedAt: now
    };

    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO meetings (
          id, title, date, duration, participants, transcript, 
          summary, decisions, audioFilePath, createdAt, updatedAt, tags, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        fullMeeting.id,
        fullMeeting.title,
        fullMeeting.date,
        fullMeeting.duration,
        JSON.stringify(fullMeeting.participants),
        fullMeeting.transcript,
        fullMeeting.summary,
        JSON.stringify(fullMeeting.decisions),
        fullMeeting.audioFilePath,
        fullMeeting.createdAt,
        fullMeeting.updatedAt,
        JSON.stringify(fullMeeting.tags),
        fullMeeting.notes
      ];

      this.db.run(query, values, async (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Save action items
        for (const actionItem of fullMeeting.actionItems) {
          await this.saveActionItem(fullMeeting.id, actionItem);
        }

        resolve(fullMeeting);
      });
    });
  }

  async updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting | null> {
    const existingMeeting = await this.getMeeting(id);
    if (!existingMeeting) {
      return null;
    }

    const updatedMeeting: Meeting = {
      ...existingMeeting,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const query = `
        UPDATE meetings SET
          title = ?, date = ?, duration = ?, participants = ?, transcript = ?,
          summary = ?, decisions = ?, audioFilePath = ?, updatedAt = ?, tags = ?, notes = ?
        WHERE id = ?
      `;

      const values = [
        updatedMeeting.title,
        updatedMeeting.date,
        updatedMeeting.duration,
        JSON.stringify(updatedMeeting.participants),
        updatedMeeting.transcript,
        updatedMeeting.summary,
        JSON.stringify(updatedMeeting.decisions),
        updatedMeeting.audioFilePath,
        updatedMeeting.updatedAt,
        JSON.stringify(updatedMeeting.tags),
        updatedMeeting.notes,
        id
      ];

      this.db.run(query, values, async (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Update action items if provided
        if (updates.actionItems) {
          await this.deleteActionItemsForMeeting(id);
          for (const actionItem of updates.actionItems) {
            await this.saveActionItem(id, actionItem);
          }
        }

        resolve(updatedMeeting);
      });
    });
  }

  async deleteMeeting(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // SQLite will cascade delete action items
      const query = 'DELETE FROM meetings WHERE id = ?';
      
      this.db.run(query, [id], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes > 0);
      });
    });
  }

  private async getActionItemsForMeeting(meetingId: string): Promise<ActionItem[]> {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM action_items WHERE meetingId = ?';
      
      this.db.all(query, [meetingId], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const actionItems: ActionItem[] = rows.map(row => ({
          ...row,
          completed: Boolean(row.completed)
        }));

        resolve(actionItems);
      });
    });
  }

  private async saveActionItem(meetingId: string, actionItem: ActionItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO action_items (id, meetingId, task, assignee, dueDate, priority, completed)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        actionItem.id,
        meetingId,
        actionItem.task,
        actionItem.assignee,
        actionItem.dueDate,
        actionItem.priority,
        actionItem.completed ? 1 : 0
      ];

      this.db.run(query, values, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  private async deleteActionItemsForMeeting(meetingId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM action_items WHERE meetingId = ?';
      
      this.db.run(query, [meetingId], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  close(): void {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed.');
      }
    });
  }
}