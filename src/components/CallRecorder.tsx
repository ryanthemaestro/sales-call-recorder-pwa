import React, { useState, useEffect, useRef } from 'react';

interface CallData {
  id: string;
  timestamp: string;
  duration: number;
  audioUrl?: string;
  transcript?: string;
  leadScore?: number;
}

interface CallRecorderProps {
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  onCallComplete: (callData: CallData) => void;
}

// Pure function for formatting time
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Pure function for calculating audio level percentage
const calculateAudioLevel = (dataArray: Uint8Array): number => {
  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
  return Math.round((average / 255) * 100);
};

// Pure function for call detection
const detectCallPattern = (average: number, threshold: number = 25): boolean => {
  return average > threshold;
};

const CallRecorder: React.FC<CallRecorderProps> = ({ 
  isRecording, 
  setIsRecording, 
  onCallComplete 
}) => {
  // Minimal state - only essentials
  const [audioLevel, setAudioLevel] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSetup, setIsSetup] = useState(false);
  
  // Refs for audio handling
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Setup audio monitoring on mount
  useEffect(() => {
    setupAudio();
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle recording duration timer
  useEffect(() => {
    if (isRecording) {
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      setDuration(0);
    }
  }, [isRecording]);

  const setupAudio = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      setIsSetup(true);
      startAudioMonitoring();
      
    } catch (error) {
      console.error('Audio setup failed:', error);
    }
  };

  const startAudioMonitoring = (): void => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const monitor = () => {
      analyser.getByteFrequencyData(dataArray);
      
      const level = calculateAudioLevel(dataArray);
      setAudioLevel(level);
      
      // Auto-detect calls (simplified)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const callDetected = detectCallPattern(average);
      
      if (callDetected && !isRecording && isSetup) {
        handleAutoStart();
      } else if (!callDetected && isRecording) {
        handleAutoStop();
      }

      requestAnimationFrame(monitor);
    };

    monitor();
  };

  const handleAutoStart = (): void => {
    console.log('📞 Call detected - auto recording');
    startRecording();
  };

  const handleAutoStop = (): void => {
    if (duration > 10) { // Only stop if call was longer than 10 seconds
      console.log('📞 Call ended - stopping recording');
      stopRecording();
    }
  };

  const startRecording = (): void => {
    if (!streamRef.current) return;
    
    audioChunksRef.current = [];
    
    const mediaRecorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = mediaRecorder;
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      processRecording(audioBlob);
    };
    
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = (): void => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processRecording = (audioBlob: Blob): void => {
    const audioUrl = URL.createObjectURL(audioBlob);
    const callData: CallData = {
      id: `call_${Date.now()}`,
      timestamp: new Date().toISOString(),
      duration,
      audioUrl
    };
    
    onCallComplete(callData);
  };

  const toggleRecording = (): void => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const cleanup = (): void => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  return (
    <div className="call-recorder">
      <div className="recorder-status">
        <h2>
          {isRecording ? '🔴 Recording' : isSetup ? '🎙️ Ready' : '⚡ Setting up...'}
        </h2>
        <p>
          {isRecording 
            ? `Duration: ${formatTime(duration)}` 
            : 'Automatically detects and records calls'
          }
        </p>
      </div>

      {/* Audio Level Visualizer */}
      <div className="audio-visualizer">
        <div className="audio-level-bar">
          <div 
            className="audio-level-fill" 
            style={{ width: `${audioLevel}%` }}
          />
        </div>
        <p>Audio Level: {audioLevel}%</p>
      </div>

      {/* Simple Controls */}
      <div className="recorder-controls">
        <button
          className={`control-btn ${isRecording ? 'recording' : 'primary'}`}
          onClick={toggleRecording}
          disabled={!isSetup}
        >
          {isRecording ? '⏹️ Stop' : '🎙️ Start'} Recording
        </button>
      </div>

      {/* Status Info */}
      <div className="recorder-info">
        <p>
          🔊 {isSetup ? 'Microphone ready' : 'Setting up microphone...'}
        </p>
        <p>
          🤖 Auto-detection: {audioLevel > 25 ? 'Call detected' : 'Listening...'}
        </p>
      </div>
    </div>
  );
};

export default CallRecorder; 