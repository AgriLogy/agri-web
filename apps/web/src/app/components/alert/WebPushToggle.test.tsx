import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';

const mockState = jest.fn();
const mockEnable = jest.fn();
const mockDisable = jest.fn();
jest.mock('@/app/lib/webPush', () => ({
  webPushState: () => mockState(),
  enableWebPush: () => mockEnable(),
  disableWebPush: () => mockDisable(),
}));

import WebPushToggle from './WebPushToggle';

const renderToggle = () =>
  render(
    <ChakraProvider>
      <WebPushToggle />
    </ChakraProvider>
  );

beforeEach(() => {
  mockState.mockReset();
  mockEnable.mockReset();
  mockDisable.mockReset();
});

it('renders nothing when Firebase is not configured', () => {
  mockState.mockReturnValue('unconfigured');
  const { container } = renderToggle();
  expect(screen.queryByTestId('web-push')).not.toBeInTheDocument();
  expect(container.textContent).toBe('');
});

it('enables push only from the button click, then offers to turn it off', async () => {
  mockState.mockReturnValue('off');
  mockEnable.mockResolvedValue('on');
  renderToggle();
  expect(mockEnable).not.toHaveBeenCalled(); // no prompt on page load
  fireEvent.click(screen.getByTestId('web-push-enable'));
  await waitFor(() =>
    expect(screen.getByTestId('web-push')).toHaveAttribute('data-state', 'on')
  );
  expect(screen.getByTestId('web-push-disable')).toBeInTheDocument();
});

it('explains a browser block without offering a button', () => {
  mockState.mockReturnValue('denied');
  renderToggle();
  expect(screen.getByText('hint_denied')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
