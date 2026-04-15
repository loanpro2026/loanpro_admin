import { Db } from 'mongodb';

export type PaidPlanName = 'Basic' | 'Pro' | 'Enterprise';

export const DEFAULT_PLAN_PRICING: Record<PaidPlanName, number> = {
  Basic: 599,
  Pro: 899,
  Enterprise: 1399,
};

export async function getPlanPricing(db: Db): Promise<Record<PaidPlanName, number>> {
  const pricingDoc = await db.collection('pricing_config').findOne({ configName: 'current_pricing' });

  return {
    Basic:
      typeof pricingDoc?.prices?.Basic === 'number' && pricingDoc.prices.Basic > 0
        ? pricingDoc.prices.Basic
        : DEFAULT_PLAN_PRICING.Basic,
    Pro:
      typeof pricingDoc?.prices?.Pro === 'number' && pricingDoc.prices.Pro > 0
        ? pricingDoc.prices.Pro
        : DEFAULT_PLAN_PRICING.Pro,
    Enterprise:
      typeof pricingDoc?.prices?.Enterprise === 'number' && pricingDoc.prices.Enterprise > 0
        ? pricingDoc.prices.Enterprise
        : DEFAULT_PLAN_PRICING.Enterprise,
  };
}
