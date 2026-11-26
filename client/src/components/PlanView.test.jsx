import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../api/client.js';
import { PlanView } from './PlanView.jsx';
import { expectNoA11yViolations, renderWithI18n, samplePlanResponse } from '../test/utils.jsx';

const success = (overrides) => ({
  status: 'success',
  data: { ...samplePlanResponse(overrides), lang: 'en' },
});
const noop = () => {};

describe('PlanView', () => {
  it('renders nothing before a plan is requested', () => {
    const { container } = renderWithI18n(
      <PlanView state={{ status: 'idle' }} onRetry={noop} onRegenerate={noop} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a loading skeleton and live message', async () => {
    const { container } = renderWithI18n(
      <PlanView state={{ status: 'loading' }} onRetry={noop} onRegenerate={noop} />,
    );
    expect(screen.getByText(/gemini is preparing your plan/i)).toBeInTheDocument();
    expect(screen.getByTestId('plan-skeleton')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('renders all three sections as cards with an impact for every suggestion', async () => {
    const { container } = renderWithI18n(
      <PlanView state={success()} onRetry={noop} onRegenerate={noop} />,
    );

    for (const name of [
      /low-emission daily routine/i,
      /indoor air quality hacks/i,
      /sustainable alternatives/i,
    ]) {
      const section = screen.getByRole('region', { name });
      expect(within(section).getAllByRole('article')).toHaveLength(2);
    }
    const articles = screen.getAllByRole('article');
    for (const article of articles) {
      expect(within(article).getByText('Impact:')).toBeInTheDocument();
      expect(within(article).getByText('Estimate:')).toBeInTheDocument();
    }
    expect(screen.getAllByText('Cuts emissions')).toHaveLength(2);
    expect(screen.getByText('Lowers exposure & cuts emissions')).toBeInTheDocument();
    expect(screen.getByText(/personalised by google gemini/i)).toBeInTheDocument();
    expect(screen.getByText('Keep your child indoors this evening.')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('renders model text as plain text, never as HTML', () => {
    const data = samplePlanResponse();
    data.plan.summary = '<img src=x onerror="alert(1)">Hello';
    renderWithI18n(
      <PlanView
        state={{ status: 'success', data: { ...data, lang: 'en' } }}
        onRetry={noop}
        onRegenerate={noop}
      />,
    );
    expect(screen.getByText('<img src=x onerror="alert(1)">Hello')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });

  it('labels fallback guidance and missing AQI', () => {
    renderWithI18n(
      <PlanView
        state={success({ source: 'fallback', airQualityAvailable: false })}
        onRetry={noop}
        onRegenerate={noop}
      />,
    );
    expect(screen.getByText(/basic guidance — ai is temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/live air quality was unavailable/i)).toBeInTheDocument();
  });

  it('offers to regenerate when the language changed', async () => {
    const onRegenerate = vi.fn();
    renderWithI18n(<PlanView state={success()} onRetry={noop} onRegenerate={onRegenerate} />, {
      lang: 'hi',
    });
    await userEvent.click(screen.getByRole('button', { name: 'हिन्दी में फिर से बनाएँ' }));
    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  it('shows errors with retry', async () => {
    const onRetry = vi.fn();
    renderWithI18n(
      <PlanView
        state={{ status: 'error', error: new ApiError('Too many requests.') }}
        onRetry={onRetry}
        onRegenerate={noop}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Too many requests.');
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
