import { ObjectId } from 'mongodb';

import { getMongoDB } from './mongoConnection.js';

export type GoalEntry = {
  date: string; // YYYY-MM-DD
  notes?: string;
};

export type Goal = {
  _id: ObjectId;
  name: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  frequency?: 'daily' | 'weekday' | 'weekly';
  entries: GoalEntry[];
  createdAt: string;
  updatedAt: string;
};

const COLLECTION_NAME = 'goals';

export const GoalsDB = {
  async getAll(): Promise<Goal[]> {
    const db = await getMongoDB();
    const collection = db.collection<Goal>(COLLECTION_NAME);
    return await collection.find({}).toArray();
  },

  async getById(id: string): Promise<Goal | null> {
    const db = await getMongoDB();
    const collection = db.collection<Goal>(COLLECTION_NAME);
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return null; // Invalid ObjectId format
    }
    return await collection.findOne({ _id: objectId });
  },

  async create(
    goal: Omit<Goal, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<Goal> {
    const db = await getMongoDB();
    const collection = db.collection<Omit<Goal, '_id'>>(COLLECTION_NAME);
    const now = new Date().toISOString();
    const doc = {
      ...goal,
      createdAt: now,
      updatedAt: now
    };
    const result = await collection.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async update(id: string, updates: Partial<Goal>): Promise<Goal | null> {
    const db = await getMongoDB();
    const collection = db.collection<Goal>(COLLECTION_NAME);
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return null; // Invalid ObjectId format
    }
    const { _id, ...updateFields } = updates;
    const result = await collection.findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          ...updateFields,
          updatedAt: new Date().toISOString()
        }
      },
      { returnDocument: 'after' }
    );
    return result;
  },

  async delete(id: string): Promise<boolean> {
    const db = await getMongoDB();
    const collection = db.collection<Goal>(COLLECTION_NAME);
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return false; // Invalid ObjectId format
    }
    const result = await collection.deleteOne({ _id: objectId });
    return result.deletedCount > 0;
  },

  async addEntry(goalId: string, entry: GoalEntry): Promise<Goal | null> {
    const goal = await this.getById(goalId);
    if (!goal) {
      return null;
    }
    goal.entries.push(entry);
    return await this.update(goalId, goal);
  },

  async updateEntry(
    goalId: string,
    entryDate: string,
    updates: Partial<GoalEntry>
  ): Promise<Goal | null> {
    const goal = await this.getById(goalId);
    if (!goal) {
      return null;
    }
    const entryIndex = goal.entries.findIndex((e) => e.date === entryDate);
    if (entryIndex === -1) {
      return null;
    }
    goal.entries[entryIndex] = {
      ...goal.entries[entryIndex],
      ...updates
    };
    return await this.update(goalId, goal);
  },

  async deleteEntry(goalId: string, entryDate: string): Promise<Goal | null> {
    const goal = await this.getById(goalId);
    if (!goal) {
      return null;
    }
    goal.entries = goal.entries.filter((e) => e.date !== entryDate);
    return await this.update(goalId, goal);
  }
};
