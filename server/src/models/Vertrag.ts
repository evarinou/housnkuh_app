import mongoose, { Schema } from 'mongoose';
import { IVertrag } from '../types/modelTypes';

// Service Schema
const ServiceSchema = new Schema({
  mietfach: {
    type: Schema.Types.ObjectId,
    ref: 'Mietfach',
    required: true
  },
  mietbeginn: {
    type: Date,
    required: true
  },
  mietende: Date,
  monatspreis: {
    type: Number,
    required: true
  }
});

// Vertrag Schema
const VertragSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  datum: {
    type: Date,
    default: Date.now
  },
  services: [ServiceSchema]
}, { timestamps: true });

export default mongoose.model<IVertrag>('Vertrag', VertragSchema);