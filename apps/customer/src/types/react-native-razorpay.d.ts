// The official native wrapper is JavaScript-only. Keep the minimal API used
// by this app typed locally; validate the untrusted callback at runtime.
declare module 'react-native-razorpay' {
  const RazorpayCheckout: {
    open(options: {
      key: string; order_id: string; amount: number; currency: string; name: string;
      description?: string; prefill?: { contact?: string; email?: string; name?: string; method?: string };
      theme?: { color: string }; timeout?: number; modal?: { confirm_close?: boolean };
    }): Promise<unknown>;
  };
  export default RazorpayCheckout;
}
