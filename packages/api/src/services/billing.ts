/**
 * Payment provider integration (Korea: PortOne / Toss), env-gated like every
 * other external dependency. With a PG secret it returns a hosted checkout URL
 * (the client redirects; the provider webhook confirms → plan activates). With
 * no key it "activates" immediately so the whole upgrade flow is testable in dev.
 */
export interface CheckoutResult {
  /** activated = plan applied now (dev); checkout = redirect the user to pay */
  mode: "activated" | "checkout";
  checkoutUrl?: string;
  ref: string;
  provider: string;
  simulated: boolean;
}

export interface BillingService {
  isReal: boolean;
  provider: string;
  startCheckout(input: {
    userId: string;
    planSlug: string;
    priceKrw: number;
  }): Promise<CheckoutResult>;
}

export function getBillingService(): BillingService {
  const portone = process.env.PORTONE_API_SECRET;
  const toss = process.env.TOSS_SECRET_KEY;

  if (portone || toss) {
    const provider = portone ? "portone" : "toss";
    return {
      isReal: true,
      provider,
      async startCheckout({ planSlug, priceKrw }) {
        // Integration point: create a payment with the PG and hand back its hosted
        // checkout URL. `BILLING_CHECKOUT_URL` lets you point at the real page;
        // the provider webhook (/api/webhooks/billing) confirms + activates.
        const ref = `${provider}_${planSlug}_${priceKrw}`;
        const base = process.env.BILLING_CHECKOUT_URL;
        const checkoutUrl = base
          ? `${base}?plan=${encodeURIComponent(planSlug)}&amount=${priceKrw}&ref=${encodeURIComponent(ref)}`
          : `/settings/confirm?plan=${encodeURIComponent(planSlug)}&ref=${encodeURIComponent(ref)}`;
        return { mode: "checkout", checkoutUrl, ref, provider, simulated: false };
      },
    };
  }

  // Dev fallback — no PG account yet: apply the plan immediately.
  return {
    isReal: false,
    provider: "dev",
    async startCheckout({ planSlug }) {
      return {
        mode: "activated",
        ref: `dev_${planSlug}`,
        provider: "dev",
        simulated: true,
      };
    },
  };
}
