/**
 * KML import flow against a faked `farmMapApi.importKml`: dry run → preview
 * (sectors + skipped reasons) → confirm (real run) → onImported.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import KmlImportModal from './KmlImportModal';

const mockImportKml = jest.fn();
jest.mock('@agri/api-client/farmMapApi', () => ({
  farmMapApi: {
    importKml: (...a: unknown[]) => mockImportKml(...a),
  },
}));

const preview = {
  dry_run: true,
  sectors: [
    {
      name: 'Bloc A',
      area_ha: 2.1,
      perimeter_m: 640,
      geometry: null,
      id: null,
    },
  ],
  skipped: [{ name: 'Point 1', reason: 'not_a_polygon' }],
};

const setup = () => {
  const onImported = jest.fn();
  const onClose = jest.fn();
  render(
    <ChakraProvider>
      <KmlImportModal isOpen onClose={onClose} onImported={onImported} />
    </ChakraProvider>
  );
  const input = screen.getByTestId('kml-file-input') as HTMLInputElement;
  const pick = (f: File) => fireEvent.change(input, { target: { files: [f] } });
  return { onImported, onClose, pick };
};

beforeEach(() => mockImportKml.mockReset());

it('previews with dry_run=true, then confirms with dry_run=false', async () => {
  mockImportKml.mockResolvedValueOnce(preview).mockResolvedValueOnce({
    ...preview,
    dry_run: false,
    sectors: [{ ...preview.sectors[0], id: 41 }],
  });
  const { onImported, onClose, pick } = setup();
  const file = new File(['<kml/>'], 'farm.kml');
  pick(file);
  expect(await screen.findByText('Bloc A')).toBeInTheDocument();
  expect(mockImportKml).toHaveBeenCalledWith(file, true);
  expect(screen.getByText('2.10 ha')).toBeInTheDocument();
  expect(
    screen.getByText(/misc\.map\.kml\.reason\.not_a_polygon/)
  ).toBeInTheDocument();

  fireEvent.click(screen.getByText(/misc\.map\.kml\.confirm/));
  await waitFor(() => expect(onImported).toHaveBeenCalledWith([41], 1));
  expect(mockImportKml).toHaveBeenLastCalledWith(file, false);
  expect(onClose).toHaveBeenCalled();
});

it('rejects a wrong extension without calling the API', () => {
  const { pick } = setup();
  pick(new File(['{}'], 'farm.geojson'));
  expect(
    screen.getByText('misc.map.kml.fileProblem.bad_extension')
  ).toBeInTheDocument();
  expect(mockImportKml).not.toHaveBeenCalled();
});

it('shows the server detail for an unreadable file', async () => {
  mockImportKml.mockRejectedValue({
    response: { status: 400, data: { detail: 'Not a KML document' } },
  });
  const { pick } = setup();
  pick(new File(['x'], 'farm.kmz'));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Not a KML document'
  );
});
