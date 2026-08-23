import { useMutation } from '@tanstack/react-query';
import { apiClient, apiRequest } from '../../services/apiClient.js';

export function useAskCopilot() {
  return useMutation({
    // The copilot page is Q&A-only (no confirm UI) — actions live in the
    // floating assistant, which posts allowActions: true by default
    mutationFn: ({ question, language }) =>
      apiRequest(apiClient.post('/sales/ask', { question, language, allowActions: false }, { timeout: 120_000 })),
  });
}

export function useAskCopilotVoice() {
  return useMutation({
    mutationFn: ({ file, language }) => {
      const form = new FormData();
      form.append('audio', file);
      form.append('language', language);
      return apiRequest(apiClient.post('/sales/ask/voice', form, { timeout: 180_000 }));
    },
  });
}
