import React, { useState } from 'react';
import { Speaker } from '@/shared/types';

interface SpeakerIdentificationProps {
  speakers: Speaker[];
  onSpeakersIdentified: (identifiedSpeakers: Speaker[]) => void;
  onSkip: () => void;
}

export const SpeakerIdentification: React.FC<SpeakerIdentificationProps> = ({
  speakers,
  onSpeakersIdentified,
  onSkip,
}) => {
  const [speakerNames, setSpeakerNames] = useState<{ [key: string]: string }>(() => {
    const initialNames: { [key: string]: string } = {};
    speakers.forEach(speaker => {
      initialNames[speaker.id] = '';
    });
    return initialNames;
  });

  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const handleNameChange = (speakerId: string, name: string) => {
    setSpeakerNames(prev => ({
      ...prev,
      [speakerId]: name,
    }));
  };

  const handlePlayAudio = async (speakerId: string) => {
    const speaker = speakers.find(s => s.id === speakerId);
    if (!speaker || !speaker.sampleAudio) {
      console.warn('No audio sample available for speaker:', speakerId);
      return;
    }

    setPlayingAudio(speakerId);

    try {
      // Get the snippet path from the main process
      const snippetPath = await window.electronAPI.snippet.playAudio(speaker.sampleAudio);
      
      if (snippetPath) {
        // Create audio element to play the snippet
        const audio = new Audio(`file://${snippetPath}`);
        audio.volume = 0.8;
        
        audio.onended = () => {
          setPlayingAudio(null);
        };
        
        audio.onerror = () => {
          console.error('Failed to play audio snippet');
          setPlayingAudio(null);
        };
        
        await audio.play();
        
        // Fallback timeout in case onended doesn't fire
        setTimeout(() => {
          if (playingAudio === speakerId) {
            setPlayingAudio(null);
          }
        }, 6000); // 5 second snippet + 1 second buffer
      } else {
        // No snippet available, just show the animation
        setTimeout(() => setPlayingAudio(null), 3000);
      }
    } catch (error) {
      console.error('Error playing audio snippet:', error);
      setPlayingAudio(null);
    }
  };

  const handleConfirmSpeakers = () => {
    const identifiedSpeakers = speakers.map(speaker => ({
      ...speaker,
      name: speakerNames[speaker.id] || `Speaker ${speaker.id.split('_')[1]}`,
    }));
    onSpeakersIdentified(identifiedSpeakers);
  };

  const hasAtLeastOneName = Object.values(speakerNames).some(name => name.trim() !== '');
  const hasUniquenames = () => {
    const names = Object.values(speakerNames).filter(name => name.trim() !== '');
    return names.length === new Set(names).size;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Identify Meeting Participants
          </h2>
          <p className="text-gray-600">
            We've detected {speakers.length} distinct voice{speakers.length !== 1 ? 's' : ''} in your meeting.
            Please help us identify who is speaking by listening to the samples and entering names.
          </p>
        </div>

        <div className="space-y-6">
          {speakers.map((speaker, index) => (
            <div key={speaker.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-semibold">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Speaker {index + 1}
                    </h3>
                    <div className="flex items-center text-sm">
                      <span className="text-gray-500 mr-2">Confidence:</span>
                      <span className={`font-medium ${getConfidenceColor(speaker.confidence)}`}>
                        {getConfidenceLabel(speaker.confidence)} ({Math.round(speaker.confidence * 100)}%)
                      </span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handlePlayAudio(speaker.id)}
                  disabled={playingAudio === speaker.id}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    playingAudio === speaker.id
                      ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {playingAudio === speaker.id ? (
                    <>
                      <span className="animate-pulse mr-2">🔊</span>
                      Playing...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">▶️</span>
                      Play Sample
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Speaker Name
                </label>
                <input
                  type="text"
                  value={speakerNames[speaker.id]}
                  onChange={(e) => handleNameChange(speaker.id, e.target.value)}
                  placeholder="Enter speaker name"
                  className="input-field w-full"
                />
              </div>
            </div>
          ))}
        </div>

        {!hasUniquenames() && hasAtLeastOneName && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center text-yellow-800 text-sm">
              <span className="mr-2">⚠️</span>
              Speaker names must be unique. Please use different names for each speaker.
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={onSkip}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium"
          >
            Skip this step (use generic names)
          </button>
          
          <button
            onClick={handleConfirmSpeakers}
            disabled={!hasAtLeastOneName || !hasUniquenames()}
            className={`px-6 py-2 rounded-lg font-medium ${
              hasAtLeastOneName && hasUniquenames()
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Confirm Speakers
          </button>
        </div>
      </div>
    </div>
  );
};