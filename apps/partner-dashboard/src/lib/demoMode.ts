// Demo data is a local design aid only. While the dashboard is being designed
// it is always ON in local dev (`next dev`) and never on in a production
// build: a real store must never see orders, sales or payouts it does not
// have. Pages only use it while their real data is empty.
// To remove: set this back to
//   process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_DATA === 'true'
export const DEMO_DATA_ENABLED = process.env.NODE_ENV !== 'production';
