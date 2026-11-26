import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PROFILE } from '@smogsense/shared';
import { ProfileForm } from './ProfileForm.jsx';
import { expectNoA11yViolations, renderWithI18n } from '../test/utils.jsx';

const setup = (props = {}) => {
  const onSubmit = vi.fn();
  const utils = renderWithI18n(<ProfileForm onSubmit={onSubmit} hasLocation {...props} />);
  return { onSubmit, ...utils };
};

describe('ProfileForm', () => {
  it('labels every control and passes axe', async () => {
    const { container } = setup();
    for (const label of [
      'Children',
      'Older adults (60+)',
      'Someone with asthma or lung disease',
      'Someone with a heart condition',
      'Main way you travel',
      'Cooking fuel',
      'Winter heating',
      'Air purifier at home',
      'Indoor plants',
      'Work or study from home',
      /anything else/i,
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('group', { name: /who lives in your home/i })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('submits the selected profile', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.click(screen.getByLabelText('Children'));
    await user.click(screen.getByLabelText('Someone with asthma or lung disease'));
    await user.selectOptions(screen.getByLabelText('Main way you travel'), 'car');
    await user.selectOptions(screen.getByLabelText('Cooking fuel'), 'biomass');
    await user.selectOptions(screen.getByLabelText('Winter heating'), 'wood_coal');
    await user.click(screen.getByLabelText('Air purifier at home'));
    await user.type(screen.getByLabelText(/anything else/i), '  Ground floor flat  ');
    await user.click(screen.getByRole('button', { name: /generate my ai plan/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      ...DEFAULT_PROFILE,
      household: { ...DEFAULT_PROFILE.household, children: true, respiratory: true },
      commute: 'car',
      cookingFuel: 'biomass',
      heating: 'wood_coal',
      hasAirPurifier: true,
      notes: 'Ground floor flat',
    });
  });

  it('is fully keyboard operable', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.tab();
    expect(screen.getByLabelText('Children')).toHaveFocus();
    await user.keyboard(' ');
    expect(screen.getByLabelText('Children')).toBeChecked();
    screen.getByRole('button', { name: /generate my ai plan/i }).focus();
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('shows remaining characters and enforces the limit', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByText('300 characters left')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/anything else/i), 'abc');
    expect(screen.getByText('297 characters left')).toBeInTheDocument();
    expect(screen.getByLabelText(/anything else/i)).toHaveAttribute('maxLength', '300');
  });

  it('shows a busy state while generating', () => {
    setup({ busy: true });
    expect(screen.getByRole('button', { name: /generating your plan/i })).toBeDisabled();
  });

  it('explains that a location is needed', () => {
    setup({ hasLocation: false });
    expect(screen.getByRole('button', { name: /generate/i })).toHaveAccessibleDescription(
      /choose a location first/i,
    );
  });

  it('restores a saved profile', () => {
    setup({ initialProfile: { ...DEFAULT_PROFILE, hasPlants: true, commute: 'cycle' } });
    expect(screen.getByLabelText('Indoor plants')).toBeChecked();
    expect(screen.getByLabelText('Main way you travel')).toHaveValue('cycle');
  });
});
