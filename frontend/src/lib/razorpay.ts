export interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

type RazorpayWindow = Window & {
  Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
};

/** Brand colour for the Razorpay checkout sheet. */
export const RAZORPAY_THEME_COLOR = "#d97706";

/** Loads Razorpay Checkout once; resolves false when the script can't load. */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as RazorpayWindow).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/** Opens the checkout sheet. Call only after loadRazorpayScript() resolved true. */
export function openRazorpayCheckout(options: Record<string, unknown>) {
  const Razorpay = (window as RazorpayWindow).Razorpay;
  if (!Razorpay) throw new Error("Payment gateway not loaded");
  new Razorpay(options).open();
}
