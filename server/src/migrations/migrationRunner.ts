import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

interface Migration {
  version: number;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

class MigrationRunner {
  private migrationsPath: string;
  
  constructor() {
    this.migrationsPath = __dirname;
  }
  
  async connect() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
  }
  
  async disconnect() {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
  
  async getMigrations(): Promise<Migration[]> {
    const files = fs.readdirSync(this.migrationsPath)
      .filter(f => f.endsWith('.ts') && f !== 'migrationRunner.ts')
      .sort();
    
    const migrations: Migration[] = [];
    
    for (const file of files) {
      const migrationPath = path.join(this.migrationsPath, file);
      const migration = await import(migrationPath);
      migrations.push(migration.default);
    }
    
    return migrations;
  }
  
  async getAppliedMigrations(): Promise<number[]> {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    // Create migrations collection if it doesn't exist
    const collections = await db.listCollections({ name: 'migrations' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('migrations');
    }
    
    const applied = await db.collection('migrations').find({}).toArray();
    return applied.map(m => m.version);
  }
  
  async runMigrations() {
    try {
      await this.connect();
      
      const migrations = await this.getMigrations();
      const appliedVersions = await this.getAppliedMigrations();
      
      const pendingMigrations = migrations.filter(m => !appliedVersions.includes(m.version));
      
      if (pendingMigrations.length === 0) {
        console.log('No pending migrations');
        return;
      }
      
      console.log(`Found ${pendingMigrations.length} pending migrations`);
      
      for (const migration of pendingMigrations) {
        console.log(`\nRunning migration ${migration.version}: ${migration.name}`);
        
        try {
          await migration.up();
          
          // Record successful migration
          await mongoose.connection.db!.collection('migrations').insertOne({
            version: migration.version,
            name: migration.name,
            appliedAt: new Date()
          });
          
          console.log(`Migration ${migration.version} completed successfully`);
          
        } catch (error) {
          console.error(`Migration ${migration.version} failed:`, error);
          throw error;
        }
      }
      
      console.log('\nAll migrations completed successfully!');
      
    } finally {
      await this.disconnect();
    }
  }
  
  async rollback(version?: number) {
    try {
      await this.connect();
      
      const migrations = await this.getMigrations();
      const appliedVersions = await this.getAppliedMigrations();
      
      if (appliedVersions.length === 0) {
        console.log('No migrations to rollback');
        return;
      }
      
      // If no version specified, rollback the last migration
      const targetVersion = version || Math.max(...appliedVersions);
      const migration = migrations.find(m => m.version === targetVersion);
      
      if (!migration) {
        console.error(`Migration version ${targetVersion} not found`);
        return;
      }
      
      if (!appliedVersions.includes(targetVersion)) {
        console.error(`Migration version ${targetVersion} has not been applied`);
        return;
      }
      
      console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
      
      try {
        await migration.down();
        
        // Remove migration record
        await mongoose.connection.db!.collection('migrations').deleteOne({
          version: migration.version
        });
        
        console.log(`Rollback of migration ${migration.version} completed successfully`);
        
      } catch (error) {
        console.error(`Rollback of migration ${migration.version} failed:`, error);
        throw error;
      }
      
    } finally {
      await this.disconnect();
    }
  }
}

// CLI handling
const command = process.argv[2];
const runner = new MigrationRunner();

switch (command) {
  case 'up':
    runner.runMigrations().catch(console.error);
    break;
    
  case 'down':
    const version = process.argv[3] ? parseInt(process.argv[3]) : undefined;
    runner.rollback(version).catch(console.error);
    break;
    
  default:
    console.log('Usage:');
    console.log('  npm run migrate:up     - Run all pending migrations');
    console.log('  npm run migrate:down   - Rollback last migration');
    console.log('  npm run migrate:down <version> - Rollback specific migration');
}

export default MigrationRunner;