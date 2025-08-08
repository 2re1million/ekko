# Meeting Intelligence Platform

A macOS desktop application that automatically records, transcribes, and analyzes meetings to produce actionable summaries, decision logs, and task assignments using AI-powered processing.

## Features

- **One-Click Recording**: Capture system audio and microphone input simultaneously
- **Real-time Transcription**: Powered by OpenAI Whisper API with speaker diarization
- **AI-Powered Analysis**: Norwegian/English summaries, decision extraction, and action items using Anthropic Claude Sonnet 4
- **Speaker Identification**: Interactive interface to identify meeting participants
- **Meeting Repository**: Searchable database of all processed meetings
- **Export Options**: PDF and Markdown export capabilities
- **Privacy-First**: All data stored locally with optional audio cleanup

## Prerequisites

- macOS 12.0 Monterey or later
- Node.js 16+ and npm
- Homebrew (for SoX installation)
- SoX audio processing library
- OpenAI API key (for transcription)
- Anthropic API key (for analysis)

## Installation

### Quick Setup (Recommended)

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd meetingsummarizer
   ```

2. Run the automated setup script:
   ```bash
   ./setup.sh
   ```

### Manual Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd meetingsummarizer
   ```

2. Install system dependencies:
   ```bash
   # Install SoX for audio recording
   brew install sox
   ```

3. Install Node.js dependencies:
   ```bash
   npm install
   ```

4. Configure API keys (choose one method):
   
   **Method 1: Environment Variables**
   ```bash
   export OPENAI_API_KEY=your_openai_api_key
   export ANTHROPIC_API_KEY=your_anthropic_api_key
   ```
   
   **Method 2: Application Settings**
   - Launch the application
   - Navigate to Settings
   - Add your API keys in the API Keys section

## Development

Start the development server:
```bash
npm run dev
```

Start Electron in development mode:
```bash
npm start
```

## Building

Build for development:
```bash
npm run build:dev
```

Build for production:
```bash
npm run build
```

Create distributable package:
```bash
npm run dist:mac
```

## Usage

### Recording Meetings

1. Launch the application
2. Click "New Recording" from the dashboard
3. Click "Start Recording" to begin capturing audio
4. Click "Stop Recording" when finished

### Processing Workflow

After stopping a recording, the application will:

1. **Transcribe** the audio using OpenAI Whisper
2. **Identify Speakers** - you'll be prompted to name each detected voice
3. **AI Analysis** - Claude will generate summary, decisions, and action items
4. **Save Meeting** - everything is stored in your local database

### Managing Meetings

- View all meetings from the main dashboard
- Search by title, participants, or content
- Click on any meeting to view details
- Export meetings as PDF or Markdown
- Edit meeting information as needed

### Settings

Configure the application through Settings:

- **Audio Quality**: Choose recording quality (16kHz to 48kHz)
- **Language**: Set default language for analysis
- **API Keys**: Securely store OpenAI and Anthropic API keys
- **Storage**: Choose where meetings are stored
- **Auto-cleanup**: Automatically delete audio files after processing

## Data Storage

All meeting data is stored locally in:
- **Database**: `~/MeetingIntelligence/meetings.db`
- **Recordings**: `~/MeetingIntelligence/recordings/` (optional)
- **Settings**: `~/MeetingIntelligence/settings.json`

## Security

- API keys are stored securely in macOS Keychain
- All processing happens locally except for API calls
- No data is sent to third parties beyond the specified AI services
- Audio files can be automatically deleted after processing

## Troubleshooting

### Audio Recording Issues
- **Error: "spawn sox ENOENT"**: Install SoX with `brew install sox`
- **No audio captured**: Ensure microphone permissions are granted in System Preferences
- **Virtual meetings**: System audio capture may require additional setup for Zoom/Teams
- **Permission denied**: Grant microphone access when prompted by macOS

### API Issues
- **Transcription fails**: Verify OpenAI API key is set (check Settings or environment variables)
- **Analysis fails**: Verify Anthropic API key is set
- **Network errors**: Check internet connection and firewall settings
- **Rate limits**: Monitor API usage limits in your provider dashboards

### Application Issues
- **Window not visible**: Try focusing the app or restarting
- **Build fails**: Ensure all dependencies are installed (`npm install`)
- **Database errors**: Check that ~/MeetingIntelligence directory has write permissions

### Performance Notes
- **Transcription**: ~5 minutes for 1 hour of audio (with Whisper API)
- **Analysis**: ~10 seconds for typical meeting transcript
- **Storage**: ~1MB per hour of meeting data (excluding audio files)

## Architecture

Built with:
- **Electron** - Native macOS app framework
- **React** - User interface
- **TypeScript** - Type safety
- **SQLite** - Local database
- **Tailwind CSS** - Styling
- **OpenAI Whisper** - Speech-to-text
- **Anthropic Claude Sonnet 4** - AI analysis

## License

MIT License

## Support

For issues and feature requests, please use the GitHub issues tracker.