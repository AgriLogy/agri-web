/**
 * Shape history against faked `mockGeometryHistory` / `mockRestoreGeometry`: list
 * newest first, restore only after confirmation, then hand the updated sector
 * back to the map.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import SectorGeometryHistory from './SectorGeometryHistory';

const mockGeometryHistory = jest.fn();
const mockRestoreGeometry = jest.fn();
jest.mock('@agri/api-client/farmMapApi', () => ({
  farmMapApi: {
    geometryHistory: (...a: unknown[]) => mockGeometryHistory(...a),
    restoreGeometry: (...a: unknown[]) => mockRestoreGeometry(...a),
  },
}));

const poly = { type: 'Polygon', coordinates: [] };

it('lists revisions and restores one after confirming', async () => {
  mockGeometryHistory.mockResolvedValue([
    {
      id: 11,
      created_at: '2026-11-01T08:00:00Z',
      source: 'kml',
      area_ha: 1.2,
      perimeter_m: 400,
      geometry: poly,
    },
    {
      id: 12,
      created_at: '2026-11-20T09:12:00Z',
      source: 'draw',
      area_ha: 1.42,
      perimeter_m: 512,
      geometry: poly,
    },
  ]);
  const restored = { id: 3, name: 'Nord', zone_count: 1, geometry: poly };
  mockRestoreGeometry.mockResolvedValue(restored);
  const onRestored = jest.fn();
  render(
    <ChakraProvider>
      <SectorGeometryHistory sectorId={3} onRestored={onRestored} />
    </ChakraProvider>
  );
  expect(mockGeometryHistory).not.toHaveBeenCalled(); // collapsed: no request
  fireEvent.click(screen.getByText('misc.map.shapeHistory.title'));
  expect(
    await screen.findByText('misc.map.shapeHistory.current')
  ).toBeInTheDocument();
  expect(mockGeometryHistory).toHaveBeenCalledWith(3);
  expect(
    screen.getByText(/misc\.map\.shapeHistory\.source\.kml/)
  ).toBeInTheDocument();

  // Only the older revision is restorable; nothing happens before confirming.
  const restoreButtons = screen.getAllByText('misc.map.shapeHistory.restore');
  expect(restoreButtons).toHaveLength(1);
  fireEvent.click(restoreButtons[0]!);
  expect(mockRestoreGeometry).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByText('misc.map.shapeHistory.confirm'));
  await waitFor(() => expect(onRestored).toHaveBeenCalledWith(restored));
  expect(mockRestoreGeometry).toHaveBeenCalledWith(3, 11);
});
