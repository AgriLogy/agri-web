export type Electrovanne = {
  id: number;
  vanneName: string;
  statusMode: 'manual' | 'auto';
  devEUI: string;
  isActivated: boolean;
};

export const electrovanneList: Electrovanne[] = [
  {
    id: 1,
    vanneName: 'Vanne générale',
    statusMode: 'manual',
    devEUI: '00124A0007B4F1A1',
    isActivated: false,
  },
  {
    id: 2,
    vanneName: 'Vanne zone 1',
    statusMode: 'auto',
    devEUI: '00124A0007B4F1B2',
    isActivated: true,
  },
  {
    id: 3,
    vanneName: 'Vanne zone 2',
    statusMode: 'manual',
    devEUI: '00124A0007B4F1C3',
    isActivated: false,
  },
  {
    id: 4,
    vanneName: 'Vanne zone 4',
    statusMode: 'auto',
    devEUI: '00124A0007B4F1D4',
    isActivated: true,
  },
];
