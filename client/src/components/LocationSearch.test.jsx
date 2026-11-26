import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocationSearch } from './LocationSearch.jsx';
import { LanguageToggle } from './LanguageToggle.jsx';
import { expectNoA11yViolations, jsonResponse, mockFetch, renderWithI18n } from '../test/utils.jsx';

const DELHI = { name: 'Delhi', state: 'Delhi', country: 'IN', lat: 28.65, lon: 77.22 };

const setup = () => {
  const onSelect = vi.fn();
  const utils = renderWithI18n(<LocationSearch onSelect={onSelect} />);
  return { onSelect, user: userEvent.setup(), ...utils };
};

describe('LocationSearch', () => {
  it('passes axe and has a labelled search input', async () => {
    const { container } = setup();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByLabelText('City name')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('debounces typing into a single search request', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ results: [DELHI] }));
    const { user } = setup();
    await user.type(screen.getByLabelText('City name'), 'Delhi');
    expect(await screen.findByRole('button', { name: 'Delhi, Delhi, IN' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/geocode?q=Delhi');
    expect(screen.getByRole('status')).toHaveTextContent('1 places found');
  });

  it('selects a result', async () => {
    mockFetch(() => jsonResponse({ results: [DELHI] }));
    const { user, onSelect } = setup();
    await user.type(screen.getByLabelText('City name'), 'Del{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Delhi, Delhi, IN' }));
    expect(onSelect).toHaveBeenCalledWith({ name: 'Delhi, Delhi, IN', lat: 28.65, lon: 77.22 });
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing air quality for Delhi, Delhi, IN',
    );
  });

  it('does not re-run the search when the language changes', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ results: [DELHI] }));
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderWithI18n(
      <>
        <LanguageToggle />
        <LocationSearch onSelect={onSelect} />
      </>,
    );
    await user.type(screen.getByLabelText('City name'), 'Delhi');
    await user.click(await screen.findByRole('button', { name: 'Delhi, Delhi, IN' }));
    await user.click(screen.getByRole('button', { name: 'हिन्दी' }));
    await new Promise((r) => setTimeout(r, 500));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Delhi, Delhi, IN' })).not.toBeInTheDocument();
    // The status message is re-translated, not left in English.
    expect(screen.getByRole('status')).toHaveTextContent('Delhi, Delhi, IN की वायु गुणवत्ता');
  });

  it('reports no results', async () => {
    mockFetch(() => jsonResponse({ results: [] }));
    const { user } = setup();
    await user.type(screen.getByLabelText('City name'), 'Xyzzy{Enter}');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/no places found/i));
  });

  it('validates the minimum length on submit', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('City name'), 'a{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 2 characters/i);
    expect(screen.getByLabelText('City name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows server errors', async () => {
    mockFetch(() =>
      jsonResponse({ error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Service down.' } }, 503),
    );
    const { user } = setup();
    await user.type(screen.getByLabelText('City name'), 'Delhi{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Service down.');
  });

  it('uses browser geolocation when permitted', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (ok) => ok({ coords: { latitude: 19.07, longitude: 72.88 } }),
      },
    });
    const { user, onSelect } = setup();
    await user.click(screen.getByRole('button', { name: /use my location/i }));
    expect(onSelect).toHaveBeenCalledWith({ name: '', lat: 19.07, lon: 72.88 });
  });

  it('explains when location permission is denied', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { getCurrentPosition: (_ok, fail) => fail({ code: 1 }) },
    });
    const { user, onSelect } = setup();
    await user.click(screen.getByRole('button', { name: /use my location/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/permission was denied/i);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('handles browsers without geolocation', async () => {
    const { geolocation: _omit, ...rest } = navigator;
    vi.stubGlobal('navigator', { ...rest, language: 'en' });
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /use my location/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/cannot share location/i);
  });
});
