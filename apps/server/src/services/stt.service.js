import axios from 'axios';
import FormData from 'form-data';
import { logger } from '../utils/logger.js';

const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

/**
 * Transcribes merchant voice notes via the OpenAI Whisper API.
 * Without an OPENAI_API_KEY, returns a labeled demo transcript so the voice
 * onboarding flow stays demoable end-to-end.
 */
export async function transcribeAudio(audioBuffer, filename, mimeType) {
  if (!process.env.OPENAI_API_KEY) {
    logger.warn('OPENAI_API_KEY not set — returning demo transcript');
    return {
      source: 'demo-fallback',
      transcript:
        'Aaj 20 packet Parle-G aaye 30 rupaye wale, aur 12 bottle Thums Up 45 ka.',
    };
  }

  const form = new FormData();
  form.append('file', audioBuffer, { filename, contentType: mimeType });
  form.append('model', 'whisper-1');

  const { data } = await axios.post(WHISPER_URL, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    timeout: 60_000,
    maxBodyLength: 30 * 1024 * 1024,
  });

  logger.info({ chars: data.text?.length }, 'Audio transcribed');
  return { source: 'whisper', transcript: data.text };
}
