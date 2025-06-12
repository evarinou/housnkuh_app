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
    required: true,
    enum: ['regal', 'regal-b', 'kuehlregal', 'gefrierregal', 'verkaufstisch', 'sonstiges', 'schaufenster']
  },
  beschreibung: {
    type: String,
    trim: true
  },
  groesse: {
    flaeche: {
      type: Number,
      default: 1
    },
    einheit: {
      type: String,
      default: 'm²'
    }
  },
  verfuegbar: {
    type: Boolean,
    default: true
  },
  aktuellerVertrag: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vertrag'
  },
  zugewiesenAn: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  standort: {
    type: String,
    trim: true
  },
  features: {
    type: [String],
    default: []
  }
}, { timestamps: true });

export default mongoose.model<IMietfach>('Mietfach', MietfachSchema);