import { useState } from 'react';
import { LIMITS } from '@smogsense/shared';
import { askQuestion, buildContextPayload, isAbortError } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import { useAbortableRequest } from './useAbortableRequest.js';

const MIN_QUESTION_LENGTH = 2;

/**
 * @typedef {object} ChatMessage
 * @property {'user' | 'assistant'} role
 * @property {string} text
 * @property {string} [note] safety note from the assistant
 * @property {boolean} [fallback] true when the AI was unavailable
 */

/**
 * Recent conversation sent as context (bounded to the server's limits).
 * @param {ChatMessage[]} messages
 * @returns {{ role: string, text: string }[]} history
 */
const toHistory = (messages) =>
  messages
    .slice(-LIMITS.historyItems)
    .map(({ role, text }) => ({ role, text: text.slice(0, LIMITS.historyText) }));

/**
 * @param {{ answer: string, safetyNote: string, source: string }} response
 * @returns {ChatMessage} assistant message
 */
const toAssistantMessage = (response) => ({
  role: 'assistant',
  text: response.answer,
  note: response.safetyNote,
  fallback: response.source === 'fallback',
});

/**
 * Conversation state for follow-up questions about the current location.
 * @param {{ location: { name?: string, lat: number, lon: number }, profile: object }} context
 * @returns {{ messages: ChatMessage[], pending: boolean, error: unknown, send: (text: string) => Promise<void> }} chat state
 */
export function useChat({ location, profile }) {
  const { lang } = useI18n();
  const [messages, setMessages] = useState(/** @type {ChatMessage[]} */ ([]));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(/** @type {unknown} */ (null));
  const nextSignal = useAbortableRequest();

  const send = async (text) => {
    const question = text.trim();
    if (question.length < MIN_QUESTION_LENGTH || pending) return;
    const payload = {
      ...buildContextPayload({ location, profile, lang }),
      question,
      history: toHistory(messages),
    };
    setError(null);
    setPending(true);
    setMessages((m) => [...m, { role: 'user', text: question }]);
    try {
      const response = await askQuestion(payload, nextSignal());
      setMessages((m) => [...m, toAssistantMessage(response)]);
    } catch (err) {
      if (!isAbortError(err)) setError(err);
    } finally {
      setPending(false);
    }
  };

  return { messages, pending, error, send };
}
