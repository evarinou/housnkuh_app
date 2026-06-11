/**
 * @file Counter model — atomic named sequences
 * @purpose Collision-free sequential IDs (e.g. product EAN numbers)
 * @created 2026-06-10
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICounter extends Document {
  _id: string;
  seq: number;
}

interface ICounterModel extends Model<ICounter> {
  /** Atomically increment and return the next value of a named sequence (starts at 1). */
  getNext(name: string): Promise<number>;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 }
});

CounterSchema.statics.getNext = async function (name: string): Promise<number> {
  const doc = await this.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return doc.seq;
};

const Counter = mongoose.model<ICounter, ICounterModel>('Counter', CounterSchema);
export default Counter;
