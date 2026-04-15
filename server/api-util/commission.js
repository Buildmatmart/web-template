/**
 * Commission rates by subscription plan.
 * Rates are percentages: { launch: % for first 3 months, afterLaunch: % thereafter }
 */
const PLAN_COMMISSION_RATES = {
  pro: { launch: 0, afterLaunch: 4 },
  elite: { launch: 0, afterLaunch: 4 },
  business: { launch: 0, afterLaunch: 2.5 },
};

const isWithinLaunchPeriod = createdAt => {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return new Date(createdAt) > threeMonthsAgo;
};

/**
 * Resolve the author's attributes from either a denormalised listing (which
 * includes the author relationship) or a raw SDK currentUser response.
 */
const getAuthorAttributes = (listing, currentUserResponse) => {
  if (listing?.author?.attributes) {
    return listing.author.attributes;
  }
  // currentUserResponse is the raw SDK response from sdk.currentUser.show()
  if (currentUserResponse?.data?.data?.attributes) {
    return currentUserResponse.data.data.attributes;
  }
  return {};
};

/**
 * Compute the provider commission percentage for a transaction.
 *
 * @param {Object} authorAttributes - The author's `attributes` object (from listing.author or currentUser)
 * @returns {number} commission percentage
 */
const resolveCommissionPercentage = authorAttributes => {
  const createdAt = authorAttributes?.createdAt;
  const subscriptionPlan = authorAttributes?.profile?.metadata?.subscriptionPlan || null;

  const inLaunch = createdAt ? isWithinLaunchPeriod(createdAt) : true;
  const planRates = PLAN_COMMISSION_RATES[subscriptionPlan];

  if (planRates) {
    return planRates[inLaunch ? 'launch' : 'afterLaunch'];
  }

  // No plan: 2% during launch, 4% after
  return inLaunch ? 2 : 4;
};

/**
 * Apply the computed commission rate to the providerCommission asset data,
 * overriding only the percentage.
 *
 * @param {Object|undefined} providerCommission - From the commission asset
 * @param {Object} authorAttributes
 * @returns {Object} providerCommission with overridden percentage
 */
const applyCommissionRate = (providerCommission, authorAttributes) => {
  const percentage = resolveCommissionPercentage(authorAttributes);
  return { ...providerCommission, percentage };
};

module.exports = { getAuthorAttributes, resolveCommissionPercentage, applyCommissionRate };
