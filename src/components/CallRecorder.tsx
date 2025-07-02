import React, { useState, useRef, useEffect } from 'react';

// Pure interfaces - minimal and focused
interface CallRecorderProps {
  isRecording: boolean;
  isProcessing: boolean;
  onRecordingChange: (recording: boolean) => void;
  onProcessingChange: (processing: boolean) => void;
  recordingTime: number;
  onCallComplete: (audioUrl: string, duration: number) => void;
}

// Pure utility functions
const formatAudioLevel = (level: number): number => {
  return Math.min(Math.max(level * 100, 0), 100);
};

const generateAudioBars = (count: number = 15): number[] => {
  return Array.from({ length: count }, () => Math.random() * 100);
};

const createAudioVisualizer = (analyser: AnalyserNode | null): number[] => {
  if (!analyser) return generateAudioBars();
  
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);
  
  const bars = 15;
  const step = Math.floor(dataArray.length / bars);
  
  return Array.from({ length: bars }, (_, i) => {
    const start = i * step;
    const end = start + step;
    const slice = dataArray.slice(start, end);
    const average = slice.reduce((sum, value) => sum + value, 0) / slice.length;
    return (average / 255) * 100;
  });
};

const CallRecorder: React.FC<CallRecorderProps> = ({
  isRecording,
  isProcessing,
  onRecordingChange,
  onProcessingChange,
  recordingTime,
  onCallComplete
}) => {
  // State management - minimal and pure
  const [hasPermission, setHasPermission] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioBars, setAudioBars] = useState<number[]>(generateAudioBars());

  // Refs for media handling
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Audio visualization effect
  useEffect(() => {
    let animationFrame: number;
    
    if (isRecording && analyserRef.current) {
      const updateVisualization = () => {
        const bars = createAudioVisualizer(analyserRef.current);
        setAudioBars(bars);
        
        // Calculate overall audio level
        const avgLevel = bars.reduce((sum, bar) => sum + bar, 0) / bars.length;
        setAudioLevel(avgLevel);
        
        animationFrame = requestAnimationFrame(updateVisualization);
      };
      
      updateVisualization();
    } else {
      // Reset to subtle animation when not recording
      setAudioBars(generateAudioBars().map(bar => bar * 0.1));
      setAudioLevel(0);
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isRecording]);

  // Pure function: Request microphone permission
  const requestPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;
      
      // Set up audio analysis
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setHasPermission(false);
      return false;
    }
  };

  // Pure function: Start recording
  const startRecording = async () => {
    console.log('%c🎬 START RECORDING CALLED!', 'background: red; color: white; font-size: 16px; padding: 5px;');
    
    if (!streamRef.current) {
      const permitted = await requestPermission();
      if (!permitted) return;
    }

    try {
      const recorder = new MediaRecorder(streamRef.current!, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        console.log('📦 Data chunk received:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        console.log('%c🛑 RECORDER STOPPED!', 'background: orange; color: white; font-size: 16px; padding: 5px;');
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        console.log('🎙️ Recording stopped, audio URL:', audioUrl);
        console.log('⏱️ Recording duration:', recordingTime);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
        }
        
        onProcessingChange(true);
        
        // Simulate processing time then save the call
        setTimeout(() => {
          onProcessingChange(false);
          console.log('🔥 Calling onCallComplete with:', audioUrl, recordingTime);
          console.log('%c🚀 CALLING COMPLETION CALLBACK!', 'background: green; color: white; font-size: 16px; padding: 5px;');
          // Call the completion handler with audio URL and duration
          onCallComplete(audioUrl, recordingTime);
        }, 2000);
      };
      
      recorderRef.current = recorder;
      recorder.start();
      console.log('✅ MediaRecorder started successfully');
      onRecordingChange(true);
    } catch (error) {
      console.error('❌ Recording failed:', error);
    }
  };

  // Pure function: Stop recording
  const stopRecording = () => {
    console.log('%c⏹️ STOP RECORDING CALLED!', 'background: red; color: white; font-size: 16px; padding: 5px;');
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      console.log('🛑 Stopping MediaRecorder...');
      recorderRef.current.stop();
      onRecordingChange(false);
    } else {
      console.log('⚠️ No active recorder to stop');
    }
  };

  // Pure function: Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Pure render functions
  const renderPermissionPrompt = () => (
    <div className="recording-interface">
      <div className="recording-visual">
        <span>MIC</span>
      </div>
      
      <h3 className="recording-time">Microphone Access Required</h3>
      <p className="recording-status">
        Allow microphone access to start recording sales calls
      </p>
      
      <button 
        className="btn btn-primary btn-large"
        onClick={requestPermission}
      >
        Enable Microphone
      </button>
    </div>
  );

  const renderAudioVisualizer = () => (
    <div className="audio-visualizer">
      {audioBars.map((height, index) => (
        <div
          key={index}
          className="audio-bar"
          style={{ 
            height: `${Math.max(height, 5)}%`
          }}
        />
      ))}
    </div>
  );

  const renderRecordingInterface = () => (
    <div className="recording-interface">
      <div className={`recording-visual ${isRecording ? 'active' : ''}`}>
        <span>{isRecording ? 'REC' : 'MIC'}</span>
      </div>
      
      <h3 className="recording-time">
        {recordingTime > 0 ? 
          `${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}` : 
          '00:00'
        }
      </h3>
      
      <p className="recording-status">
        {isRecording ? 'Recording in progress...' : 'Ready to record'}
      </p>
      
      {renderAudioVisualizer()}
      
      <div className="button-group">
        <button 
          className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'} btn-large`}
          onClick={toggleRecording}
          disabled={isProcessing}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        
        {recordingTime > 0 && !isRecording && (
          <button 
            className="btn btn-secondary"
            onClick={() => audioRef.current?.play()}
          >
            Play Back
          </button>
        )}
      </div>
      
      {isProcessing && (
        <div className="status-indicator status-processing">
          Processing audio...
        </div>
      )}
      
      <audio 
        ref={audioRef} 
        controls 
        style={{ 
          marginTop: '1rem', 
          width: '100%',
          display: recordingTime > 0 && !isRecording ? 'block' : 'none'
        }}
      />
    </div>
  );

  // Main render
  if (!hasPermission) {
    return renderPermissionPrompt();
  }

  return renderRecordingInterface();
};

export default CallRecorder; 