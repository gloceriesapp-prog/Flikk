// react-native-razorpay ships no TypeScript types of its own (its package.json
// only declares a plain "main" JS entry) — this is the minimal real shape of
// what RazorpayCheckout.open() actually accepts/resolves with, per Razorpay's
// own documented Checkout options and success-callback payload
// (https://razorpay.com/docs/payments/payment-gateway/react-native-integration/).
declare module 'react-native-razorpay' {
  export interface RazorpayCheckoutOptions {
    key: string;
    amount: number; // paise
    currency: string;
    order_id: string;
    name: string;
    description?: string;
    image?: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    theme?: { color?: string };
  }

  export interface RazorpayCheckoutSuccess {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  export interface RazorpayCheckoutError {
    code: number;
    description: string;
  }

  const RazorpayCheckout: {
    open: (options: RazorpayCheckoutOptions) => Promise<RazorpayCheckoutSuccess>;
  };

  export default RazorpayCheckout;
}
