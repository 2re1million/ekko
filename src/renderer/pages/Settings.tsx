import React, { useState, useEffect } from 'react';
import { AppSettings } from '@/shared/types';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    audioQuality: 'medium',
    autoDeleteRecordings: true,
    defaultLanguage: 'auto',
    transcriptionModel: 'gpt-4o-mini-transcribe',
    anthropicModel: 'claude-3-5-haiku-latest',
    apiKeys: {},
    storageLocation: '',
  });

  const [showApiKeys, setShowApiKeys] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await window.electronAPI.settings.getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await window.electronAPI.settings.updateSettings(settings);
      
      // Save API keys separately if they were changed
      if (settings.apiKeys.openai) {
        await window.electronAPI.settings.setApiKey('openai', settings.apiKeys.openai);
      }
      if (settings.apiKeys.anthropic) {
        await window.electronAPI.settings.setApiKey('anthropic', settings.apiKeys.anthropic);
      }
      
      // Show success message briefly
      setTimeout(() => setSaving(false), 1000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure your Meeting Intelligence preferences</p>
      </div>

      <div className="space-y-6">
        {/* Audio Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Audio Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audio Quality
              </label>
              <select
                value={settings.audioQuality}
                onChange={(e) => setSettings({...settings, audioQuality: e.target.value as any})}
                className="input-field w-full"
              >
                <option value="low">Low (16 kHz)</option>
                <option value="medium">Medium (44.1 kHz)</option>
                <option value="high">High (48 kHz)</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoDelete"
                checked={settings.autoDeleteRecordings}
                onChange={(e) => setSettings({...settings, autoDeleteRecordings: e.target.checked})}
                className="mr-3"
              />
              <label htmlFor="autoDelete" className="text-sm font-medium text-gray-700">
                Automatically delete audio recordings after processing
              </label>
            </div>
          </div>
        </div>

        {/* Language Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Language Settings</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Language
            </label>
            <select
              value={settings.defaultLanguage}
              onChange={(e) => setSettings({...settings, defaultLanguage: e.target.value as any})}
              className="input-field w-full"
            >
              <option value="auto">Auto-detect</option>
              <option value="no">Norwegian</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        {/* AI Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Processing</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transcription Model
              </label>
              <select
                value={settings.transcriptionModel}
                onChange={(e) => setSettings({...settings, transcriptionModel: e.target.value as any})}
                className="input-field w-full"
              >
                <option value="gpt-4o-mini-transcribe">GPT-4o Mini Transcribe (Best value - higher quality, lower cost)</option>
                <option value="gpt-4o-transcribe">GPT-4o Transcribe (Highest quality, premium pricing)</option>
                <option value="whisper-1">Whisper-1 (Original Whisper, full features, medium cost)</option>
              </select>
              <div className="text-xs text-gray-500 mt-1">
                GPT-4o models offer better Norwegian language support and context understanding
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Analysis Model (Claude)
              </label>
              <select
                value={settings.anthropicModel}
                onChange={(e) => setSettings({...settings, anthropicModel: e.target.value as any})}
                className="input-field w-full"
              >
                <option value="claude-3-haiku-20240307">Claude Haiku 3 (Most cost-effective - ~85% cost reduction)</option>
                <option value="claude-3-5-haiku-latest">Claude Haiku 3.5 (Best value - fast & intelligent, ~75% cost reduction)</option>
                <option value="claude-sonnet-4-0">Claude Sonnet 4 (Highest performance, current pricing)</option>
              </select>
              <div className="text-xs text-gray-500 mt-1">
                Haiku 3.5 recommended - excellent quality at much lower cost for meeting analysis
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  API Keys
                </label>
                <button
                  onClick={() => setShowApiKeys(!showApiKeys)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showApiKeys ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showApiKeys && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      OpenAI API Key (for Whisper)
                    </label>
                    <input
                      type="password"
                      value={settings.apiKeys.openai || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        apiKeys: { ...settings.apiKeys, openai: e.target.value }
                      })}
                      className="input-field w-full"
                      placeholder="sk-..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Anthropic API Key (for Claude)
                    </label>
                    <input
                      type="password"
                      value={settings.apiKeys.anthropic || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        apiKeys: { ...settings.apiKeys, anthropic: e.target.value }
                      })}
                      className="input-field w-full"
                      placeholder="sk-ant-..."
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    API keys are stored securely in your system keychain
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Storage Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Storage</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Storage Location
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={settings.storageLocation || '~/MeetingIntelligence'}
                readOnly
                className="input-field flex-1"
              />
              <button className="btn-secondary">
                Change
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Location where meetings and recordings are stored
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button 
            onClick={saveSettings} 
            disabled={saving}
            className={`px-6 py-2 rounded-lg font-medium ${
              saving 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};