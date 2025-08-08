export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number; // in seconds
  participants: string[];
  transcript: string;
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
  audioFilePath?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  notes: string;
}

export interface ActionItem {
  id: string;
  task: string;
  assignee: string;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

export interface RecordingStatus {
  isRecording: boolean;
  duration: number;
  audioLevel: number;
  fileName?: string;
}

export interface Speaker {
  id: string;
  name: string;
  confidence: number;
  sampleAudio: string; // base64 encoded audio sample
}

export interface TranscriptionResult {
  transcript: string;
  speakers: Speaker[];
  confidence: number;
  duration: number;
}

export interface AIAnalysisResult {
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
  suggestedTitle: string;
  keyTopics: string[];
}

export interface AppSettings {
  audioQuality: 'low' | 'medium' | 'high';
  autoDeleteRecordings: boolean;
  defaultLanguage: 'no' | 'en' | 'auto';
  transcriptionModel: 'gpt-4o-mini-transcribe' | 'gpt-4o-transcribe' | 'whisper-1';
  anthropicModel: 'claude-3-haiku-20240307' | 'claude-3-5-haiku-latest' | 'claude-sonnet-4-0';
  apiKeys: {
    openai?: string;
    anthropic?: string;
  };
  storageLocation: string;
}