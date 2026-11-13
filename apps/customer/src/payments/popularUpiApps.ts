import type { UpiApp } from './upiApps';
const CUSTOMER_UPI_CHOICES = new Set(['gpay', 'phonepe', 'paytm']);
// Discovery and server validation still decide availability; never invent an
// installed app or a gateway identifier for presentation.
export const popularUpiApps = (apps: UpiApp[]) => apps.filter(app => CUSTOMER_UPI_CHOICES.has(app.id));
