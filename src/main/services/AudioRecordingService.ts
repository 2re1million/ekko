import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RecordingStatus } from '@/shared/types';
import { EventEmitter } from 'events';
import { spawnSync } from 'child_process';
const record = require('node-record-lpcm16');

export class AudioRecordingService extends EventEmitter {
  private recording: any = null;
  private isRecording: boolean = false;
  private startTime: Date | null = null;
  private audioFile: fs.WriteStream | null = null;
  private currentFileName: string | null = null;
  private recordingsDir: string;
  private statusInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.recordingsDir = path.join(os.homedir(), 'MeetingIntelligence', 'recordings');
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists() {
    if (!fs.existsSync(this.recordingsDir)) {
      fs.mkdirSync(this.recordingsDir, { recursive: true });
    }
  }

  async startRecording(): Promise<{ success: boolean; fileName?: string; error?: string }> {
    if (this.isRecording) {
      return { success: false, error: 'Recording already in progress' };
    }

    try {
      // Detect available recording backend (sox/rec)
      const recordProgram = this.findRecordProgram();
      if (!recordProgram) {
        const help = process.platform === 'darwin'
          ? 'Install SoX: brew install sox'
          : 'Please install SoX and ensure "sox" or "rec" is on your PATH';
        const message = `Audio backend not found. ${help}`;
        this.emit('recording:error', new Error(message));
        return { success: false, error: message };
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      this.currentFileName = `meeting_${timestamp}.wav`;
      const filePath = path.join(this.recordingsDir, this.currentFileName);

      // Create write stream
      this.audioFile = fs.createWriteStream(filePath);

      // Configure recording options
      const recordingOptions = {
        sampleRateHertz: 16000,
        threshold: 0,
        verbose: false,
        recordProgram, // Prefer detected program
        silence: '1.0',
      };

      // Start recording
      this.recording = record.record(recordingOptions);
      
      // Pipe audio data to file
      this.recording.stream().pipe(this.audioFile);

      // Set up event handlers
      this.recording.stream().on('error', (error: Error) => {
        console.error('Recording error:', error);
        this.stopRecording();
        this.emit('recording:error', error);
      });

      // Track recording state
      this.isRecording = true;
      this.startTime = new Date();

      // Start status update interval
  this.startStatusUpdates();

      console.log(`Recording started: ${filePath}`);
      this.emit('recording:started', { fileName: this.currentFileName });

      return { success: true, fileName: this.currentFileName };
    } catch (error) {
      console.error('Failed to start recording:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async stopRecording(): Promise<{ success: boolean; audioFilePath?: string; duration?: number; error?: string }> {
    if (!this.isRecording) {
      return { success: false, error: 'No recording in progress' };
    }

    try {
      // Stop the recording
      if (this.recording) {
        this.recording.stop();
        this.recording = null;
      }

      // Close the file stream
      if (this.audioFile) {
        this.audioFile.end();
        this.audioFile = null;
      }

      // Calculate duration
      const duration = this.startTime ? Math.floor((Date.now() - this.startTime.getTime()) / 1000) : 0;
      const audioFilePath = this.currentFileName ? path.join(this.recordingsDir, this.currentFileName) : null;

      // Reset state
      this.isRecording = false;
      this.startTime = null;
      if (this.statusInterval) {
        clearInterval(this.statusInterval);
        this.statusInterval = null;
      }
      const fileName = this.currentFileName;
      this.currentFileName = null;

      console.log(`Recording stopped: ${audioFilePath}, duration: ${duration}s`);
      this.emit('recording:stopped', { fileName, duration, audioFilePath });

      return {
        success: true,
        audioFilePath: audioFilePath || undefined,
        duration
      };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  getRecordingStatus(): RecordingStatus {
    const duration = this.isRecording && this.startTime 
      ? Math.floor((Date.now() - this.startTime.getTime()) / 1000)
      : 0;

    return {
      isRecording: this.isRecording,
      duration,
      audioLevel: this.getAudioLevel(), // Simplified - would need actual audio level detection
      fileName: this.currentFileName || undefined,
    };
  }

  private getAudioLevel(): number {
    // Simplified audio level detection
    // In a real implementation, this would analyze the actual audio stream
    if (!this.isRecording) return 0;
    
    // Simulate varying audio levels for demo purposes
    return Math.random() * 0.8 + 0.1;
  }

  private startStatusUpdates() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }
    this.statusInterval = setInterval(() => {
      if (!this.isRecording) {
        if (this.statusInterval) {
          clearInterval(this.statusInterval);
          this.statusInterval = null;
        }
        return;
      }

      const status = this.getRecordingStatus();
      
      // Check for recording time limits
      const duration = status.duration;
      if (duration === 70 * 60) { // 70 minutes
        this.emit('recording:timeWarning', { 
          duration, 
          message: 'Recording has reached 70 minutes. Do you want to continue?',
          level: 'warning'
        });
      } else if (duration === 90 * 60) { // 90 minutes
        this.emit('recording:timeWarning', { 
          duration, 
          message: 'Recording has reached 90 minutes. This is getting quite long. Do you want to continue?',
          level: 'critical'
        });
      }
      
      this.emit('recording:statusUpdate', status);
    }, 1000); // Update every second
  }

  async pauseForUserChoice(): Promise<void> {
    // Temporarily pause status updates to prevent multiple warnings
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  resumeStatusUpdates(): void {
    // Resume status updates after user choice
    if (this.isRecording) {
      this.startStatusUpdates();
    }
  }

  // Clean up resources
  destroy() {
    if (this.isRecording) {
      this.stopRecording();
    }
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  private findRecordProgram(): 'sox' | 'rec' | null {
    const has = (cmd: string) => {
      try {
        const out = spawnSync('which', [cmd], { encoding: 'utf8' });
        return out.status === 0 && typeof out.stdout === 'string' && out.stdout.trim().length > 0;
      } catch {
        return false;
      }
    };

    if (has('sox')) return 'sox';
    if (has('rec')) return 'rec';
    return null;
  }
}