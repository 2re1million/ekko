import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TranscriptionResult, Speaker } from '@/shared/types';
import { SettingsService } from './SettingsService';

export class TranscriptionService {
  private openai: OpenAI | null = null;
  private settingsService: SettingsService;

  constructor(settingsService?: SettingsService) {
    this.settingsService = settingsService || new SettingsService();
    // Initialize OpenAI client if API key is available
    this.initializeOpenAI();
  }

  private async initializeOpenAI() {
    try {
      // Get API key from shared SettingsService
      const apiKey = process.env.OPENAI_API_KEY || this.settingsService.getApiKey('openai');
      if (apiKey) {
        this.openai = new OpenAI({ apiKey });
      }
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
    }
  }

  async transcribeAudio(audioFilePath: string): Promise<TranscriptionResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please check your API key.');
    }

    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    try {
      const settings = this.settingsService.getSettings();
      const model = settings.transcriptionModel;
      const language = settings.defaultLanguage === 'auto' ? undefined : settings.defaultLanguage;
      
      console.log(`Starting transcription for: ${audioFilePath} using model: ${model}`);

      // Create a read stream for the audio file
      const audioFile = fs.createReadStream(audioFilePath);

      // Prepare transcription parameters based on model capabilities
      const transcriptionParams: any = {
        file: audioFile,
        model: model,
      };

      // Add intelligent prompting for GPT-4o models
      if (model === 'gpt-4o-mini-transcribe' || model === 'gpt-4o-transcribe') {
        transcriptionParams.response_format = 'json';
        
        // GPT-4o models prefer language specification in prompt, not as parameter
        let prompt = '';
        if (language === 'no' || language === undefined) {
          prompt = 'Please transcribe this Norwegian audio with proper punctuation and capitalization. This is a Norwegian business meeting that may contain some English terms. Preserve Norwegian characters (æ, ø, å) correctly.';
        } else if (language === 'en') {
          prompt = 'Please transcribe this English audio with proper punctuation and capitalization. This is an English business meeting.';
        } else {
          // Auto-detect case
          prompt = 'Please transcribe this audio with proper punctuation and capitalization. Detect the language automatically and transcribe accordingly.';
        }
        
        transcriptionParams.prompt = prompt;
      } else if (model === 'whisper-1') {
        // Only whisper-1 supports verbose_json, timestamp_granularities, and language parameter
        transcriptionParams.response_format = 'verbose_json';
        transcriptionParams.timestamp_granularities = ['segment'];
        
        // Whisper-1 uses language parameter
        if (language) {
          transcriptionParams.language = language;
        }
      }

      // Call OpenAI transcription API
      const transcription = await this.openai.audio.transcriptions.create(transcriptionParams);

      console.log('Transcription completed');

      // Extract transcript text
      const transcript = transcription.text;

      // For now, simulate speaker diarization
      // In a real implementation, you'd use a service like AssemblyAI or AWS Transcribe
      const speakers = await this.simulateSpeakerDiarization(transcript, audioFilePath);

      // Get audio duration (simplified)
      const duration = await this.getAudioDuration(audioFilePath);

      return {
        transcript,
        speakers,
        confidence: 0.9, // Would come from actual service
        duration,
      };
    } catch (error) {
      console.error('Transcription failed:', error);
      throw new Error(`Transcription failed: ${(error as Error).message}`);
    }
  }

  private async extractAudioSnippets(audioFilePath: string, numSpeakers: number): Promise<string[]> {
    // Extract small audio snippets for speaker identification
    // In a real implementation, this would use proper speaker timestamps
    const snippets: string[] = [];
    
    try {
      const snippetsDir = path.join(path.dirname(audioFilePath), 'snippets');
      if (!fs.existsSync(snippetsDir)) {
        fs.mkdirSync(snippetsDir, { recursive: true });
      }
      
      // For now, extract snippets from different parts of the recording
      // This is a simplified approach - real diarization would use actual speaker segments
      for (let i = 0; i < numSpeakers; i++) {
        const startTime = Math.floor((i * 30) + 10); // Start at 10s, 40s, 70s, etc.
        const snippetPath = path.join(snippetsDir, `speaker_${i + 1}_sample.wav`);
        
        // Use SoX to extract 5-second snippets
        // sox input.wav output.wav trim start duration
        const { spawnSync } = require('child_process');
        const result = spawnSync('sox', [
          audioFilePath,
          snippetPath,
          'trim', `${startTime}`, '5'
        ], { encoding: 'utf8' });
        
        if (result.status === 0 && fs.existsSync(snippetPath)) {
          snippets.push(snippetPath);
        } else {
          console.warn(`Failed to extract snippet ${i + 1}:`, result.stderr);
          snippets.push(''); // Empty snippet if extraction failed
        }
      }
    } catch (error) {
      console.error('Error extracting audio snippets:', error);
    }
    
    return snippets;
  }

  private async simulateSpeakerDiarization(transcript: string, audioFilePath?: string): Promise<Speaker[]> {
    // This is a simplified simulation that tries to be more realistic
    // In reality, you'd use a proper speaker diarization service like AssemblyAI or AWS Transcribe
    
    const speakers: Speaker[] = [];
    
    // Analyze transcript for speaker indicators
    const words = transcript.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    
    // Look for conversational patterns that indicate multiple speakers
    const conversationIndicators = [
      'yes', 'no', 'okay', 'right', 'exactly', 'sure', 'definitely',
      'question', 'answer', 'think', 'believe', 'agree', 'disagree'
    ];
    
    // Look for direct address patterns
    const addressPatterns = ['you', 'your', 'we', 'us', 'our'];
    
    // Count indicators
    const indicatorCount = words.filter(word => 
      conversationIndicators.includes(word) || addressPatterns.includes(word)
    ).length;
    
    // Determine number of speakers based on transcript analysis
    let numSpeakers = 1; // Default to 1 speaker
    
    if (totalWords > 100) { // Only consider multiple speakers for longer transcripts
      const indicatorRatio = indicatorCount / totalWords;
      
      if (indicatorRatio > 0.15) {
        numSpeakers = 3; // High interaction, likely 3+ speakers
      } else if (indicatorRatio > 0.08) {
        numSpeakers = 2; // Moderate interaction, likely 2 speakers
      }
      
      // Additional check: look for sentence patterns that suggest dialogue
      const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
      if (sentences.length > 5) {
        const shortSentences = sentences.filter(s => s.split(/\s+/).length < 15).length;
        if (shortSentences / sentences.length > 0.6) {
          numSpeakers = Math.max(numSpeakers, 2); // Short sentences often indicate dialogue
        }
      }
    }
    
    // Cap at 4 speakers max for UI simplicity
    numSpeakers = Math.min(numSpeakers, 4);
    
    // Extract audio snippets if audio file is provided
    let audioSnippets: string[] = [];
    if (audioFilePath) {
      audioSnippets = await this.extractAudioSnippets(audioFilePath, numSpeakers);
    }
    
    for (let i = 0; i < numSpeakers; i++) {
      speakers.push({
        id: `speaker_${i + 1}`,
        name: `Speaker ${i + 1}`,
        confidence: 0.75 + Math.random() * 0.2, // More realistic confidence range
        sampleAudio: audioSnippets[i] || '', // Path to audio snippet file
      });
    }

    console.log(`Speaker detection: ${totalWords} words, ${indicatorCount} indicators, detected ${numSpeakers} speaker(s)`);
    return speakers;
  }

  private async getAudioDuration(audioFilePath: string): Promise<number> {
    // Simplified duration calculation
    // In reality, you'd use a proper audio analysis library
    const stats = fs.statSync(audioFilePath);
    // Rough estimate: 16kHz mono WAV is about 32KB per second
    return Math.floor(stats.size / 32000);
  }


  async setApiKey(apiKey: string): Promise<void> {
    // TODO: Store API key securely in keychain
    // For now, just initialize the client
    this.openai = new OpenAI({ apiKey });
  }
}