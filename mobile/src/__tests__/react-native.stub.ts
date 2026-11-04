// Stand-in for react-native in the vitest journey tests (see vitest.config.ts).
// react-native's own entry file is Flow, which Node cannot parse, and the
// journeys only touch the mock services, so a web-like platform is enough.
export const Platform = {
  OS: 'web' as const,
  select: <T,>(options: { web?: T; default?: T; [os: string]: T | undefined }) => options.web ?? options.default,
};

export const Alert = { alert: () => {} };
