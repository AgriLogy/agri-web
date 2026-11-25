import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Box } from '@chakra-ui/react';
import { expect, userEvent, within } from 'storybook/test';
import AlertForm, { type AlertFormProps } from './AlertForm';
import {
  ALERT_FORM_DEFAULTS,
  validateAlertForm,
  type AlertFormErrors,
  type AlertFormValues,
} from './useAlertForm';
import { demoZones } from '@/stories/mocks/api';

const SENSOR_KEYS = [
  { key: 'temperature_weather', label: "Température de l'air", unit: '°C' },
  { key: 'humidity_weather', label: "Humidité de l'air", unit: '%' },
  { key: 'soil_moisture_medium', label: 'Humidité du sol (30 cm)', unit: '%' },
  { key: 'wind_speed', label: 'Vitesse du vent', unit: 'm/s' },
  { key: 'water_flow', label: 'Débit', unit: 'm³/h' },
];

const NOTIFICATION_ZONES = [
  { id: 11, name: 'Bloc serres — Nord' },
  { id: 12, name: 'Verger agrumes' },
];

/** An existing alert as the edit drawer pre-fills it. */
const EDIT_VALUES: AlertFormValues = {
  ...ALERT_FORM_DEFAULTS,
  name: 'Sol trop sec — Zone A1',
  type: 'Humidity',
  description:
    "Prévenir le chef d'équipe si la sonde de 30 cm passe sous 22 % : lancer une irrigation de rattrapage.",
  sensor_key: 'soil_moisture_medium',
  zone: 1,
  condition: '<',
  condition_nbr: 22,
  notify_email: true,
  notify_whatsapp: true,
  override_phone: '',
  override_email: 'chef.equipe@example.invalid',
};

/**
 * Keeps the form's values in local state, the way AlertCreateDrawer does
 * with useAlertForm, so the story can be typed into.
 */
function Controlled(props: AlertFormProps) {
  const [values, setValues] = useState(props.values);
  const [errors, setErrors] = useState<AlertFormErrors>(props.errors);
  return (
    <AlertForm
      {...props}
      values={values}
      errors={errors}
      onChange={(key, value) => {
        setValues((v) => ({ ...v, [key]: value }));
        setErrors((e) => {
          const next = { ...e };
          delete next[key];
          return next;
        });
      }}
    />
  );
}

/**
 * The alert form (name, category, sensor, zone, condition + threshold,
 * channels, contact overrides, active switch) inside the create/edit drawer
 * on `/alerts` and under each chart's "last data" card. Controlled: values
 * and errors come from `useAlertForm`; the drawer, not this form, calls
 * `POST/PATCH /alerts`.
 */
const meta = {
  title: 'Alertes/AlertForm',
  component: AlertForm,
  render: (args) => <Controlled {...args} />,
  decorators: [
    (Story) => (
      <Box maxW="460px">
        <Story />
      </Box>
    ),
  ],
  args: {
    values: ALERT_FORM_DEFAULTS,
    errors: {},
    onChange: () => undefined,
    sensorKeys: SENSOR_KEYS,
    zones: demoZones,
    notificationZones: NOTIFICATION_ZONES,
    defaultContact: { email: 'demo@example.invalid' },
  },
} satisfies Meta<typeof AlertForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Create mode: defaults (air temperature above 30 °C, email on). */
export const Create: Story = {};

/** Edit mode: an existing soil-moisture alert with WhatsApp and overrides. */
export const Edit: Story = {
  args: { values: EDIT_VALUES },
};

/** Saving with no name and no threshold: both fields turn red. */
export const ValidationErrors: Story = {
  args: {
    values: { ...ALERT_FORM_DEFAULTS, condition_nbr: '' },
    errors: validateAlertForm({ ...ALERT_FORM_DEFAULTS, condition_nbr: '' }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('alert-name-input')).toBeInvalid();
    // Typing a name clears its error.
    await userEvent.type(
      canvas.getByTestId('alert-name-input'),
      'Vent fort — serres'
    );
    await expect(canvas.getByTestId('alert-name-input')).toBeValid();
  },
};

/** No sensor list from the API and no zones: falls back to the built-in list. */
export const MinimalNoZones: Story = {
  args: {
    sensorKeys: [],
    zones: [],
    notificationZones: [],
    defaultContact: undefined,
  },
};
