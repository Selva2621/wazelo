"use client";

import { useState } from "react";
import { useCreateOrder, useVerifyPayment } from "@/hooks/use-billing";
import { useAuthStore } from "@/stores/auth-store";
import { loadRazorpayScript, openRazorpayCheckout, RAZORPAY_THEME_COLOR, type RazorpayResponse } from "@/lib/razorpay";

export function checkoutErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: unknown } }; message?: string };
  const msg = e?.response?.data?.message ?? e?.message;
  return typeof msg === "string" && msg ? msg : fallback;
}

/**
 * Razorpay checkout for one plan: create order → widget → verify. The backend decides
 * what the payment does (new plan, plan change, or renewing the current plan).
 * Plans are never charged automatically, so "Renew now" / "Pay now" use this too.
 */
export function usePlanCheckout() {
  const user = useAuthStore((s) => s.user);
  const createOrder = useCreateOrder();
  const verifyPayment = useVerifyPayment();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pay = async (planId: string, description = "Subscribe to") => {
    setError(null);
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      setError("Payments aren't set up yet. Contact support.");
      return;
    }
    setPendingId(planId);
    if (!(await loadRazorpayScript())) {
      setError("Couldn't load the payment gateway. Check your connection.");
      setPendingId(null);
      return;
    }
    createOrder.mutate(planId, {
      onSuccess: (order) => {
        openRazorpayCheckout({
          key,
          amount: order.amount,
          currency: order.currency,
          name: "Wazelo CRM",
          description: `${description} ${order.planName}`,
          order_id: order.orderId,
          prefill: { name: user ? `${user.firstName} ${user.lastName}` : "", email: user?.email ?? "" },
          theme: { color: RAZORPAY_THEME_COLOR },
          handler: (res: RazorpayResponse) => {
            verifyPayment.mutate(
              {
                planId,
                orderId: res.razorpay_order_id,
                razorpayPaymentId: res.razorpay_payment_id,
                signature: res.razorpay_signature,
                idempotencyKey: `billing-${user?.orgId ?? ""}-${planId}-${Date.now()}`,
              },
              {
                onError: (err) =>
                  setError(checkoutErrorMessage(err, "Payment received but not confirmed yet. Refresh in a minute.")),
                onSettled: () => setPendingId(null),
              },
            );
          },
          modal: { ondismiss: () => setPendingId(null) },
        });
      },
      onError: (err) => {
        setError(checkoutErrorMessage(err, "Couldn't start the payment."));
        setPendingId(null);
      },
    });
  };

  return {
    pay,
    pendingId,
    error,
    setError,
    setPendingId,
    busy: createOrder.isPending || verifyPayment.isPending || pendingId !== null,
  };
}
