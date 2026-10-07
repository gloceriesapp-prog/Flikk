// Demo data is a local design aid only. It is opt-in (NEXT_PUBLIC_DEMO_DATA=
// true) and never on in a production build: a real store must never see
// orders, sales or payouts it does not have.
export const DEMO_DATA_ENABLED =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_DATA === 'true';
