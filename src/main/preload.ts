import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // Database operations
  database: {
    getAllMeetings: () => ipcRenderer.invoke('database:getAllMeetings'),
    getMeeting: (id: string) => ipcRenderer.invoke('database:getMeeting', id),
    saveMeeting: (meeting: any) => ipcRenderer.invoke('database:saveMeeting', meeting),
    updateMeeting: (id: string, updates: any) => ipcRenderer.invoke('database:updateMeeting', id, updates),
    deleteMeeting: (id: string) => ipcRenderer.invoke('database:deleteMeeting', id),
  },

  // Audio recording operations
  audio: {
    startRecording: () => ipcRenderer.invoke('audio:startRecording'),
    stopRecording: () => ipcRenderer.invoke('audio:stopRecording'),
    getRecordingStatus: () => ipcRenderer.invoke('audio:getRecordingStatus'),
    pauseForUserChoice: () => ipcRenderer.invoke('audio:pauseForUserChoice'),
    resumeStatusUpdates: () => ipcRenderer.invoke('audio:resumeStatusUpdates'),
    onRecordingStatusChanged: (callback: (status: any) => void) => {
      ipcRenderer.on('audio:statusChanged', (event, status) => callback(status));
    },
    onTimeWarning: (callback: (data: any) => void) => {
      ipcRenderer.on('audio:timeWarning', (event, data) => callback(data));
    },
  },

  // Transcription operations
  transcription: {
    processAudio: (audioFilePath: string) => ipcRenderer.invoke('transcription:processAudio', audioFilePath),
  },

  // AI Analysis operations
  ai: {
    analyzeMeeting: (transcript: string, metadata: any) => ipcRenderer.invoke('ai:analyzeMeeting', transcript, metadata),
  },

  // Audio snippet operations
  snippet: {
    playAudio: (snippetPath: string) => ipcRenderer.invoke('audio:playSnippet', snippetPath),
  },

  // Dialog operations
  dialog: {
    showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:showSaveDialog', options),
    showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:showOpenDialog', options),
  },

  // Settings operations
  settings: {
    getSettings: () => ipcRenderer.invoke('settings:getSettings'),
    updateSettings: (updates: any) => ipcRenderer.invoke('settings:updateSettings', updates),
    setApiKey: (provider: 'openai' | 'anthropic', apiKey: string) => ipcRenderer.invoke('settings:setApiKey', provider, apiKey),
    clearApiKey: (provider: 'openai' | 'anthropic') => ipcRenderer.invoke('settings:clearApiKey', provider),
  },

  // File operations
  files: {
    deleteAudio: (audioFilePath: string) => ipcRenderer.invoke('files:deleteAudio', audioFilePath),
    getFileSize: (filePath: string) => ipcRenderer.invoke('files:getFileSize', filePath),
    fileExists: (filePath: string) => ipcRenderer.invoke('files:fileExists', filePath),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}