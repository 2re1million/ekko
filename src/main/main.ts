import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { DatabaseService } from './services/DatabaseService';
import { AudioRecordingService } from './services/AudioRecordingService';
import { TranscriptionService } from './services/TranscriptionService';
import { AIAnalysisService } from './services/AIAnalysisService';
import { SettingsService } from './services/SettingsService';
import { FileService } from './services/FileService';

class MeetingIntelligenceApp {
  private mainWindow: BrowserWindow | null = null;
  private databaseService: DatabaseService;
  private audioRecordingService: AudioRecordingService;
  private transcriptionService: TranscriptionService;
  private aiAnalysisService: AIAnalysisService;
  private settingsService: SettingsService;

  constructor() {
    this.settingsService = new SettingsService();
    this.databaseService = new DatabaseService();
    this.audioRecordingService = new AudioRecordingService();
    this.transcriptionService = new TranscriptionService(this.settingsService);
    this.aiAnalysisService = new AIAnalysisService(this.settingsService);
    
    this.setupEventHandlers();
    this.setupServiceEventHandlers();
  }

  private setupEventHandlers() {
    app.whenReady().then(() => {
      this.createMainWindow();
      this.setupIpcHandlers();
      
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  private createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    const isDev = process.env.NODE_ENV === 'development' && process.env.DEV_SERVER === 'true';
    
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, 'index.html'));
    }
  }

  private setupIpcHandlers() {
    // Database operations
    ipcMain.handle('database:getAllMeetings', async () => {
      return this.databaseService.getAllMeetings();
    });

    ipcMain.handle('database:getMeeting', async (event, id: string) => {
      return this.databaseService.getMeeting(id);
    });

    ipcMain.handle('database:saveMeeting', async (event, meeting: any) => {
      return this.databaseService.saveMeeting(meeting);
    });

    ipcMain.handle('database:updateMeeting', async (event, id: string, updates: any) => {
      return this.databaseService.updateMeeting(id, updates);
    });

    ipcMain.handle('database:deleteMeeting', async (event, id: string) => {
      return this.databaseService.deleteMeeting(id);
    });

    // Audio recording operations
    ipcMain.handle('audio:startRecording', async () => {
      return this.audioRecordingService.startRecording();
    });

    ipcMain.handle('audio:stopRecording', async () => {
      return this.audioRecordingService.stopRecording();
    });

    ipcMain.handle('audio:getRecordingStatus', async () => {
      return this.audioRecordingService.getRecordingStatus();
    });

    ipcMain.handle('audio:pauseForUserChoice', async () => {
      return this.audioRecordingService.pauseForUserChoice();
    });

    ipcMain.handle('audio:resumeStatusUpdates', async () => {
      return this.audioRecordingService.resumeStatusUpdates();
    });

    // Transcription operations
    ipcMain.handle('transcription:processAudio', async (event, audioFilePath: string) => {
      return this.transcriptionService.transcribeAudio(audioFilePath);
    });

    // AI Analysis operations
    ipcMain.handle('ai:analyzeMeeting', async (event, transcript: string, metadata: any) => {
      return this.aiAnalysisService.analyzeMeeting(transcript, metadata);
    });

    // Audio snippet playback
    ipcMain.handle('audio:playSnippet', async (event, snippetPath: string) => {
      // Play audio snippet using system audio player or return file path for renderer to handle
      return snippetPath;
    });

    // File operations
    ipcMain.handle('dialog:showSaveDialog', async (event, options: any) => {
      if (!this.mainWindow) return null;
      return dialog.showSaveDialog(this.mainWindow, options);
    });

    ipcMain.handle('dialog:showOpenDialog', async (event, options: any) => {
      if (!this.mainWindow) return null;
      return dialog.showOpenDialog(this.mainWindow, options);
    });

    // Settings operations
    ipcMain.handle('settings:getSettings', async () => {
      return this.settingsService.getSettings();
    });

    ipcMain.handle('settings:updateSettings', async (event, updates: any) => {
      return this.settingsService.updateSettings(updates);
    });

    ipcMain.handle('settings:setApiKey', async (event, provider: 'openai' | 'anthropic', apiKey: string) => {
      await this.settingsService.setApiKey(provider, apiKey);
      
      // Update service instances with new API key
      if (provider === 'openai') {
        await this.transcriptionService.setApiKey(apiKey);
      } else if (provider === 'anthropic') {
        await this.aiAnalysisService.setApiKey(apiKey);
      }
      
      return true;
    });

    ipcMain.handle('settings:clearApiKey', async (event, provider: 'openai' | 'anthropic') => {
      return this.settingsService.clearApiKey(provider);
    });

    // File operations
    ipcMain.handle('files:deleteAudio', async (event, audioFilePath: string) => {
      return FileService.deleteAudioWithSnippets(audioFilePath);
    });

    ipcMain.handle('files:getFileSize', async (event, filePath: string) => {
      return FileService.getFileSize(filePath);
    });

    ipcMain.handle('files:fileExists', async (event, filePath: string) => {
      return FileService.fileExists(filePath);
    });
  }

  private setupServiceEventHandlers() {
    // Audio recording service events
    this.audioRecordingService.on('recording:statusUpdate', (status) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('audio:statusChanged', status);
      }
    });

    this.audioRecordingService.on('recording:started', (data) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('audio:recordingStarted', data);
      }
    });

    this.audioRecordingService.on('recording:stopped', (data) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('audio:recordingStopped', data);
      }
    });

    this.audioRecordingService.on('recording:error', (error) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('audio:recordingError', error);
      }
    });

    this.audioRecordingService.on('recording:timeWarning', (data) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('audio:timeWarning', data);
      }
    });
  }
}

new MeetingIntelligenceApp();