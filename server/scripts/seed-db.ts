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
  email: String,
  telefon: String,
  newslettertype: String,
  mailNewsletter: Boolean,
  status: { type: String, enum: ['aktiv', 'inaktiv'] },
  usrID: String
});

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  kontakt: KontaktSchema,
  adressen: [AdresseSchema],
  isAdmin: { type: Boolean, default: false },
  isVendor: { type: Boolean, default: false },
  isFullAccount: { type: Boolean, default: false },
  vendorProfile: {
    unternehmen: String,
    beschreibung: String,
    profilBild: String,
    oeffnungszeiten: Object,
    kategorien: [String],
    slogan: String,
    website: String,
    socialMedia: Object,
    verifyStatus: String
  },
  emailVerificationToken: String,
  emailVerified: { type: Boolean, default: false }
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
    console.log('Versuche Verbindung zu MongoDB:', mongoURI);
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
    
    // Vendor-Benutzer erstellen
    const vendor1 = new User({
      username: 'hofmueller',
      password: hashedPassword,
      isVendor: true,
      isFullAccount: true,
      emailVerified: true,
      kontakt: {
        name: 'Hof Müller',
        email: 'info@hof-mueller.de',
        telefon: '+49987654321',
        newslettertype: 'monatlich',
        mailNewsletter: true,
        status: 'aktiv',
        usrID: 'vendor001'
      },
      adressen: [
        {
          adresstyp: 'Hauptadresse',
          strasse: 'Hofstraße',
          hausnummer: '1',
          plz: '54321',
          ort: 'Bauernhausen',
          telefon: '+49987654321',
          email: 'info@hof-mueller.de',
          anrede: 'Firma',
          name1: 'Hof',
          name2: 'Müller'
        }
      ]
    });
    
    const vendor2 = new User({
      username: 'biohof_schmidt',
      password: hashedPassword,
      isVendor: true,
      isFullAccount: true,
      emailVerified: true,
      kontakt: {
        name: 'Biohof Schmidt',
        email: 'kontakt@biohof-schmidt.de',
        telefon: '+49555123456',
        newslettertype: 'wöchentlich',
        mailNewsletter: true,
        status: 'aktiv',
        usrID: 'vendor002'
      },
      adressen: [
        {
          adresstyp: 'Hauptadresse',
          strasse: 'Landstraße',
          hausnummer: '15',
          plz: '67890',
          ort: 'Grüntal',
          telefon: '+49555123456',
          email: 'kontakt@biohof-schmidt.de',
          anrede: 'Firma',
          name1: 'Biohof',
          name2: 'Schmidt'
        }
      ]
    });

    // Admin-Benutzer erstellen
    const admin1 = new User({
      username: 'admin',
      password: hashedPassword,
      isAdmin: true,
      isFullAccount: true,
      emailVerified: true,
      kontakt: {
        name: 'Admin User',
        email: 'admin@housnkuh.de',
        telefon: '+49111222333',
        newslettertype: 'monatlich',
        mailNewsletter: false,
        status: 'aktiv',
        usrID: 'admin001'
      },
      adressen: [
        {
          adresstyp: 'Hauptadresse',
          strasse: 'Adminstraße',
          hausnummer: '1',
          plz: '10000',
          ort: 'Adminstadt',
          telefon: '+49111222333',
          email: 'admin@housnkuh.de',
          anrede: 'Herr',
          name1: 'Admin',
          name2: 'User'
        }
      ]
    });
    
    const savedVendor1 = await vendor1.save();
    const savedVendor2 = await vendor2.save();
    const savedAdmin = await admin1.save();
    console.log('Vendor-Benutzer erstellt:', savedVendor1.username, savedVendor2.username);
    console.log('Admin-Benutzer erstellt:', savedAdmin.username);
    
    // Mietfächer erstellen
    const mietfach1 = new Mietfach({
      bezeichnung: 'Mietfach A1',
      typ: 'Standard'
    });
    
    const mietfach2 = new Mietfach({
      bezeichnung: 'Mietfach B2',
      typ: 'Premium'
    });
    
    const mietfach3 = new Mietfach({
      bezeichnung: 'Mietfach C3',
      typ: 'Standard'
    });
    
    const mietfach4 = new Mietfach({
      bezeichnung: 'Mietfach D4',
      typ: 'Premium'
    });
    
    const savedMietfach1 = await mietfach1.save();
    const savedMietfach2 = await mietfach2.save();
    const savedMietfach3 = await mietfach3.save();
    const savedMietfach4 = await mietfach4.save();
    console.log('Mietfächer erstellt:', savedMietfach1.bezeichnung, savedMietfach2.bezeichnung, savedMietfach3.bezeichnung, savedMietfach4.bezeichnung);
    
    // Verträge erstellen
    const vertrag1 = new Vertrag({
      user: savedVendor1._id,
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
    
    const vertrag2 = new Vertrag({
      user: savedVendor2._id,
      datum: new Date(new Date().setMonth(new Date().getMonth() - 2)),
      services: [
        {
          mietfach: savedMietfach2._id,
          mietbeginn: new Date(new Date().setMonth(new Date().getMonth() - 2)),
          mietende: new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
          monatspreis: 149.99
        },
        {
          mietfach: savedMietfach3._id,
          mietbeginn: new Date(),
          mietende: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          monatspreis: 89.99
        }
      ]
    });
    
    const vertrag3 = new Vertrag({
      user: savedVendor1._id,
      datum: new Date(new Date().setMonth(new Date().getMonth() - 3)),
      services: [
        {
          mietfach: savedMietfach4._id,
          mietbeginn: new Date(new Date().setMonth(new Date().getMonth() - 3)),
          mietende: new Date(new Date().setMonth(new Date().getMonth() + 9)),
          monatspreis: 199.99
        }
      ]
    });
    
    const savedVertrag1 = await vertrag1.save();
    const savedVertrag2 = await vertrag2.save();
    const savedVertrag3 = await vertrag3.save();
    console.log('Verträge erstellt:', savedVertrag1._id, savedVertrag2._id, savedVertrag3._id);
    
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
seedDatabase().then(() => {
  console.log('Seed-Prozess abgeschlossen');
  process.exit(0);
}).catch((error) => {
  console.error('Fehler beim Seed-Prozess:', error);
  process.exit(1);
});