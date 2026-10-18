// Demo data is a local design aid only. While the dashboard is being designed
// it is ON by default in local dev (opt out with NEXT_PUBLIC_DEMO_DATA=false)
// and never on in a production build: a real store must never see orders,
// sales or payouts it does not have. Pages only use it while their real data
// is empty. To remove: flip this back to `=== 'true'`.
export const DEMO_DATA_ENABLED =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_DATA !== 'false';
