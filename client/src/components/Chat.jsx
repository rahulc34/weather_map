import { useState } from 'react';
import { LIMITS } from '@smogsense/shared';
import { useChat } from '../hooks/useChat.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import { ErrorMessage } from './ErrorMessage.jsx';

/**
 * Conversation transcript, announced politely to screen readers.
 * @param {{ messages: import('../hooks/useChat.js').ChatMessage[], pending: boolean }} props
 * @returns {import('react').JSX.Element} chat log
 */
function ChatLog({ messages, pending }) {
  const { t } = useI18n();
  return (
    <div className="chat__log" role="log" aria-live="polite" aria-label={t('chat.logLabel')}>
      <ol className="chat__list">
        {messages.length === 0 && <li className="muted chat__empty">{t('chat.empty')}</li>}
        {messages.map((message, index) => (
          <li key={index} className={`chat__msg chat__msg--${message.role}`}>
            <span className="chat__who">
              {message.role === 'user' ? t('chat.you') : t('chat.assistant')}:
            </span>{' '}
            <span>{message.text}</span>
            {message.note && <span className="chat__note">{message.note}</span>}
            {message.fallback && <span className="chat__note muted">{t('chat.fallback')}</span>}
          </li>
        ))}
        {pending && <li className="chat__msg chat__msg--assistant muted">{t('chat.sending')}</li>}
      </ol>
    </div>
  );
}

/**
 * One-click example questions.
 * @param {{ disabled: boolean, onAsk: (question: string) => void }} props
 * @returns {import('react').JSX.Element} chip group
 */
function ExampleQuestions({ disabled, onAsk }) {
  const { t } = useI18n();
  return (
    <div className="chat__examples" role="group" aria-label={t('chat.examplesLabel')}>
      {t('chat.examples').map((example) => (
        <button
          key={example}
          type="button"
          className="chip"
          onClick={() => onAsk(example)}
          disabled={disabled}
        >
          {example}
        </button>
      ))}
    </div>
  );
}

/**
 * Follow-up Q&A with the current AQI + profile as context.
 * Lazy-loaded by App so it doesn't weigh on the initial bundle.
 * @param {{ location: { name: string, lat: number, lon: number }, profile: object }} props
 * @returns {import('react').JSX.Element} chat card
 */
export default function Chat({ location, profile }) {
  const { t } = useI18n();
  const [question, setQuestion] = useState('');
  const { messages, pending, error, send } = useChat({ location, profile });

  const handleSubmit = (e) => {
    e.preventDefault();
    setQuestion('');
    send(question);
  };

  return (
    <section className="card chat" aria-labelledby="chat-heading">
      <h2 id="chat-heading">{t('chat.heading')}</h2>
      <p className="muted">{t('chat.intro')}</p>
      <ChatLog messages={messages} pending={pending} />
      {error && <ErrorMessage error={error} />}
      <ExampleQuestions disabled={pending} onAsk={send} />
      <form className="chat__form" onSubmit={handleSubmit}>
        <label htmlFor="chat-input">{t('chat.label')}</label>
        <div className="location-form__row">
          <input
            id="chat-input"
            type="text"
            maxLength={LIMITS.question}
            placeholder={t('chat.placeholder')}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button type="submit" className="btn" disabled={pending || question.trim().length < 2}>
            {pending ? t('chat.sending') : t('chat.send')}
          </button>
        </div>
      </form>
    </section>
  );
}
