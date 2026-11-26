/**
 * End-to-end UI flow with the API mocked at the fetch boundary.
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import {
  expectNoA11yViolations,
  jsonResponse,
  mockFetch,
  renderWithI18n,
  sampleAirQuality,
  samplePlanResponse,
} from './test/utils.jsx';

const DELHI = { name: 'Delhi', state: 'Delhi', country: 'IN', lat: 28.65, lon: 77.22 };

/** Default happy-path API. Override individual routes per test. */
const api = (overrides = {}) =>
  mockFetch((url, init) => {
    const routes = {
      '/api/geocode': () => jsonResponse({ results: [DELHI] }),
      '/api/air-quality': () => jsonResponse(sampleAirQuality()),
      '/api/plan': () => jsonResponse(samplePlanResponse()),
      '/api/chat': () => jsonResponse({ answer: 'ok', safetyNote: '', source: 'ai' }),
      ...overrides,
    };
    return routes[url.pathname](url, init);
  });

async function chooseDelhi(user) {
  await user.type(screen.getByLabelText('City name'), 'Delhi{Enter}');
  await user.click(await screen.findByRole('button', { name: 'Delhi, Delhi, IN' }));
}

describe('App', () => {
  it('has landmarks, a skip link and no axe violations on first load', async () => {
    api();
    const { container } = renderWithI18n(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /smogsense/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute(
      'href',
      '#main',
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toHaveTextContent(/not medical advice/i);
    await expectNoA11yViolations(container, { isolated: false });
  });

  it('runs the full flow: location → live AQI → AI plan → chat', async () => {
    const fetchMock = api();
    const user = userEvent.setup();
    const { container } = renderWithI18n(<App />);

    await chooseDelhi(user);
    expect(await screen.findByTestId('aqi-value')).toHaveTextContent('346');
    expect(
      screen.getByRole('alert', { name: /urgent: air quality is very poor/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByLabelText('Children'));
    await user.click(screen.getByRole('button', { name: /generate my ai plan/i }));

    const planHeading = await screen.findByRole('heading', { name: /your personalised plan/i });
    await screen.findByText('Very poor air today — keep outdoor time short.');
    await waitFor(() => expect(planHeading).toHaveFocus());

    const planCall = fetchMock.mock.calls.find(([u]) => u === '/api/plan');
    const body = JSON.parse(planCall[1].body);
    expect(body).toMatchObject({
      lat: 28.65,
      lon: 77.22,
      lang: 'en',
      locationName: 'Delhi, Delhi, IN',
    });
    expect(body.profile.household.children).toBe(true);
    expect(typeof body.timeZone).toBe('string');

    // Lazy-loaded chat appears once a location is chosen.
    expect(
      await screen.findByRole('heading', { name: /ask a follow-up question/i }),
    ).toBeInTheDocument();
    await expectNoA11yViolations(container, { isolated: false });
  });

  it('shows a clear message when live AQI is unavailable', async () => {
    api({
      '/api/air-quality': () =>
        jsonResponse(
          {
            error: {
              code: 'UPSTREAM_UNAVAILABLE',
              message: 'Live air quality data is temporarily unavailable.',
            },
          },
          503,
        ),
    });
    const user = userEvent.setup();
    renderWithI18n(<App />);
    await chooseDelhi(user);
    expect(
      await screen.findByText('Live air quality data is temporarily unavailable.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('asks for a location before generating a plan and focuses the city input', async () => {
    const fetchMock = api();
    const user = userEvent.setup();
    renderWithI18n(<App />);
    await user.click(screen.getByRole('button', { name: /generate my ai plan/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/choose a location first/i);
    expect(screen.getByLabelText('City name')).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows plan errors (e.g. rate limiting)', async () => {
    api({
      '/api/plan': () =>
        jsonResponse(
          { error: { code: 'RATE_LIMITED', message: 'You have reached the AI request limit.' } },
          429,
        ),
    });
    const user = userEvent.setup();
    renderWithI18n(<App />);
    await chooseDelhi(user);
    await user.click(screen.getByRole('button', { name: /generate my ai plan/i }));
    expect(await screen.findByText('You have reached the AI request limit.')).toBeInTheDocument();
  });

  it('switches the interface and <html lang> to Hindi', async () => {
    api();
    const user = userEvent.setup();
    renderWithI18n(<App />);
    await user.click(screen.getByRole('button', { name: 'हिन्दी' }));
    expect(screen.getByRole('button', { name: 'हिन्दी' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.lang).toBe('hi');
    expect(screen.getByLabelText('शहर का नाम')).toBeInTheDocument();
    expect(window.localStorage.getItem('smogsense.lang')).toBe('hi');
  });

  it('remembers the household profile in this browser', async () => {
    api();
    const user = userEvent.setup();
    const { unmount } = renderWithI18n(<App />);
    await chooseDelhi(user);
    await user.click(screen.getByLabelText('Indoor plants'));
    await user.click(screen.getByRole('button', { name: /generate my ai plan/i }));
    await screen.findByText('Very poor air today — keep outdoor time short.');
    unmount();
    renderWithI18n(<App />);
    expect(screen.getByLabelText('Indoor plants')).toBeChecked();
  });
});
