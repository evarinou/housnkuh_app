/**
 * @file Tag seeding utility for initializing default tags in the database
 * @description Provides functionality to seed the database with default product tags, 
 * certifications, production methods, and special features for the marketplace
 * @author Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Tag } from '../models/Tag';

/** Default tag data for the application */
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

/**
 * Seeds the database with default tags for the application
 * @description Inserts predefined tags for products, certifications, methods, and features
 * Skips existing tags to prevent duplicates and provides detailed logging
 * @returns {Promise<void>} Promise that resolves when seeding is complete
 * @complexity O(n) where n is the number of default tags
 * @throws {Error} If database operations fail
 */
export const seedTags = async (): Promise<void> => {
  try {
    console.log('🏷️  Seeding tags...');
    
    let createdCount = 0;
    let skippedCount = 0;
    
    // Get list of default tag names to ensure we seed all of them
    const defaultTagNames = defaultTags.map(tag => tag.name);
    const existingDefaultTags = await Tag.find({ 
      name: { $in: defaultTagNames } 
    }).lean();
    
    const existingNames = new Set(existingDefaultTags.map(tag => tag.name));
    
    // Insert tags one by one, skipping existing ones
    for (const tagData of defaultTags) {
      try {
        if (!existingNames.has(tagData.name)) {
          // Generate slug manually to ensure it exists
          const slug = tagData.name
            .toLowerCase()
            .replace(/[äöüß]/g, (match) => {
              const replacements: { [key: string]: string } = {
                'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss'
              };
              return replacements[match] || match;
            })
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          
          const newTag = new Tag({
            ...tagData,
            slug: slug
          });
          await newTag.save();
          createdCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`   Error creating tag "${tagData.name}":`, error);
      }
    }
    
    console.log(`   Created ${createdCount} new tags`);
    console.log(`   Skipped ${skippedCount} existing tags`);
    
    // Show final count
    const totalTagCount = await Tag.countDocuments();
    console.log(`   Total tags in system: ${totalTagCount}`);
    
    if (createdCount > 0) {
      // Group by category for summary
      const allTags = await Tag.find({}).lean();
      const tagsByCategory = allTags.reduce((acc: any, tag) => {
        if (!acc[tag.category]) acc[tag.category] = 0;
        acc[tag.category]++;
        return acc;
      }, {});
      
      console.log('   Tags by category:');
      Object.entries(tagsByCategory).forEach(([category, count]) => {
        console.log(`     ${category}: ${count} tags`);
      });
    }
    
    console.log('✅ Tags seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding tags:', error);
    throw error;
  }
};