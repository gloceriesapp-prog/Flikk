import express from 'express';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { zonesRouter } from './routes/zones.js';
import { storesRouter } from './routes/stores.js';
import { ordersRouter } from './routes/orders.js';
import { partnerRouter } from './routes/partner.js';
import { riderRouter } from './routes/rider.js';
import { adminRouter } from './routes/admin.js';
import { paymentsRouter } from './routes/payments.js';

const app = express();

// /payments/webhook needs the raw body for signature verification, so it's
// mounted before the generic json() parser with its own raw-capture.
app.use(
  '/payments/webhook',
  express.json({
    verify: (req, _res, buf) => {
      (req as unknown as { rawBody: string }).rawBody = buf.toString();
    },
  }),
);
app.use(express.json());

app.use('/auth', authRouter);
app.use('/zones', zonesRouter);
app.use('/stores', storesRouter);
app.use('/orders', ordersRouter);
app.use('/partner', partnerRouter);
app.use('/rider', riderRouter);
app.use('/admin', adminRouter);
app.use('/payments', paymentsRouter);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Flikk backend listening on :${env.port}`);
});
