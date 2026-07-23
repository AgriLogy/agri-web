// Jest mock for `next-intl`.
//
// next-intl ships as ESM that jest's babel transform can't parse (it lives
// under node_modules and is not transformed). Components only need the hooks
// to exist and return sensible stand-ins, so we map `next-intl` to this file
// via moduleNameMapper in jest.config.js. Translation lookups echo their key
// (plus any interpolation values) so assertions can match on the key.
const React = require('react');

function makeTranslator() {
  const t = (key, values) => {
    if (values && typeof values === 'object' && Object.keys(values).length) {
      return `${key} ${JSON.stringify(values)}`;
    }
    return key;
  };
  t.rich = (key) => key;
  t.markup = (key) => key;
  t.raw = (key) => key;
  t.has = () => true;
  return t;
}

const useTranslations = () => makeTranslator();
const getTranslations = async () => makeTranslator();
const useLocale = () => 'fr';
const useTimeZone = () => 'UTC';
const useNow = () => new Date(0);
const useMessages = () => ({});
const useFormatter = () => ({
  dateTime: (v) => String(v),
  number: (v) => String(v),
  relativeTime: (v) => String(v),
  list: (v) => Array.from(v).join(', '),
});
const NextIntlClientProvider = ({ children }) =>
  React.createElement(React.Fragment, null, children);

module.exports = {
  __esModule: true,
  useTranslations,
  getTranslations,
  useLocale,
  useTimeZone,
  useNow,
  useMessages,
  useFormatter,
  NextIntlClientProvider,
};
