import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AppSettings } from '@/shared/types';

export class SettingsService {
  private settingsPath: string;
  private settings: AppSettings;

  constructor() {
    this.settingsPath = path.join(os.homedir(), 'MeetingIntelligence', 'settings.json');
    this.settings = this.getDefaultSettings();
    this.loadSettings();
  }

  private getDefaultSettings(): AppSettings {
    return {
      audioQuality: 'medium',
      autoDeleteRecordings: true,
      defaultLanguage: 'auto',
      transcriptionModel: 'gpt-4o-mini-transcribe',
      anthropicModel: 'claude-3-5-haiku-latest',
      apiKeys: {},
      storageLocation: path.join(os.homedir(), 'MeetingIntelligence'),
    };
  }

  private loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const settingsData = fs.readFileSync(this.settingsPath, 'utf8');
        const loadedSettings = JSON.parse(settingsData);
        this.settings = { ...this.getDefaultSettings(), ...loadedSettings };
      } else {
        // Create default settings file
        this.saveSettings();
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  public async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    this.settings = { ...this.settings, ...updates };
    await this.saveSettings();
    return this.getSettings();
  }

  private async saveSettings(): Promise<void> {
    try {
      const settingsDir = path.dirname(this.settingsPath);
      
      // Ensure directory exists
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }

      // Write settings to file
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  public async setApiKey(provider: 'openai' | 'anthropic', apiKey: string): Promise<void> {
    // In a production app, this would use the system keychain for secure storage
    this.settings.apiKeys[provider] = apiKey;
    await this.saveSettings();
  }

  public getApiKey(provider: 'openai' | 'anthropic'): string | undefined {
    return this.settings.apiKeys[provider];
  }

  public async clearApiKey(provider: 'openai' | 'anthropic'): Promise<void> {
    delete this.settings.apiKeys[provider];
    await this.saveSettings();
  }

  public getStorageLocation(): string {
    return this.settings.storageLocation;
  }

  public async setStorageLocation(location: string): Promise<void> {
    // Validate that the location exists or can be created
    try {
      if (!fs.existsSync(location)) {
        fs.mkdirSync(location, { recursive: true });
      }
      
      this.settings.storageLocation = location;
      await this.saveSettings();
    } catch (error) {
      throw new Error(`Cannot set storage location to ${location}: ${(error as Error).message}`);
    }
  }
}