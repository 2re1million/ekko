import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpeakerIdentification } from './SpeakerIdentification';
import { TranscriptionResult, AIAnalysisResult, Meeting, Speaker } from '@/shared/types';
import { v4 as uuidv4 } from 'uuid';

interface ProcessingWorkflowProps {
  audioFilePath: string;
  onComplete: (meeting: Meeting) => void;
  onCancel: () => void;
}

type ProcessingStep = 'transcription' | 'speaker-identification' | 'ai-analysis' | 'saving' | 'complete';

export const ProcessingWorkflow: React.FC<ProcessingWorkflowProps> = ({
  audioFilePath,
  onComplete,
  onCancel,
}) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('transcription');
  const [progress, setProgress] = useState(0);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteRecording, setDeleteRecording] = useState(true);

  useEffect(() => {
    startTranscription();
  }, []);

  const startTranscription = async () => {
    try {
      setCurrentStep('transcription');
      setProgress(10);
      
      const result = await window.electronAPI.transcription.processAudio(audioFilePath);
      setTranscriptionResult(result);
      setProgress(40);
      
      if (result.speakers.length > 0) {
        setCurrentStep('speaker-identification');
      } else {
        // Skip speaker identification if no speakers detected
        await startAIAnalysis([]);
      }
    } catch (err) {
      console.error('Transcription failed:', err);
      setError('Failed to transcribe audio. Please check your API configuration.');
    }
  };

  const handleSpeakersIdentified = (identifiedSpeakers: Speaker[]) => {
    startAIAnalysis(identifiedSpeakers);
  };

  const handleSkipSpeakerIdentification = () => {
    const genericSpeakers = transcriptionResult?.speakers.map((speaker, index) => ({
      ...speaker,
      name: `Speaker ${index + 1}`,
    })) || [];
    startAIAnalysis(genericSpeakers);
  };

  const startAIAnalysis = async (speakers: Speaker[]) => {
    try {
      setCurrentStep('ai-analysis');
      setProgress(60);

      if (!transcriptionResult) {
        throw new Error('No transcription result available');
      }

      const metadata = {
        date: new Date().toISOString(),
        duration: transcriptionResult.duration,
        participants: speakers.map(s => s.name),
      };

      const analysis = await window.electronAPI.ai.analyzeMeeting(
        transcriptionResult.transcript,
        metadata
      );

      setAnalysisResult(analysis);
      setProgress(80);
      
      await saveMeeting(speakers, analysis);
    } catch (err) {
      console.error('AI analysis failed:', err);
      setError('Failed to analyze meeting. Please check your API configuration.');
    }
  };

  const saveMeeting = async (speakers: Speaker[], analysis: AIAnalysisResult) => {
    try {
      setCurrentStep('saving');
      setProgress(90);

      if (!transcriptionResult) {
        throw new Error('No transcription result available');
      }

      const meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'> = {
        title: analysis.suggestedTitle,
        date: new Date().toISOString(),
        duration: transcriptionResult.duration,
        participants: speakers.map(s => s.name),
        transcript: transcriptionResult.transcript,
        summary: analysis.summary,
        decisions: analysis.decisions,
        actionItems: analysis.actionItems,
        audioFilePath: deleteRecording ? undefined : audioFilePath,
        tags: analysis.keyTopics,
        notes: '',
      };

      const savedMeeting = await window.electronAPI.database.saveMeeting(meeting);
      
      // Delete audio file if requested
      if (deleteRecording) {
        try {
          await window.electronAPI.files.deleteAudio(audioFilePath);
          console.log('Audio file deleted successfully:', audioFilePath);
        } catch (error) {
          console.warn('Failed to delete audio file:', error);
          // Don't fail the entire operation if file deletion fails
        }
      }

      setProgress(100);
      setCurrentStep('complete');
      
      setTimeout(() => {
        onComplete(savedMeeting);
        navigate(`/meeting/${savedMeeting.id}`);
      }, 1000);
      
    } catch (err) {
      console.error('Failed to save meeting:', err);
      setError('Failed to save meeting. Please try again.');
    }
  };

  const getStepStatus = (step: ProcessingStep) => {
    const steps: ProcessingStep[] = ['transcription', 'speaker-identification', 'ai-analysis', 'saving', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    
    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getStepIcon = (step: ProcessingStep, status: string) => {
    if (status === 'complete') return '✅';
    if (status === 'active') return '🔄';
    
    switch (step) {
      case 'transcription': return '🎤';
      case 'speaker-identification': return '👥';
      case 'ai-analysis': return '🧠';
      case 'saving': return '💾';
      case 'complete': return '🎉';
      default: return '⏳';
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Processing Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex space-x-3">
            <button
              onClick={() => setError(null)}
              className="btn-secondary flex-1"
            >
              Retry
            </button>
            <button
              onClick={onCancel}
              className="btn-primary flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'speaker-identification' && transcriptionResult) {
    return (
      <SpeakerIdentification
        speakers={transcriptionResult.speakers}
        onSpeakersIdentified={handleSpeakersIdentified}
        onSkip={handleSkipSpeakerIdentification}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">
            {currentStep === 'complete' ? '🎉' : '⚙️'}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {currentStep === 'complete' ? 'Processing Complete!' : 'Processing Recording'}
          </h2>
          <p className="text-gray-600">
            {currentStep === 'complete' 
              ? 'Your meeting has been processed and saved.'
              : 'Please wait while we process your meeting...'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>{progress}% Complete</span>
            <span>
              {currentStep === 'transcription' && 'Transcribing audio...'}
              {currentStep === 'ai-analysis' && 'Analyzing meeting...'}
              {currentStep === 'saving' && 'Saving results...'}
              {currentStep === 'complete' && 'Done!'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Processing Steps */}
        <div className="space-y-3 mb-6">
          {(['transcription', 'ai-analysis', 'saving', 'complete'] as ProcessingStep[]).map((step) => {
            const status = getStepStatus(step);
            const isSkippedStep = step === 'speaker-identification' && transcriptionResult?.speakers.length === 0;
            
            if (isSkippedStep) return null;

            return (
              <div
                key={step}
                className={`flex items-center p-3 rounded-lg ${
                  status === 'complete' ? 'bg-green-50 border border-green-200' :
                  status === 'active' ? 'bg-blue-50 border border-blue-200' :
                  'bg-gray-50 border border-gray-200'
                }`}
              >
                <span className="text-lg mr-3">
                  {getStepIcon(step, status)}
                </span>
                <span className={`font-medium ${
                  status === 'complete' ? 'text-green-700' :
                  status === 'active' ? 'text-blue-700' :
                  'text-gray-600'
                }`}>
                  {step === 'transcription' && 'Transcribe Audio'}
                  {step === 'ai-analysis' && 'AI Analysis'}
                  {step === 'saving' && 'Save Meeting'}
                  {step === 'complete' && 'Complete'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Recording Cleanup Option */}
        {currentStep !== 'complete' && (
          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={deleteRecording}
                onChange={(e) => setDeleteRecording(e.target.checked)}
                className="mr-2"
              />
              <span className="text-gray-600">
                Delete recording after processing
              </span>
            </label>
          </div>
        )}

        {/* Cancel Button (only show during processing) */}
        {currentStep !== 'complete' && (
          <div className="flex justify-center mt-6">
            <button
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Cancel Processing
            </button>
          </div>
        )}
      </div>
    </div>
  );
};