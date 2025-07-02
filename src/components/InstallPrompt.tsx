import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isInStandaloneMode = () => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             (window.navigator as any).standalone ||
             document.referrer.includes('android-app://');
    };

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show install prompt if not already standalone
      if (!isInStandaloneMode()) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`User ${outcome} the install prompt`);
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('Error during installation:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    sessionStorage.setItem('installPromptDismissed', 'true');
  };

  // Don't show if dismissed this session
  if (!showInstallPrompt || sessionStorage.getItem('installPromptDismissed')) {
    return null;
  }

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <div className="install-icon">📱</div>
        <div className="install-text">
          <h3>Install Sales Call Recorder</h3>
          <p>Add to your home screen for quick access and offline functionality</p>
        </div>
        <div className="install-actions">
          <button 
            className="install-button primary"
            onClick={handleInstallClick}
          >
            📥 Install
          </button>
          <button 
            className="install-button secondary"
            onClick={handleDismiss}
          >
            ✕ Not now
          </button>
        </div>
      </div>

      <div className="install-benefits">
        <div className="benefit-item">
          <span className="benefit-icon">⚡</span>
          <span>Faster loading</span>
        </div>
        <div className="benefit-item">
          <span className="benefit-icon">📱</span>
          <span>Native app feel</span>
        </div>
        <div className="benefit-item">
          <span className="benefit-icon">🔄</span>
          <span>Works offline</span>
        </div>
        <div className="benefit-item">
          <span className="benefit-icon">🔔</span>
          <span>Push notifications</span>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt; 