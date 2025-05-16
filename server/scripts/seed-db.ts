console.log('Seed-Skript startet...');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

// Lade Umgebungsvariablen
dotenv.config();

// Da wir nicht direkt auf die Modelle zugreifen können, definieren wir die Schemas hier
const AdresseSchema = new mongoose.Schema({
  adresstyp: { type: String, enum: ['Rechnungsadresse', 'Lieferadresse', 'Hauptadresse'] },
  strasse: String,
  hausnummer: String,
  plz: String,
  ort: String,
  telefon: String,
  email: String,
  anrede: String,
  name1: String,
  name2: String
});

const KontaktSchema = new mongoose.Schema({
  name: String,
  newslettertype: String,
  mailNewsletter: Boolean,
  status: { type: String, enum: ['aktiv', 'inaktiv'] },
  usrID: String
});

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  kontakt: KontaktSchema,
  adressen: [AdresseSchema]
}, { timestamps: true });

const MietfachSchema = new mongoose.Schema({
  bezeichnung: { type: String, required: true },
  typ: { type: String, required: true }
}, { timestamps: true });

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

// Modelle erstellen
const User = mongoose.model('User', UserSchema);
const Mietfach = mongoose.model('Mietfach', MietfachSchema);
const Vertrag = mongoose.model('Vertrag', VertragSchema);

async function connectDB(): Promise<void> {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh';
    await mongoose.connect(mongoURI);
    console.log('MongoDB verbunden');
  } catch (error) {
    console.error('Fehler bei der Verbindung zur MongoDB:', error);
    process.exit(1);
  }
}

async function seedDatabase(): Promise<void> {
  try {
    await connectDB();
    
    // Bestehende Daten löschen
    await User.deleteMany({});
    await Mietfach.deleteMany({});
    await Vertrag.deleteMany({});
    
    console.log('Bestehende Daten gelöscht');
    
    // Passwort hashen
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    // Benutzer erstellen
    const user1 = new User({
      username: 'maxmustermann',
      password: hashedPassword,
      kontakt: {
        name: 'Max Mustermann',
        newslettertype: 'monatlich',
        mailNewsletter: true,
        status: 'aktiv',
        usrID: 'usr123'
      },
      adressen: [
        {
          adresstyp: 'Hauptadresse',
          strasse: 'Musterstraße',
          hausnummer: '42',
          plz: '12345',
          ort: 'Musterstadt',
          telefon: '+49123456789',
          email: 'max@example.com',
          anrede: 'Herr',
          name1: 'Max',
          name2: 'Mustermann'
        }
      ]
    });
    
    const savedUser = await user1.save();
    console.log('Benutzer erstellt:', savedUser.username);
    
    // Mietfächer erstellen
    const mietfach1 = new Mietfach({
      bezeichnung: 'Mietfach A1',
      typ: 'Standard'
    });
    
    const mietfach2 = new Mietfach({
      bezeichnung: 'Mietfach B2',
      typ: 'Premium'
    });
    
    const savedMietfach1 = await mietfach1.save();
    const savedMietfach2 = await mietfach2.save();
    console.log('Mietfächer erstellt:', savedMietfach1.bezeichnung, savedMietfach2.bezeichnung);
    
    // Vertrag erstellen
    const vertrag1 = new Vertrag({
      user: savedUser._id,
      datum: new Date(),
      services: [
        {
          mietfach: savedMietfach1._id,
          mietbeginn: new Date(),
          mietende: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          monatspreis: 99.99
        }
      ]
    });
    
    const savedVertrag = await vertrag1.save();
    console.log('Vertrag erstellt:', savedVertrag._id);
    
    console.log('Datenbankbefüllung abgeschlossen');
    
    await mongoose.connection.close();
    console.log('Datenbankverbindung geschlossen');
    
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Fehler beim Befüllen der Datenbank:', error.message);
    } else {
      console.error('Unbekannter Fehler beim Befüllen der Datenbank');
    }
    await mongoose.connection.close();
  }
}

// Starte den Seed-Prozess
module.exports = seedDatabase;