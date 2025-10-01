// utils/envGenerator.js
import fs from 'fs/promises';
import path from 'path';

/**
 * Environment file generator for different project types
 */
export class EnvGenerator {
  
  /**
   * Generate Django environment file
   */
  async generateDjangoEnv(projectPath, config = {}) {
    try {
      const serverPath = path.join(projectPath, 'server');
      const envPath = path.join(serverPath, '.env');
      
      const envContent = `# Django Settings
DEBUG=True
SECRET_KEY=${config.secretKey || 'your-secret-key-here'}
ALLOWED_HOSTS=localhost,127.0.0.1,.localhost

# Database Configuration (PostgreSQL)
DB_NAME=${config.dbName || 'your_database_name'}
DB_USER=${config.dbUser || 'your_database_user'}
DB_PASSWORD=${config.dbPassword || 'your_database_password'}
DB_HOST=${config.dbHost || 'localhost'}
DB_PORT=${config.dbPort || '5432'}

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# JWT Settings (if using JWT authentication)
JWT_EXPIRATION_DAYS=7
`;
      
      await fs.writeFile(envPath, envContent);
      console.log('✅ Django .env file created');
    } catch (error) {
      console.warn('⚠️ Could not create Django .env file:', error.message);
    }
  }

  /**
   * Generate React environment file
   */
  async generateReactEnv(projectPath, config = {}) {
    try {
      const clientPath = path.join(projectPath, 'client');
      const envPath = path.join(clientPath, '.env');
      
      const envContent = `# React App Configuration
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=${config.appName || 'My React App'}
VITE_DEBUG=true
`;
      
      await fs.writeFile(envPath, envContent);
      console.log('✅ React .env file created');
    } catch (error) {
      console.warn('⚠️ Could not create React .env file:', error.message);
    }
  }

  /**
   * Generate Node.js environment file
   */
  async generateNodeEnv(projectPath, config = {}) {
    try {
      const envPath = path.join(projectPath, '.env');
      
      const envContent = `# Node.js Server Configuration
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/${config.dbName || 'myapp'}
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=7d

# CORS Settings
CLIENT_URL=http://localhost:3000
`;
      
      await fs.writeFile(envPath, envContent);
      console.log('✅ Node.js .env file created');
    } catch (error) {
      console.warn('⚠️ Could not create Node.js .env file:', error.message);
    }
  }

  /**
   * Generate generic environment file
   */
  async generateGenericEnv(projectPath, envVars = {}) {
    try {
      const envPath = path.join(projectPath, '.env');
      
      let envContent = '# Environment Variables\n';
      for (const [key, value] of Object.entries(envVars)) {
        envContent += `${key}=${value}\n`;
      }
      
      await fs.writeFile(envPath, envContent);
      console.log('✅ Generic .env file created');
    } catch (error) {
      console.warn('⚠️ Could not create generic .env file:', error.message);
    }
  }
}

export default new EnvGenerator();