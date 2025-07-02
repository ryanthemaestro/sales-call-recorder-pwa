import React, { useState, useEffect } from 'react';

interface Contact {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
}

interface ConferenceRecorderProps {
  onCallScheduled: (callInfo: any) => void;
}

const ConferenceRecorder: React.FC<ConferenceRecorderProps> = ({ onCallScheduled }) => {
  const [salespersonPhone, setSalespersonPhone] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [isCreatingCall, setIsCreatingCall] = useState(false);
  const [activeCall, setActiveCall] = useState<any>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await fetch('/api/contacts');
      const contactsData = await response.json();
      setContacts(contactsData);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const createConferenceCall = async () => {
    if (!salespersonPhone) {
      alert('Please enter your phone number');
      return;
    }

    setIsCreatingCall(true);
    
    try {
      const response = await fetch('/api/conference/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salespersonPhone,
          customerPhone: customerPhone || null,
          contactId: selectedContact || null
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setActiveCall(result);
        onCallScheduled(result);
        
        // Show notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('📞 Conference Call Ready', {
            body: `Dial ${result.conferenceNumber} to start recording`,
            icon: '/logo192.png'
          });
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to create conference call:', error);
      alert('Failed to create conference call. Please try again.');
    } finally {
      setIsCreatingCall(false);
    }
  };

  const addNewContact = async () => {
    const name = prompt('Contact Name:');
    const company = prompt('Company:');
    const email = prompt('Email:');
    const phone = prompt('Phone:');
    
    if (!name) return;
    
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, company, email, phone })
      });
      
      if (response.ok) {
        await loadContacts();
        const result = await response.json();
        setSelectedContact(result.contactId);
      }
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };

  const resetCall = () => {
    setActiveCall(null);
    setSalespersonPhone('');
    setCustomerPhone('');
    setSelectedContact('');
  };

  if (activeCall) {
    return (
      <div className="conference-recorder active-call">
        <div className="call-status">
          <h3>📞 Conference Call Active</h3>
          <div className="call-details">
            <div className="conference-number">
              <strong>Conference Number:</strong>
              <span className="phone-number">{activeCall.conferenceNumber}</span>
            </div>
            <div className="call-id">
              <strong>Call ID:</strong> {activeCall.callId}
            </div>
          </div>
          
          <div className="instructions">
            <h4>📋 Instructions:</h4>
            <ol>
              <li>Dial <strong>{activeCall.conferenceNumber}</strong></li>
              <li>Ask your customer to dial the same number</li>
              <li>Your call will be automatically recorded</li>
              <li>AI analysis will start when the call ends</li>
            </ol>
          </div>
          
          <div className="call-actions">
            <button 
              onClick={resetCall}
              className="secondary-button"
            >
              🔄 Start New Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="conference-recorder">
      <div className="recorder-header">
        <h3>📞 Conference Call Recording</h3>
        <p>Perfect audio quality • No app downloads • Works on any phone</p>
      </div>

      <div className="recorder-form">
        <div className="form-group">
          <label htmlFor="salesperson-phone">Your Phone Number *</label>
          <input
            id="salesperson-phone"
            type="tel"
            value={salespersonPhone}
            onChange={(e) => setSalespersonPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="phone-input"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="customer-phone">Customer Phone (Optional)</label>
          <input
            id="customer-phone"
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="+1 (555) 987-6543"
            className="phone-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="contact-select">Select Contact (Optional)</label>
          <div className="contact-selector">
            <select
              id="contact-select"
              value={selectedContact}
              onChange={(e) => setSelectedContact(e.target.value)}
              className="contact-select"
            >
              <option value="">Choose existing contact...</option>
              {contacts.map(contact => (
                <option key={contact.id} value={contact.id}>
                  {contact.name} - {contact.company}
                </option>
              ))}
            </select>
            <button 
              onClick={addNewContact}
              className="add-contact-button"
              type="button"
            >
              ➕ Add New
            </button>
          </div>
        </div>

        <button
          onClick={createConferenceCall}
          disabled={isCreatingCall || !salespersonPhone}
          className="create-call-button"
        >
          {isCreatingCall ? '⏳ Setting up...' : '🎯 Create Conference Call'}
        </button>
      </div>

      <div className="feature-highlights">
        <h4>✨ Why Conference Recording?</h4>
        <div className="features-grid">
          <div className="feature">
            <span className="feature-icon">🎧</span>
            <div>
              <strong>Perfect Audio Quality</strong>
              <p>Digital recording through phone network</p>
            </div>
          </div>
          <div className="feature">
            <span className="feature-icon">📱</span>
            <div>
              <strong>Works on Any Phone</strong>
              <p>iPhone, Android, or landline</p>
            </div>
          </div>
          <div className="feature">
            <span className="feature-icon">🤖</span>
            <div>
              <strong>Instant AI Analysis</strong>
              <p>Transcription and insights in minutes</p>
            </div>
          </div>
          <div className="feature">
            <span className="feature-icon">📧</span>
            <div>
              <strong>Auto Follow-ups</strong>
              <p>AI-generated emails and action items</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConferenceRecorder; 