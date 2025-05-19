const mongoose = require('mongoose');

// Service Schema (als Subdokument)
const ServiceSchema = new mongoose.Schema({
  mietfach: { type: mongoose.Schema.Types.ObjectId, ref: 'Mietfach', required: true },
  mietbeginn: { type: Date, required: true },
  mietende: { type: Date },
  monatspreis: { type: Number, required: true }
});

const VertragSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  datum: { type: Date, default: Date.now },
  services: [ServiceSchema]
}, { timestamps: true });
export default mongoose.model('Vertrag', VertragSchema);