import axios from 'axios';
import FormData from 'form-data';
import { logger } from '../utils/logger.js';

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';
const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

// Domain hint dramatically improves recognition of Indian brand names
const WHISPER_PROMPT =
  'Indian shop stock note in Hindi, English or Hinglish. Brand names like Parle-G, Maggi, Thums Up, Amul, Tata, Dettol, Colgate. Quantities and prices in rupees.';

/** Sarvam Saarika — built for Indian languages/accents. */
async function sarvamTranscribe(audioBuffer, filename, mimeType) {
  const form = new FormData();
  form.append('file', audioBuffer, { filename, contentType: mimeType });
  form.append('model', 'saarika:v2.5');

  const { data } = await axios.post(SARVAM_STT_URL, form, {
    headers: { ...form.getHeaders(), 'api-subscription-key': process.env.SARVAM_API_KEY },
    timeout: 60_000,
    maxBodyLength: 30 * 1024 * 1024,
  });
  return { source: 'sarvam-saarika', transcript: data.transcript ?? '', languageCode: data.language_code };
}

/** OpenAI Whisper. */
async function whisperTranscribe(audioBuffer, filename, mimeType) {
  const form = new FormData();
  form.append('file', audioBuffer, { filename, contentType: mimeType });
  form.append('model', 'whisper-1');
  form.append('prompt', WHISPER_PROMPT);

  const { data } = await axios.post(WHISPER_URL, form, {
    headers: { ...form.getHeaders(), Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    timeout: 60_000,
    maxBodyLength: 30 * 1024 * 1024,
  });
  return { source: 'whisper', transcript: data.text ?? '' };
}

/**
 * Transcribes merchant voice notes. Provider chain:
 *   1. Sarvam Saarika (best for Indian languages) when SARVAM_API_KEY is set
 *   2. Whisper when OPENAI_API_KEY is set (also the fallback if Sarvam rejects
 *      the audio format — browser recordings are webm/opus)
 *   3. Labeled demo transcript when no key is configured
 */
export async function transcribeAudio(audioBuffer, filename, mimeType) {
  const errors = [];

  if (process.env.SARVAM_API_KEY) {
    try {
      const result = await sarvamTranscribe(audioBuffer, filename, mimeType);
      logger.info({ source: result.source, chars: result.transcript.length, lang: result.languageCode }, 'Audio transcribed');
      return result;
    } catch (err) {
      errors.push(`sarvam: ${err.response?.status || err.message}`);
      logger.warn({ err: err.response?.data || err.message }, 'Sarvam STT failed, trying Whisper');
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await whisperTranscribe(audioBuffer, filename, mimeType);
      logger.info({ source: result.source, chars: result.transcript.length }, 'Audio transcribed');
      return result;
    } catch (err) {
      errors.push(`whisper: ${err.response?.status || err.message}`);
      logger.warn({ err: err.response?.data || err.message }, 'Whisper STT failed');
    }
  }

  if (errors.length) {
    throw new Error(`Speech-to-text failed (${errors.join('; ')}). Try recording again.`);
  }

  logger.warn('No STT API key set — returning demo transcript');
  return {
    source: 'demo-fallback',
    transcript: 'Aaj 20 packet Parle-G aaye 30 rupaye wale, aur 12 bottle Thums Up 45 ka.',
  };
}
