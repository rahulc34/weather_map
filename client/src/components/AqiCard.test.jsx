import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../api/client.js';
import { AqiCard } from './AqiCard.jsx';
import { UrgentAlert } from './UrgentAlert.jsx';
import { expectNoA11yViolations, renderWithI18n, sampleAirQuality } from '../test/utils.jsx';

describe('AqiCard', () => {
  it('prompts for a location when idle', () => {
    renderWithI18n(<AqiCard state={{ status: 'idle' }} onRetry={() => {}} />);
    expect(screen.getByText(/search for a city/i)).toBeInTheDocument();
  });

  it('shows a skeleton and announces loading', async () => {
    const { container } = renderWithI18n(
      <AqiCard state={{ status: 'loading' }} onRetry={() => {}} />,
    );
    expect(screen.getByTestId('aqi-skeleton')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(/loading live air quality/i);
    expect(screen.getByRole('region', { name: /air quality now/i })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    await expectNoA11yViolations(container);
  });

  it('renders AQI with a text category label (not colour alone) and health message', async () => {
    const { container } = renderWithI18n(
      <AqiCard state={{ status: 'success', data: sampleAirQuality() }} onRetry={() => {}} />,
    );
    expect(screen.getByTestId('aqi-value')).toHaveTextContent('346');
    const badge = screen.getByText('Very poor', { selector: '.aqi-badge' });
    expect(badge).toHaveClass('aqi-badge--very_poor');
    expect(screen.getByText(/unhealthy for everyone/i)).toBeInTheDocument();
    expect(screen.getByText('New Delhi, Delhi, IN')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('lists every pollutant with an expanded name', () => {
    renderWithI18n(
      <AqiCard state={{ status: 'success', data: sampleAirQuality() }} onRetry={() => {}} />,
    );
    for (const name of [
      'Fine particles',
      'Coarse particles',
      'Nitrogen dioxide',
      'Ozone',
      'Carbon monoxide',
    ]) {
      expect(screen.getByTitle(name)).toBeInTheDocument();
    }
    expect(screen.getByText('180')).toBeInTheDocument();
  });

  it('shows the cleanest and most polluted forecast windows', () => {
    renderWithI18n(
      <AqiCard state={{ status: 'success', data: sampleAirQuality() }} onRetry={() => {}} />,
    );
    expect(screen.getByText(/cleanest time to be outside/i)).toBeInTheDocument();
    expect(screen.getByText(/AQI ~70/)).toBeInTheDocument();
    expect(screen.getByText(/AQI ~380/)).toBeInTheDocument();
  });

  it('handles a missing forecast', () => {
    const data = { ...sampleAirQuality(), forecast: null };
    renderWithI18n(<AqiCard state={{ status: 'success', data }} onRetry={() => {}} />);
    expect(screen.getByText(/forecast is unavailable/i)).toBeInTheDocument();
  });

  it('shows an error with a working retry button', async () => {
    const onRetry = vi.fn();
    renderWithI18n(
      <AqiCard
        state={{ status: 'error', error: new ApiError('Data unavailable.') }}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Data unavailable.');
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders in Hindi', () => {
    renderWithI18n(
      <AqiCard state={{ status: 'success', data: sampleAirQuality() }} onRetry={() => {}} />,
      {
        lang: 'hi',
      },
    );
    expect(screen.getByText('बहुत खराब', { selector: '.aqi-badge' })).toBeInTheDocument();
  });
});

describe('UrgentAlert', () => {
  it('alerts for very poor / severe air', async () => {
    const { container } = renderWithI18n(<UrgentAlert category={{ key: 'severe', level: 6 }} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/urgent: air quality is severe/i);
    expect(screen.getByText(/see a doctor/i)).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('renders nothing for moderate air', () => {
    const { container } = renderWithI18n(<UrgentAlert category={{ key: 'moderate', level: 3 }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
