import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chat from './Chat.jsx';
import { DEFAULT_PROFILE } from './ProfileForm.jsx';
import { expectNoA11yViolations, jsonResponse, mockFetch, renderWithI18n } from '../test/utils.jsx';

const LOCATION = { name: 'Delhi', lat: 28.65, lon: 77.22 };

const setup = (lang = 'en') => ({
  user: userEvent.setup(),
  ...renderWithI18n(<Chat location={LOCATION} profile={DEFAULT_PROFILE} />, { lang }),
});

describe('Chat', () => {
  it('passes axe with a labelled input and live log', async () => {
    const { container } = setup();
    expect(screen.getByLabelText('Your question')).toBeInTheDocument();
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
    await expectNoA11yViolations(container);
  });

  it('sends the question with AQI context and shows the answer', async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse({
        answer: 'Better at 2 pm, when AQI is lower.',
        safetyNote: 'Use an N95.',
        source: 'ai',
      }),
    );
    const { user } = setup();
    await user.type(
      screen.getByLabelText('Your question'),
      'Can my kid play outside at 5pm?{Enter}',
    );

    expect(await screen.findByText('Better at 2 pm, when AQI is lower.')).toBeInTheDocument();
    expect(screen.getByText('Use an N95.')).toBeInTheDocument();
    expect(
      within(screen.getByRole('log')).getByText('Can my kid play outside at 5pm?'),
    ).toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/chat');
    expect(JSON.parse(init.body)).toMatchObject({
      lat: 28.65,
      lon: 77.22,
      lang: 'en',
      question: 'Can my kid play outside at 5pm?',
      history: [],
    });
    expect(screen.getByLabelText('Your question')).toHaveValue('');
  });

  it('sends an example question with one click and includes history next time', async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse({ answer: 'Answer.', safetyNote: '', source: 'ai' }),
    );
    const { user } = setup();
    await user.click(
      screen.getByRole('button', { name: 'Where should I place the air purifier?' }),
    );
    await screen.findByText('Answer.');
    await user.type(screen.getByLabelText('Your question'), 'And at night?{Enter}');
    await screen.findAllByText('Answer.');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).history).toEqual([
      { role: 'user', text: 'Where should I place the air purifier?' },
      { role: 'assistant', text: 'Answer.' },
    ]);
  });

  it('labels fallback answers', async () => {
    mockFetch(() =>
      jsonResponse({ answer: 'General advice.', safetyNote: '', source: 'fallback' }),
    );
    const { user } = setup();
    await user.type(screen.getByLabelText('Your question'), 'Hello there{Enter}');
    expect(await screen.findByText(/ai temporarily unavailable/i)).toBeInTheDocument();
  });

  it('shows a network error', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    const { user } = setup();
    await user.type(screen.getByLabelText('Your question'), 'Is it safe?{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(/can't reach the server/i);
  });

  it('disables sending for empty questions', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled();
  });
});
