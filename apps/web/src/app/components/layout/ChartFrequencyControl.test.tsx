/**
 * The frequency select must show the real state: `native` (every reading)
 * used to fall back to "minute" because it has no regular menu entry.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';

jest.mock('next-intl', () => {
  const catalogue = jest.requireActual(
    '../../../../../../packages/i18n/src/messages/fr.json'
  );
  const t = (key: string) =>
    key
      .split('.')
      .reduce<unknown>(
        (node, part) =>
          node && typeof node === 'object'
            ? (node as Record<string, unknown>)[part]
            : undefined,
        catalogue
      ) ?? key;
  return { __esModule: true, useTranslations: () => t, useLocale: () => 'fr' };
});

import { ChartFrequencyControl } from './ChartFrequencyControl';
import Loading from '../common/Loading';
import type { ChartFrequency } from '@/app/utils/chartDateWindow';

function renderControl(value: ChartFrequency, onChange = jest.fn()) {
  render(
    <ChakraProvider>
      <ChartFrequencyControl value={value} onChange={onChange} />
    </ChakraProvider>
  );
  return onChange;
}

it('shows "every reading" for the native frequency', () => {
  renderControl({ kind: 'native' });
  const select = screen.getByRole('combobox') as HTMLSelectElement;
  expect(select.value).toBe('native');
  expect(select.selectedOptions[0]).toHaveTextContent('Toutes les mesures');
});

it('has no "every reading" entry once a frequency is chosen', () => {
  renderControl({ kind: 'hour' });
  const select = screen.getByRole('combobox') as HTMLSelectElement;
  expect(select.value).toBe('hour');
  expect(
    screen.queryByRole('option', { name: 'Toutes les mesures' })
  ).not.toBeInTheDocument();
});

it('switches from native to a regular frequency', () => {
  const onChange = renderControl({ kind: 'native' });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'day' } });
  expect(onChange).toHaveBeenCalledWith({ kind: 'day' });
});

it('labels the loading spinner in the app language', () => {
  render(
    <ChakraProvider>
      <Loading />
    </ChakraProvider>
  );
  expect(screen.getByText('Chargement…')).toBeInTheDocument();
});
