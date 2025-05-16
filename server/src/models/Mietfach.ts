import mongoose, { Schema } from 'mongoose';
import { IMietfach } from '../types/modelTypes';

const MietfachSchema = new Schema({
  bezeichnung: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  typ: {
    type: String,
    required: true
  }
}, { timestamps: true });

export default mongoose.model<IMietfach>('Mietfach', MietfachSchema);