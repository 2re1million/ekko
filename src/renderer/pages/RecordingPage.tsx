import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecordingStatus, Meeting } from '@/shared/types';
import { ProcessingWorkflow } from '@/renderer/components/ProcessingWorkflow';

export const RecordingPage: React.FC = () => {
  const navigate = useNavigate();
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({
    isRecording: false,
    duration: 0,
    audioLevel: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioFilePath, setAudioFilePath] = useState<string | null>(null);
  const [timeWarning, setTimeWarning] = useState<{message: string; level: string} | null>(null);

  useEffect(() => {
    // Set up real-time status updates
    window.electronAPI.audio.onRecordingStatusChanged((status: RecordingStatus) => {
      setRecordingStatus(status);
    });

    // Set up time warning listener
    window.electronAPI.audio.onTimeWarning((data: {message: string; level: string}) => {
      setTimeWarning(data);
    });

    return () => {
      // Cleanup listeners if needed
    };
  }, []);

  const handleStartRecording = async () => {
    try {
      await window.electronAPI.audio.startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      // Show error message
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsProcessing(true);
      const result = await window.electronAPI.audio.stopRecording();
      
      if (result.audioFilePath) {
        setAudioFilePath(result.audioFilePath);
        // Processing workflow will start automatically
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsProcessing(false);
    }
  };

  const handleProcessingComplete = (meeting: Meeting) => {
    console.log('Meeting processing completed:', meeting);
    setIsProcessing(false);
    setAudioFilePath(null);
    // Navigation is handled by ProcessingWorkflow component
  };

  const handleProcessingCancel = () => {
    setIsProcessing(false);
    setAudioFilePath(null);
  };

  const handleContinueRecording = async () => {
    setTimeWarning(null);
    await window.electronAPI.audio.resumeStatusUpdates();
  };

  const handleStopFromWarning = async () => {
    setTimeWarning(null);
    await handleStopRecording();
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAudioLevelBars = (level: number): number => {
    return Math.floor(level * 10);
  };

  // Time warning dialog
  if (timeWarning) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 text-center">
          <div className={`text-6xl mb-4 ${timeWarning.level === 'critical' ? '🚨' : '⏰'}`}>
            {timeWarning.level === 'critical' ? '🚨' : '⏰'}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Recording Time Warning</h2>
          <p className="text-gray-600 mb-6">{timeWarning.message}</p>
          <div className="flex space-x-3">
            <button
              onClick={handleContinueRecording}
              className="btn-secondary flex-1"
            >
              Continue Recording
            </button>
            <button
              onClick={handleStopFromWarning}
              className="btn-primary flex-1"
            >
              Stop Recording
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show processing workflow if we have an audio file to process
  if (audioFilePath) {
    return (
      <ProcessingWorkflow
        audioFilePath={audioFilePath}
        onComplete={handleProcessingComplete}
        onCancel={handleProcessingCancel}
      />
    );
  }

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Stopping Recording</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="text-center max-w-md">
        {!recordingStatus.isRecording ? (
          <>
            {/* Not Recording State */}
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-4xl">🎙️</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Start Recording</h1>
              <p className="text-gray-600 mb-8">
                Click the button below to start recording your meeting. 
                Make sure your microphone permissions are enabled.
              </p>
              <button
                onClick={handleStartRecording}
                className="btn-primary text-lg px-8 py-3 rounded-xl"
              >
                <span className="mr-2">🔴</span>
                Start Recording
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Recording State */}
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center relative">
                <span className="text-4xl">🎙️</span>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Recording in Progress</h1>
              <div className="text-3xl font-mono font-bold text-red-600 mb-4">
                {formatDuration(recordingStatus.duration)}
              </div>
              
              {/* Audio Level Indicator */}
              <div className="mb-6">
                <div className="flex items-center justify-center space-x-1 h-8">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-full rounded-full transition-colors duration-100 ${
                        i < getAudioLevelBars(recordingStatus.audioLevel)
                          ? 'bg-green-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-1">Audio Level</div>
              </div>

              <button
                onClick={handleStopRecording}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-8 rounded-xl transition-colors duration-200 text-lg"
              >
                <span className="mr-2">⏹️</span>
                Stop Recording
              </button>
            </div>
          </>
        )}

        {/* Tips */}
        <div className="mt-12 text-left">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Recording Tips:</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Ensure all participants speak clearly</li>
            <li>• Minimize background noise</li>
            <li>• For virtual meetings, enable system audio capture</li>
            <li>• Recording will automatically save to your local storage</li>
          </ul>
        </div>
      </div>
    </div>
  );
};