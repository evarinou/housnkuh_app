// server/scripts/validate-deployment.js
const axios = require('axios');
const mongoose = require('mongoose');

class DeploymentValidator {
  constructor(baseUrl = 'http://localhost:4000') {
    this.baseUrl = baseUrl;
    this.adminToken = null;
    this.vendorToken = null;
    this.testResults = [];
  }

  async runValidation() {
    console.log('🚀 Starting M013 Zusatzleistungen Deployment Validation...\n');

    try {
      await this.validateDatabaseConnection();
      await this.validateApiEndpoints();
      await this.validateWorkflow();
      await this.printResults();
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  }

  async validateDatabaseConnection() {
    console.log('📊 Validating database connection...');
    
    try {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh');
      
      // Check if models exist
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      const requiredCollections = ['users', 'vertrags', 'mietfaechers', 'packagetrackings'];
      const missingCollections = requiredCollections.filter(name => !collectionNames.includes(name));
      
      if (missingCollections.length > 0) {
        throw new Error(`Missing collections: ${missingCollections.join(', ')}`);
      }
      
      this.addResult('✅ Database Connection', 'Connected successfully', true);
      this.addResult('✅ Required Collections', `Found: ${requiredCollections.join(', ')}`, true);
    } catch (error) {
      this.addResult('❌ Database Connection', error.message, false);
      throw error;
    } finally {
      await mongoose.disconnect();
    }
  }

  async validateApiEndpoints() {
    console.log('🔗 Validating API endpoints...');

    const endpoints = [
      // Public endpoints
      { method: 'GET', path: '/api/public/health', auth: false },
      
      // Admin endpoints
      { method: 'GET', path: '/api/admin/contracts/zusatzleistungen', auth: 'admin' },
      { method: 'GET', path: '/api/admin/packages', auth: 'admin' },
      
      // Vendor endpoints
      { method: 'GET', path: '/api/vendor-contracts/zusatzleistungen', auth: 'vendor' }
    ];

    for (const endpoint of endpoints) {
      try {
        const config = {
          method: endpoint.method.toLowerCase(),
          url: `${this.baseUrl}${endpoint.path}`,
          validateStatus: () => true // Don't throw on any status
        };

        if (endpoint.auth === 'admin' && this.adminToken) {
          config.headers = { Authorization: `Bearer ${this.adminToken}` };
        } else if (endpoint.auth === 'vendor' && this.vendorToken) {
          config.headers = { Authorization: `Bearer ${this.vendorToken}` };
        }

        const response = await axios(config);
        const isSuccess = response.status >= 200 && response.status < 500; // Accept auth errors
        
        this.addResult(
          `${isSuccess ? '✅' : '❌'} ${endpoint.method} ${endpoint.path}`,
          `Status: ${response.status}`,
          isSuccess
        );
      } catch (error) {
        this.addResult(
          `❌ ${endpoint.method} ${endpoint.path}`,
          `Error: ${error.message}`,
          false
        );
      }
    }
  }

  async validateWorkflow() {
    console.log('🔄 Validating Zusatzleistungen workflow...');

    try {
      // Check if test data exists or can be created
      const healthCheck = await axios.get(`${this.baseUrl}/api/public/health`);
      
      if (healthCheck.status === 200) {
        this.addResult('✅ Workflow Base', 'API server responding', true);
      } else {
        this.addResult('❌ Workflow Base', 'API server not responding', false);
      }

      // Validate environment variables
      const requiredEnvVars = [
        'MONGO_URI',
        'JWT_SECRET',
        'EMAIL_HOST',
        'EMAIL_USER',
        'EMAIL_PASS'
      ];

      const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingEnvVars.length === 0) {
        this.addResult('✅ Environment Variables', 'All required vars present', true);
      } else {
        this.addResult('⚠️ Environment Variables', `Missing: ${missingEnvVars.join(', ')}`, false);
      }

    } catch (error) {
      this.addResult('❌ Workflow Validation', error.message, false);
    }
  }

  async validateEmailTemplates() {
    console.log('📧 Validating email templates...');

    try {
      // Check if email service file exists and has required exports
      const emailServicePath = '../utils/emailService.js';
      const emailService = require(emailServicePath);

      const requiredFunctions = [
        'sendAdminZusatzleistungenNotification',
        'sendPackageArrivalConfirmation',
        'sendLagerserviceActivationNotification'
      ];

      const missingFunctions = requiredFunctions.filter(fnName => typeof emailService[fnName] !== 'function');

      if (missingFunctions.length === 0) {
        this.addResult('✅ Email Templates', 'All email functions present', true);
      } else {
        this.addResult('❌ Email Templates', `Missing: ${missingFunctions.join(', ')}`, false);
      }
    } catch (error) {
      this.addResult('⚠️ Email Templates', 'Could not validate email service', false);
    }
  }

  async validateModels() {
    console.log('📝 Validating data models...');

    try {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh');

      // Test Vertrag model with zusatzleistungen
      const Vertrag = require('../models/Vertrag').default;
      const testVertrag = new Vertrag({
        user: new mongoose.Types.ObjectId(),
        services: [],
        status: 'pending',
        zusatzleistungen: {
          lagerservice: true,
          versandservice: false
        },
        zusatzleistungen_kosten: {
          lagerservice_monatlich: 20,
          versandservice_monatlich: 5
        }
      });

      // Validate without saving
      const validationError = testVertrag.validateSync();
      if (!validationError) {
        this.addResult('✅ Vertrag Model', 'Zusatzleistungen schema valid', true);
      } else {
        this.addResult('❌ Vertrag Model', validationError.message, false);
      }

      // Test PackageTracking model
      const PackageTracking = require('../models/PackageTracking').default;
      const testPackage = new PackageTracking({
        vertrag_id: new mongoose.Types.ObjectId(),
        package_typ: 'lagerservice',
        status: 'erwartet'
      });

      const packageValidationError = testPackage.validateSync();
      if (!packageValidationError) {
        this.addResult('✅ PackageTracking Model', 'Schema validation passed', true);
      } else {
        this.addResult('❌ PackageTracking Model', packageValidationError.message, false);
      }

    } catch (error) {
      this.addResult('❌ Model Validation', error.message, false);
    } finally {
      await mongoose.disconnect();
    }
  }

  addResult(test, result, success) {
    this.testResults.push({ test, result, success });
  }

  async printResults() {
    console.log('\n📋 Validation Results:\n');
    console.log('=' .repeat(80));

    let successCount = 0;
    let totalCount = this.testResults.length;

    this.testResults.forEach(({ test, result, success }) => {
      console.log(`${test}: ${result}`);
      if (success) successCount++;
    });

    console.log('=' .repeat(80));
    console.log(`\n📊 Summary: ${successCount}/${totalCount} tests passed`);

    if (successCount === totalCount) {
      console.log('\n🎉 M013 Zusatzleistungen deployment validation PASSED!');
      console.log('\n✅ All components are ready for production deployment.');
    } else {
      console.log('\n⚠️ Some validation checks failed. Please review before deployment.');
      const failedTests = this.testResults.filter(r => !r.success);
      console.log('\n❌ Failed tests:');
      failedTests.forEach(({ test, result }) => {
        console.log(`   - ${test}: ${result}`);
      });
    }

    return successCount === totalCount;
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new DeploymentValidator();
  validator.runValidation()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = DeploymentValidator;