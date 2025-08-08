import Anthropic from '@anthropic-ai/sdk';
import { AIAnalysisResult, ActionItem } from '@/shared/types';
import { SettingsService } from './SettingsService';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class AIAnalysisService {
  private anthropic: Anthropic | null = null;
  private settingsService: SettingsService;

  constructor(settingsService?: SettingsService) {
    this.settingsService = settingsService || new SettingsService();
    this.initializeAnthropic();
  }

  private async initializeAnthropic() {
    try {
      // Get API key from shared SettingsService
      const apiKey = process.env.ANTHROPIC_API_KEY || this.settingsService.getApiKey('anthropic');
      if (apiKey) {
        this.anthropic = new Anthropic({ apiKey });
      }
    } catch (error) {
      console.error('Failed to initialize Anthropic client:', error);
    }
  }

  async analyzeMeeting(transcript: string, metadata: {
    date: string;
    duration: number;
    participants?: string[];
  }): Promise<AIAnalysisResult> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized. Please check your API key.');
    }

    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Empty transcript provided for analysis');
    }

    try {
      const settings = this.settingsService.getSettings();
      const model = settings.anthropicModel;
      
      console.log(`Starting AI analysis of meeting transcript using model: ${model}`);

      const prompt = this.buildAnalysisPrompt(transcript, metadata);
      
      // Determine max_tokens based on model capabilities
      let maxTokens = 4000;
      if (model === 'claude-3-haiku-20240307') {
        maxTokens = Math.min(4000, 4096); // Haiku 3 has 4096 limit
      } else if (model === 'claude-3-5-haiku-latest') {
        maxTokens = Math.min(4000, 8192); // Haiku 3.5 has 8192 limit
      }
      // Sonnet 4 has 32000 limit, so 4000 is fine
      
      const response = await this.anthropic.messages.create({
        model: model,
        max_tokens: maxTokens,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';
      const result = this.parseAnalysisResponse(analysisText);

      console.log('AI analysis completed');
      return result;
    } catch (error) {
      console.error('AI analysis failed:', error);
      throw new Error(`AI analysis failed: ${(error as Error).message}`);
    }
  }

  private buildAnalysisPrompt(transcript: string, metadata: any): string {
    const durationText = this.formatDuration(metadata.duration);
    const participantsText = metadata.participants?.join(', ') || 'Unknown participants';

    return `Analyser følgende møtetranskript og gi strukturert informasjon på norsk:

Møteinformasjon:
- Dato: ${metadata.date}
- Varighet: ${durationText}
- Deltakere: ${participantsText}

Transkripsjon:
${transcript}

Vennligst analyser møtet og gi følgende strukturerte informasjon:

1. SAMMENDRAG (på norsk):
Skriv et naturlig og flytende sammendrag av møtet på 2-3 avsnitt som dekker hovedtemaene, viktige diskusjoner og konklusjoner.

2. BESLUTNINGER:
List opp alle konkrete beslutninger som ble tatt i møtet. Hver beslutning på en egen linje, nummerert.

3. HANDLINGSOPPGAVER:
List opp alle oppgaver/handlinger som ble tildelt deltakere. For hver oppgave, inkluder:
- Oppgave beskrivelse
- Ansvarlig person (hvis nevnt)
- Frist (hvis nevnt)  
- Prioritet (høy/medium/lav basert på kontekst)

4. FORESLÅTT TITTEL:
Foreslå en beskrivende tittel for møtet (maks 60 tegn).

5. NØKKELTEMPER:
List opp 3-5 hovedtemaer som ble diskutert.

Formater svaret som JSON med følgende struktur:
{
  "summary": "sammendrag på norsk",
  "decisions": ["beslutning 1", "beslutning 2"],
  "actionItems": [
    {
      "task": "oppgave beskrivelse",
      "assignee": "person navn eller 'Ikke spesifisert'",
      "dueDate": "YYYY-MM-DD eller null",
      "priority": "high/medium/low"
    }
  ],
  "suggestedTitle": "møtetittel",
  "keyTopics": ["tema 1", "tema 2", "tema 3"]
}`;
  }

  private parseAnalysisResponse(response: string): AIAnalysisResult {
    try {
      // Extract JSON from response (it might contain extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Convert action items to proper format with IDs
      const actionItems: ActionItem[] = (parsed.actionItems || []).map((item: any) => ({
        id: uuidv4(),
        task: item.task || '',
        assignee: item.assignee || 'Ikke spesifisert',
        dueDate: item.dueDate || undefined,
        priority: item.priority || 'medium',
        completed: false,
      }));

      return {
        summary: parsed.summary || 'Sammendrag ikke tilgjengelig',
        decisions: parsed.decisions || [],
        actionItems,
        suggestedTitle: parsed.suggestedTitle || 'Møte',
        keyTopics: parsed.keyTopics || [],
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.log('Raw response:', response);
      
      // Return fallback result
      return {
        summary: 'Kunne ikke analysere møtet automatisk. Vennligst sjekk transkriptet manuelt.',
        decisions: [],
        actionItems: [],
        suggestedTitle: 'Møte',
        keyTopics: [],
      };
    }
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}t ${minutes}m`;
    }
    return `${minutes}m`;
  }


  async setApiKey(apiKey: string): Promise<void> {
    // TODO: Store API key securely in keychain
    this.anthropic = new Anthropic({ apiKey });
  }
}