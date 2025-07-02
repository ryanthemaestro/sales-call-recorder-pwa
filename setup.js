#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
🚀 Sales Intelligence Platform Setup
=====================================

This setup will help you configure your environment for:
• Conference call recording with Twilio
• AI analysis with OpenAI
• SQLite database for CRM data

Let's get started!
`);

const questions = [
  {
    key: 'OPENAI_API_KEY',
    question: 'Enter your OpenAI API key (for AI analysis): ',
    required: true,
    help: 'Get your API key from https://platform.openai.com/api-keys'
  },
  {
    key: 'TWILIO_ACCOUNT_SID',
    question: 'Enter your Twilio Account SID (for conference recording): ',
    required: false,
    help: 'Get from https://console.twilio.com/ - Leave blank to skip conference recording'
  },
  {
    key: 'TWILIO_AUTH_TOKEN',
    question: 'Enter your Twilio Auth Token: ',
    required: false,
    help: 'Found in your Twilio Console dashboard'
  },
  {
    key: 'TWILIO_CONFERENCE_NUMBER',
    question: 'Enter your Twilio phone number for conference calls: ',
    required: false,
    help: 'Format: +1-555-123-4567'
  }
];

async function askQuestion(question) {
  return new Promise((resolve) => {
    console.log(`\n💡 Help: ${question.help}`);
    rl.question(question.question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function setupEnvironment() {
  const envVars = {};
  
  for (const question of questions) {
    const answer = await askQuestion(question);
    
    if (question.required && !answer) {
      console.log(`❌ ${question.key} is required!`);
      return setupEnvironment(); // Restart
    }
    
    if (answer) {
      envVars[question.key] = answer;
    }
  }
  
  // Create .env file
  let envContent = `# Sales Intelligence Platform Configuration
# Generated on ${new Date().toISOString()}

`;
  
  Object.entries(envVars).forEach(([key, value]) => {
    envContent += `${key}=${value}\n`;
  });
  
  // Add default values for optional settings
  envContent += `
# Optional: Customize these settings
PORT=3001
NODE_ENV=development
`;
  
  fs.writeFileSync('.env', envContent);
  
  console.log(`
✅ Setup Complete!

📁 Created .env file with your configuration
🔒 Keep your API keys secure and never commit .env to git

🚀 Next Steps:
1. Install dependencies: npm install
2. Start the backend: npm run server
3. Start the frontend: npm start
4. Or run both: npm run dev

📞 Conference Recording:
${envVars.TWILIO_ACCOUNT_SID ? 
  `✅ Configured with Twilio number: ${envVars.TWILIO_CONFERENCE_NUMBER || 'Not specified'}` :
  '⚠️  Twilio not configured - conference recording disabled'
}

🧠 AI Analysis:
${envVars.OPENAI_API_KEY ? 
  '✅ OpenAI configured - AI analysis enabled' :
  '❌ OpenAI not configured - AI features disabled'
}

🎯 Demo Mode:
Even without API keys, you can test with demo data at /api/demo/process-call

Happy selling! 🎉
`);
  
  rl.close();
}

// Create a basic .gitignore if it doesn't exist
if (!fs.existsSync('.gitignore')) {
  const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
*.db
*.sqlite

# Uploads
uploads/

# Build
build/
dist/

# Logs
logs/
*.log

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
`;
  
  fs.writeFileSync('.gitignore', gitignoreContent);
  console.log('📁 Created .gitignore file');
}

// Start setup
setupEnvironment().catch(console.error); 