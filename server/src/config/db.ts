import mongoose from 'mongoose';
import config from './config';

async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.mongoURI);
    console.log('MongoDB verbunden');
  } catch (error) {
    console.error('Fehler bei der Verbindung zur MongoDB:', error);
    process.exit(1);
  }
}

export default connectDB;