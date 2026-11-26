// Dev only: the payment wait screen with sample values and no payment, for
// UI work. Registered under __DEV__ in AppNavigator.
import { useEffect, useState } from 'react';
import { PaymentProcessingView } from './PaymentProcessingScreen';

export function PaymentProcessingPreviewScreen() {
  const [secondsLeft, setSecondsLeft] = useState(300);
  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 300)), 1000);
    return () => clearInterval(timer);
  }, []);
  return <PaymentProcessingView secondsLeft={secondsLeft} launchError="" amount={190.01} appName="Google Pay" onNotCompleted={() => {}} />;
}
