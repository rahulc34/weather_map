import { useEffect, useRef, useState } from 'react';
import { askQuestion, errorMessage, userTimeZone } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import { ErrorMessage } from './ErrorMessage.jsx';

const QUESTION_MAX = 500;
const HISTORY_LIMIT = 6;

/**
 * Follow-up Q&A with the current AQI + profile as context.
 * Lazy-loaded by App so it doesn't weigh on the initial bundle.
 * @param {{ location: { name: string, lat: number, lon: number }, profile: object }} props
 */
export default function Chat({ location, profile }) {
  const { t, lang } = useI18n();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState(
    /** @type {{ role: 'user'|'assistant', text: string, note?: string, fallback?: boolean }[]} */ ([]),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef(/** @type {AbortController | null} */ (null));

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async (text) => {
    const q = text.trim();
    if (q.length < 2 || pending) return;
    setError('');
    setPending(true);
    setQuestion('');
    const history = messages
      .slice(-HISTORY_LIMIT)
      .map(({ role, text: m }) => ({ role, text: m.slice(0, 1000) }));
    setMessages((m) => [...m, { role: 'user', text: q }]);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await askQuestion(
        {
          lat: location.lat,
          lon: location.lon,
          locationName: location.name || undefined,
          lang,
          timeZone: userTimeZone(),
          profile,
          question: q,
          history,
        },
        controller.signal,
      );
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: res.answer,
          note: res.safetyNote,
          fallback: res.source === 'fallback',
        },
      ]);
    } catch (err) {
      if (err?.name !== 'AbortError') setError(errorMessage(err, t));
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(question);
  };

  return (
    <section className="card chat" aria-labelledby="chat-heading">
      <h2 id="chat-heading">{t('chat.heading')}</h2>
      <p className="muted">{t('chat.intro')}</p>

      <div className="chat__log" role="log" aria-live="polite" aria-label={t('chat.logLabel')}>
        <ol className="chat__list">
          {messages.length === 0 && <li className="muted chat__empty">{t('chat.empty')}</li>}
          {messages.map((m, i) => (
            <li key={i} className={`chat__msg chat__msg--${m.role}`}>
              <span className="chat__who">
                {m.role === 'user' ? t('chat.you') : t('chat.assistant')}:
              </span>{' '}
              <span>{m.text}</span>
              {m.note && <span className="chat__note">{m.note}</span>}
              {m.fallback && <span className="chat__note muted">{t('chat.fallback')}</span>}
            </li>
          ))}
          {pending && <li className="chat__msg chat__msg--assistant muted">{t('chat.sending')}</li>}
        </ol>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="chat__examples" role="group" aria-label={t('chat.examplesLabel')}>
        {t('chat.examples').map((ex) => (
          <button
            key={ex}
            type="button"
            className="chip"
            onClick={() => send(ex)}
            disabled={pending}
          >
            {ex}
          </button>
        ))}
      </div>

      <form className="chat__form" onSubmit={handleSubmit}>
        <label htmlFor="chat-input">{t('chat.label')}</label>
        <div className="location-form__row">
          <input
            id="chat-input"
            type="text"
            maxLength={QUESTION_MAX}
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
