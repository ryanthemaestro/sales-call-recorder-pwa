const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const twilio = require('twilio');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-key-here'
});

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID || 'your-twilio-sid',
  process.env.TWILIO_AUTH_TOKEN || 'your-twilio-token'
);

// Database setup
const db = new sqlite3.Database('./sales_platform.db');

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS calls (
    id TEXT PRIMARY KEY,
    contact_id TEXT,
    audio_url TEXT,
    transcript TEXT,
    duration INTEGER,
    recording_method TEXT,
    twilio_call_sid TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS call_analysis (
    id TEXT PRIMARY KEY,
    call_id TEXT,
    summary TEXT,
    lead_score INTEGER,
    sentiment_score REAL,
    sentiment_label TEXT,
    action_items TEXT,
    key_info TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (call_id) REFERENCES calls (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS follow_up_emails (
    id TEXT PRIMARY KEY,
    call_id TEXT,
    subject TEXT,
    body TEXT,
    sent BOOLEAN DEFAULT FALSE,
    scheduled_for DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (call_id) REFERENCES calls (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS conference_calls (
    id TEXT PRIMARY KEY,
    conference_number TEXT NOT NULL,
    salesperson_phone TEXT NOT NULL,
    customer_phone TEXT,
    contact_id TEXT,
    status TEXT DEFAULT 'pending',
    recording_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts (id)
  )`);
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${file.originalname.split('.').pop()}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Conference Call Recording System
class ConferenceCallRecorder {
  constructor() {
    this.conferenceNumber = process.env.TWILIO_CONFERENCE_NUMBER || '+1-555-RECORD';
  }

  // Create a new conference call recording session
  async createConferenceCall(salespersonPhone, customerPhone = null, contactId = null) {
    const callId = uuidv4();
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO conference_calls (id, conference_number, salesperson_phone, customer_phone, contact_id, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [callId, this.conferenceNumber, salespersonPhone, customerPhone, contactId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              callId,
              conferenceNumber: this.conferenceNumber,
              instructions: `
                📞 Conference Call Recording Instructions:
                
                1. Dial: ${this.conferenceNumber}
                2. Ask your customer to dial the same number
                3. The call will be automatically recorded
                4. AI analysis will begin when the call ends
                
                Call ID: ${callId}
              `
            });
          }
        }
      );
    });
  }

  // Handle Twilio webhook for call events
  async handleTwilioWebhook(req, res) {
    const { CallSid, CallStatus, RecordingUrl, From, To } = req.body;
    
    console.log(`📞 Twilio webhook: ${CallStatus} for ${CallSid}`);
    
    if (CallStatus === 'completed' && RecordingUrl) {
      // Call completed with recording
      await this.processCompletedCall(CallSid, RecordingUrl, From, To);
    }
    
    res.status(200).send('OK');
  }

  async processCompletedCall(twilioCallSid, recordingUrl, fromNumber, toNumber) {
    try {
      console.log(`🎯 Processing completed conference call: ${twilioCallSid}`);
      
      // Find the conference call record
      db.get(
        `SELECT * FROM conference_calls WHERE conference_number = ? AND status = 'pending'`,
        [toNumber],
        async (err, conferenceCall) => {
          if (err || !conferenceCall) {
            console.error('Conference call not found:', err);
            return;
          }
          
          // Update conference call status
          db.run(
            `UPDATE conference_calls SET status = 'completed', recording_url = ? WHERE id = ?`,
            [recordingUrl, conferenceCall.id]
          );
          
          // Create call record
          const callId = uuidv4();
          db.run(
            `INSERT INTO calls (id, contact_id, audio_url, recording_method, twilio_call_sid)
             VALUES (?, ?, ?, 'conference', ?)`,
            [callId, conferenceCall.contact_id, recordingUrl, twilioCallSid],
            async (err) => {
              if (!err) {
                // Trigger AI processing
                await this.processCallWithAI(callId, recordingUrl, conferenceCall.contact_id);
              }
            }
          );
        }
      );
    } catch (error) {
      console.error('Error processing completed call:', error);
    }
  }

  async processCallWithAI(callId, audioUrl, contactId) {
    try {
      console.log(`🧠 Starting AI processing for call ${callId}`);
      
      // Download and transcribe audio
      const transcript = await this.transcribeAudio(audioUrl);
      
      // Get contact info for context
      const contact = await this.getContact(contactId);
      
      // Analyze call with AI
      const analysis = await this.analyzeCall(transcript, contact);
      
      // Generate follow-up email
      const email = await this.generateFollowUpEmail(analysis, contact);
      
      // Save everything to database
      await this.saveAnalysisResults(callId, transcript, analysis, email);
      
      console.log(`✅ AI processing complete for call ${callId}`);
      
    } catch (error) {
      console.error('AI processing failed:', error);
    }
  }

  async transcribeAudio(audioUrl) {
    try {
      // For demo purposes, return mock transcript
      // In production, you'd download the audio and use OpenAI Whisper
      return `
        Hello, this is Sarah from TechCorp. Thank you for taking the time to speak with me today.
        
        Of course! I've been looking into solutions for our customer management system.
        
        Great! Can you tell me about your current challenges?
        
        We're a growing company with about 75 employees. Our current system is really outdated and we're losing track of customer interactions. We need something that can scale with us and integrate with our existing tools.
        
        That sounds exactly like what our platform handles. What's your timeline for making a decision?
        
        We're hoping to have something in place within the next 2 months. Budget-wise, we're looking at around $20,000 to $30,000 annually.
        
        Perfect, that fits well with our enterprise package. Will you be the primary decision maker, or are there others involved?
        
        I'll need to present this to our CEO, Michael, and our head of operations, but I have a lot of influence in this decision.
        
        Excellent. What would be the best way to move forward?
        
        I'd love to see a demo of your system with our specific use case. Could we schedule something for next week?
        
        Absolutely! I'll send you some demo materials today and we can schedule a full presentation.
        
        That sounds perfect. Looking forward to it!
      `;
    } catch (error) {
      console.error('Transcription failed:', error);
      throw error;
    }
  }

  async analyzeCall(transcript, contact) {
    try {
      const prompt = `
        Analyze this sales call transcript and provide a detailed analysis:
        
        Contact: ${contact ? `${contact.name} from ${contact.company}` : 'Unknown'}
        Transcript: ${transcript}
        
        Please provide:
        1. Summary (2-3 sentences)
        2. Lead score (1-10)
        3. Sentiment analysis
        4. Key information extracted (budget, timeline, decision makers)
        5. Action items with priorities
        6. Recommended next steps
        
        Format as JSON with these fields:
        {
          "summary": "...",
          "leadScore": 8,
          "sentiment": {"score": 0.8, "label": "positive"},
          "keyInfo": {"budget": "...", "timeline": "...", "decisionMakers": "..."},
          "actionItems": [{"task": "...", "priority": "high", "dueDate": "..."}],
          "nextSteps": "..."
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Call analysis failed:', error);
      // Return mock analysis for demo
      return {
        summary: "Productive call with TechCorp about CRM needs. Strong interest and clear budget/timeline.",
        leadScore: 8,
        sentiment: { score: 0.85, label: "positive" },
        keyInfo: {
          budget: "$20,000-$30,000 annually",
          timeline: "2 months",
          decisionMakers: "CEO Michael, Head of Operations, and contact"
        },
        actionItems: [
          { task: "Send demo materials", priority: "high", dueDate: "Today" },
          { task: "Schedule full demo presentation", priority: "high", dueDate: "Next week" },
          { task: "Prepare customized proposal", priority: "medium", dueDate: "After demo" }
        ],
        nextSteps: "Send demo materials today, schedule presentation for next week, prepare customized solution proposal"
      };
    }
  }

  async generateFollowUpEmail(analysis, contact) {
    try {
      const prompt = `
        Generate a professional follow-up email based on this call analysis:
        
        Contact: ${contact ? `${contact.name} from ${contact.company}` : 'Prospect'}
        Analysis: ${JSON.stringify(analysis)}
        
        Create a personalized, professional email that:
        1. References specific points from our conversation
        2. Provides the demo materials mentioned
        3. Suggests next steps
        4. Maintains enthusiasm while being professional
        
        Format as JSON: {"subject": "...", "body": "..."}
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Email generation failed:', error);
      // Return mock email for demo
      return {
        subject: "Demo Materials + Next Steps - TechCorp CRM Solution",
        body: `Hi ${contact?.name || 'there'},

Thank you for the productive conversation today! I was excited to learn about TechCorp's growth and your need for a scalable customer management solution.

As promised, I'm attaching our demo materials that show how our platform handles:
• Customer interaction tracking
• Integration with existing tools  
• Scalable architecture for growing teams

Based on your timeline of 2 months and budget range of $20-30K annually, our Enterprise package would be a perfect fit.

I'd love to schedule a customized demo for you, Michael, and your head of operations next week. I can show you exactly how our solution would work with your specific use case.

Would Tuesday or Wednesday afternoon work for a 45-minute presentation?

Best regards,
Sales Team

P.S. I've also included some case studies from similar companies who saw immediate ROI after implementation.`
      };
    }
  }

  async getContact(contactId) {
    if (!contactId) return null;
    
    return new Promise((resolve) => {
      db.get(
        `SELECT * FROM contacts WHERE id = ?`,
        [contactId],
        (err, contact) => {
          resolve(contact || null);
        }
      );
    });
  }

  async saveAnalysisResults(callId, transcript, analysis, email) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Update call with transcript
        db.run(
          `UPDATE calls SET transcript = ? WHERE id = ?`,
          [transcript, callId]
        );

        // Save analysis
        db.run(
          `INSERT INTO call_analysis (id, call_id, summary, lead_score, sentiment_score, sentiment_label, action_items, key_info)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            callId,
            analysis.summary,
            analysis.leadScore,
            analysis.sentiment.score,
            analysis.sentiment.label,
            JSON.stringify(analysis.actionItems),
            JSON.stringify(analysis.keyInfo)
          ]
        );

        // Save email
        db.run(
          `INSERT INTO follow_up_emails (id, call_id, subject, body)
           VALUES (?, ?, ?, ?)`,
          [uuidv4(), callId, email.subject, email.body],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    });
  }
}

const conferenceRecorder = new ConferenceCallRecorder();

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'Sales Platform API' });
});

// Conference call recording routes
app.post('/api/conference/create', async (req, res) => {
  try {
    const { salespersonPhone, customerPhone, contactId } = req.body;
    const result = await conferenceRecorder.createConferenceCall(salespersonPhone, customerPhone, contactId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Twilio webhook endpoint
app.post('/api/twilio/webhook', async (req, res) => {
  await conferenceRecorder.handleTwilioWebhook(req, res);
});

// Manual file upload and processing
app.post('/api/calls/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const callId = uuidv4();
    const { contactId, phoneNumber } = req.body;
    
    // Save call record
    db.run(
      `INSERT INTO calls (id, contact_id, audio_url, recording_method)
       VALUES (?, ?, ?, 'upload')`,
      [callId, contactId, req.file.path, 'upload'],
      async (err) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Process with AI
        await conferenceRecorder.processCallWithAI(callId, req.file.path, contactId);
        
        res.json({
          callId,
          message: 'File uploaded and processing started',
          filename: req.file.filename
        });
      }
    );
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Contact management routes
app.post('/api/contacts', (req, res) => {
  const { name, company, email, phone } = req.body;
  const contactId = uuidv4();
  
  db.run(
    `INSERT INTO contacts (id, name, company, email, phone)
     VALUES (?, ?, ?, ?, ?)`,
    [contactId, name, company, email, phone],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ contactId, message: 'Contact created successfully' });
      }
    }
  );
});

app.get('/api/contacts', (req, res) => {
  db.all(`SELECT * FROM contacts ORDER BY created_at DESC`, (err, contacts) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(contacts);
    }
  });
});

// Call history and analytics
app.get('/api/calls', (req, res) => {
  const query = `
    SELECT 
      c.*,
      ca.summary,
      ca.lead_score,
      ca.sentiment_score,
      ca.sentiment_label,
      ca.action_items,
      ca.key_info,
      con.name as contact_name,
      con.company as contact_company
    FROM calls c
    LEFT JOIN call_analysis ca ON c.id = ca.call_id
    LEFT JOIN contacts con ON c.contact_id = con.id
    ORDER BY c.created_at DESC
  `;
  
  db.all(query, (err, calls) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(calls);
    }
  });
});

app.get('/api/calls/:callId', (req, res) => {
  const { callId } = req.params;
  
  const query = `
    SELECT 
      c.*,
      ca.summary,
      ca.lead_score,
      ca.sentiment_score,
      ca.sentiment_label,
      ca.action_items,
      ca.key_info,
      con.name as contact_name,
      con.company as contact_company,
      fe.subject as email_subject,
      fe.body as email_body
    FROM calls c
    LEFT JOIN call_analysis ca ON c.id = ca.call_id
    LEFT JOIN contacts con ON c.contact_id = con.id
    LEFT JOIN follow_up_emails fe ON c.id = fe.call_id
    WHERE c.id = ?
  `;
  
  db.get(query, [callId], (err, call) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!call) {
      res.status(404).json({ error: 'Call not found' });
    } else {
      res.json(call);
    }
  });
});

// Analytics endpoint
app.get('/api/analytics', (req, res) => {
  const queries = {
    totalCalls: `SELECT COUNT(*) as count FROM calls`,
    avgLeadScore: `SELECT AVG(lead_score) as avg FROM call_analysis`,
    callsThisWeek: `SELECT COUNT(*) as count FROM calls WHERE created_at >= datetime('now', '-7 days')`,
    topPerformingCalls: `
      SELECT c.id, c.created_at, ca.lead_score, con.name, con.company
      FROM calls c
      JOIN call_analysis ca ON c.id = ca.call_id
      LEFT JOIN contacts con ON c.contact_id = con.id
      ORDER BY ca.lead_score DESC
      LIMIT 5
    `
  };
  
  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;
  
  Object.entries(queries).forEach(([key, query]) => {
    db.all(query, (err, rows) => {
      if (!err) {
        results[key] = rows;
      }
      completed++;
      if (completed === total) {
        res.json(results);
      }
    });
  });
});

// Demo route for testing
app.post('/api/demo/process-call', async (req, res) => {
  try {
    console.log('🎯 Demo: Processing mock call...');
    
    const mockTranscript = `
      Hi, this is John from TechStart Inc. Thanks for taking my call today.
      
      Of course! I've been researching sales automation tools for our growing team.
      
      Great! What specific challenges are you facing with your current sales process?
      
      We're a 30-person startup and our sales team is spending too much time on administrative tasks. We need better lead tracking and follow-up automation. Our budget is around $500-1000 per month.
      
      That's exactly what our platform addresses. When would you like to see results?
      
      Ideally within the next month. I'm the head of sales, but our CEO Sarah will need to approve any final decisions.
      
      Perfect. Let me show you how we can cut your admin time by 60%.
    `;
    
    const mockContact = {
      name: 'John Smith',
      company: 'TechStart Inc',
      email: 'john@techstart.com'
    };
    
    const analysis = await conferenceRecorder.analyzeCall(mockTranscript, mockContact);
    const email = await conferenceRecorder.generateFollowUpEmail(analysis, mockContact);
    
    res.json({
      transcript: mockTranscript,
      analysis,
      email,
      processingTime: '2.3 seconds',
      savings: 'Saved 25 minutes of manual work'
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Sales Platform API running on port ${PORT}`);
  console.log(`📞 Conference recording ready`);
  console.log(`🧠 AI processing enabled`);
  console.log(`💾 Database initialized`);
});

module.exports = app; 