const mongoose = require('mongoose');

// Default tag data for the application
const defaultTags = [
  // Product Categories
  {
    name: 'Obst & Gemüse',
    category: 'product',
    color: '#10B981',
    icon: '🥕',
    description: 'Frisches Obst und Gemüse aus regionalem Anbau'
  },
  {
    name: 'Fleisch & Wurst',
    category: 'product',
    color: '#EF4444',
    icon: '🥩',
    description: 'Hochwertiges Fleisch und Wurstwaren von regionalen Erzeugern'
  },
  {
    name: 'Milchprodukte',
    category: 'product',
    color: '#F3F4F6',
    icon: '🥛',
    description: 'Frische Milch, Käse, Joghurt und andere Milcherzeugnisse'
  },
  {
    name: 'Backwaren',
    category: 'product',
    color: '#D97706',
    icon: '🍞',
    description: 'Frisches Brot, Brötchen und andere Backwaren'
  },
  {
    name: 'Eier',
    category: 'product',
    color: '#FCD34D',
    icon: '🥚',
    description: 'Frische Eier von freilaufenden Hühnern'
  },
  {
    name: 'Honig & Imkereiprodukte',
    category: 'product',
    color: '#FBBF24',
    icon: '🍯',
    description: 'Naturreiner Honig und Imkereiprodukte'
  },
  {
    name: 'Konserven & Eingelegtes',
    category: 'product',
    color: '#8B5CF6',
    icon: '🫙',
    description: 'Eingemachtes, Konserven und haltbare Produkte'
  },
  {
    name: 'Kräuter & Gewürze',
    category: 'product',
    color: '#059669',
    icon: '🌿',
    description: 'Frische und getrocknete Kräuter sowie Gewürze'
  },
  {
    name: 'Getränke',
    category: 'product',
    color: '#3B82F6',
    icon: '🥤',
    description: 'Säfte, Most und andere regionale Getränke'
  },
  {
    name: 'Spirituosen',
    category: 'product',
    color: '#7C3AED',
    icon: '🍷',
    description: 'Regional hergestellte Spirituosen und Liköre'
  },

  // Certifications
  {
    name: 'Bio-zertifiziert',
    category: 'certification',
    color: '#16A34A',
    icon: '🌱',
    description: 'Offiziell zertifizierte ökologische Landwirtschaft'
  },
  {
    name: 'Demeter',
    category: 'certification',
    color: '#059669',
    icon: '🌾',
    description: 'Biodynamische Landwirtschaft nach Demeter-Standards'
  },
  {
    name: 'Naturland',
    category: 'certification',
    color: '#0D9488',
    icon: '🌿',
    description: 'Naturland-zertifizierte ökologische Erzeugung'
  },
  {
    name: 'Regional',
    category: 'certification',
    color: '#2563EB',
    icon: '🏡',
    description: 'Aus der Region stammende Produkte'
  },
  {
    name: 'Fairtrade',
    category: 'certification',
    color: '#DC2626',
    icon: '🤝',
    description: 'Fair gehandelte Produkte'
  },

  // Production Methods
  {
    name: 'Freilandhaltung',
    category: 'method',
    color: '#65A30D',
    icon: '🐄',
    description: 'Tiere mit Zugang zu Freilandflächen'
  },
  {
    name: 'Weidehaltung',
    category: 'method',
    color: '#16A34A',
    icon: '🌱',
    description: 'Ganzjährige oder saisonale Weidehaltung'
  },
  {
    name: 'Handgemacht',
    category: 'method',
    color: '#DC2626',
    icon: '👋',
    description: 'In Handarbeit hergestellte Produkte'
  },
  {
    name: 'Traditionell',
    category: 'method',
    color: '#92400E',
    icon: '⚖️',
    description: 'Nach traditionellen Methoden hergestellt'
  },
  {
    name: 'Saisonal',
    category: 'method',
    color: '#EA580C',
    icon: '🍂',
    description: 'Saisonale Verfügbarkeit, abhängig von Erntezeiten'
  },
  {
    name: 'Selbstgemacht',
    category: 'method',
    color: '#7C2D12',
    icon: '🏠',
    description: 'Eigenproduktion im Hofverkauf'
  },

  // Special Features
  {
    name: 'Glutenfrei',
    category: 'feature',
    color: '#F59E0B',
    icon: '🌾',
    description: 'Produkte ohne Gluten'
  },
  {
    name: 'Laktosefrei',
    category: 'feature',
    color: '#06B6D4',
    icon: '🥛',
    description: 'Produkte ohne Laktose'
  },
  {
    name: 'Vegan',
    category: 'feature',
    color: '#10B981',
    icon: '🌱',
    description: 'Rein pflanzliche Produkte'
  },
  {
    name: 'Vegetarisch',
    category: 'feature',
    color: '#059669',
    icon: '🥬',
    description: 'Vegetarische Produkte'
  },
  {
    name: 'Ungekühlt haltbar',
    category: 'feature',
    color: '#8B5CF6',
    icon: '📦',
    description: 'Produkte die bei Raumtemperatur gelagert werden können'
  },
  {
    name: 'Tiefkühlung erforderlich',
    category: 'feature',
    color: '#3B82F6',
    icon: '❄️',
    description: 'Produkte die gekühlt oder tiefgefroren werden müssen'
  }
];

// Tag Schema - muss hier definiert werden, da wir das Model direkt brauchen
const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxLength: 50
  },
  category: {
    type: String,
    required: true,
    enum: ['product', 'certification', 'method', 'feature'],
    index: true
  },
  color: {
    type: String,
    required: true,
    match: /^#[0-9A-F]{6}$/i
  },
  icon: {
    type: String,
    maxLength: 10
  },
  description: {
    type: String,
    maxLength: 200
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
TagSchema.index({ category: 1, name: 1 });
TagSchema.index({ isActive: 1 });

const Tag = mongoose.models.Tag || mongoose.model('Tag', TagSchema);

const seedTags = async () => {
  try {
    console.log('🏷️  Seeding tags...');
    
    // Clear existing tags
    await Tag.deleteMany({});
    console.log('   Cleared existing tags');
    
    // Insert new tags
    const createdTags = await Tag.insertMany(defaultTags);
    console.log(`   Created ${createdTags.length} tags`);
    
    // Group by category for summary
    const tagsByCategory = createdTags.reduce((acc, tag) => {
      if (!acc[tag.category]) acc[tag.category] = 0;
      acc[tag.category]++;
      return acc;
    }, {});
    
    console.log('   Tags by category:');
    Object.entries(tagsByCategory).forEach(([category, count]) => {
      console.log(`     ${category}: ${count} tags`);
    });
    
    console.log('✅ Tags seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding tags:', error);
    throw error;
  }
};

// Export for use in other scripts
module.exports = { seedTags, defaultTags };

// Run directly if called from command line
if (require.main === module) {
  (async () => {
    try {
      // Connect to MongoDB
      const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh';
      await mongoose.connect(mongoUri);
      console.log('📦 Connected to MongoDB');
      
      await seedTags();
      
      await mongoose.disconnect();
      console.log('📦 Disconnected from MongoDB');
      console.log('🎉 Tag seeding completed successfully');
    } catch (error) {
      console.error('💥 Error in tag seeding:', error);
      process.exit(1);
    }
  })();
}