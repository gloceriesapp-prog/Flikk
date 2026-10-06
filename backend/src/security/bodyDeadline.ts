import type { RequestHandler } from 'express';
// Absolute body deadline, independent of an attacker sending occasional bytes.
export const uploadBodyDeadline: RequestHandler = (req, res, next) => {
  const timer = setTimeout(() => {
    if (!res.writableEnded && !res.destroyed) {
      res.status(408).json({error:{code:'UPLOAD_TIMEOUT',message:'Upload took too long. Please retry.'}});
      req.destroy();
    }
  }, 20000);
  timer.unref();
  const clear = () => clearTimeout(timer);
  req.once('end', clear); res.once('finish', clear); res.once('close', clear);
  next();
};
