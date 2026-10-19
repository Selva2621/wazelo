/**
 * Currencies Wazelo bills in (plans, coupons, credits, invoices). Razorpay takes
 * USD only with International Payments enabled, and then cards / PayPal only.
 */
export const BILLING_CURRENCIES = ['INR', 'USD'] as const;
export type BillingCurrency = (typeof BILLING_CURRENCIES)[number];

/** Indian orgs pay in rupees, everyone else in dollars */
export function billingCurrencyFor(country: string | null | undefined): BillingCurrency {
  return country?.toUpperCase() === 'IN' ? 'INR' : 'USD';
}
