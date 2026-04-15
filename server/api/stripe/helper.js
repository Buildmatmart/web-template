const { denormalisedResponseEntities } = require('../../api-util/data');
const { getIntegrationSdk } = require('../../api-util/sdk');

const {
  STRIPE_PRO_PAYMENT_LINK_ID,
  STRIPE_ELITE_PAYMENT_LINK_ID,
  STRIPE_BUSINESS_PAYMENT_LINK_ID,
} = process.env;

const planLinkMap = {
  [STRIPE_PRO_PAYMENT_LINK_ID]: 'pro',
  [STRIPE_ELITE_PAYMENT_LINK_ID]: 'elite',
  [STRIPE_BUSINESS_PAYMENT_LINK_ID]: 'business',
};

const updateAdditionalQuota = async (data, iSdk) => {
  try {
    const { metadata, client_reference_id, created, id } = data;

    if (['search-featured', 'home-featured'].includes(metadata?.quotaType)) {
      const userRes = await iSdk.users.show({
        id: client_reference_id,
      });

      const user = denormalisedResponseEntities(userRes)[0];
      const { searchFeaturedQuota = [], homeFeaturedQuota = [] } = user.attributes.profile.metadata;

      const quotaKey =
        metadata.quotaType === 'search-featured' ? 'searchFeaturedQuota' : 'homeFeaturedQuota';
      const currentQuota =
        metadata.quotaType === 'search-featured' ? searchFeaturedQuota : homeFeaturedQuota;

      await iSdk.users.updateProfile({
        id: user.id,
        metadata: {
          [quotaKey]: [...currentQuota, { id, created, status: 'active' }],
        },
      });
    } else {
      console.log('Unknown quota type for additional quota update', metadata?.quotaType);
    }
  } catch (error) {}
};

const updateUserProfile = async (data, eventType) => {
  try {
    const iSdk = getIntegrationSdk();
    const { client_reference_id } = data;

    if (eventType === 'checkout.session.completed') {
      const { mode, created, subscription, customer, payment_link } = data;

      if (!client_reference_id) {
        console.log('client_reference_id missing in checkout session completed');
        return;
      }

      if (mode !== 'subscription') {
        updateAdditionalQuota(data, iSdk);
        return;
      }

      const userRes = await iSdk.users.show({
        id: client_reference_id,
      });

      const user = denormalisedResponseEntities(userRes)[0];
      const { subscriptionData = [] } = user.attributes.profile.privateData;

      await iSdk.users.updateProfile({
        id: user.id,
        protectedData: {
          subscriptionData: [...subscriptionData, { subscriptionId: subscription, created }],
        },
        metadata: {
          isSubscriptionActive: true,
          customerId: customer,
          subscriptionPlan: planLinkMap[payment_link],
        },
      });
    } else if (eventType === 'customer.subscription.deleted') {
      const { customer } = data;

      const userRes = await iSdk.users.query({
        meta_customerId: customer,
      });

      const user = denormalisedResponseEntities(userRes)[0];

      await iSdk.users.updateProfile({
        id: user.id,
        metadata: {
          isSubscriptionActive: false,
          subscriptionPlan: null,
        },
      });
    } else if (eventType === 'customer.subscription.updated') {
      const { customer, plan, previous_attributes, status, items } = data;

      // Ignore trial -> active transitions
      if (previous_attributes?.status === 'trialing' && status === 'active') {
        console.log('Ignoring trial -> active transition');
        return;
      }

      const newPlanName = plan?.lookup_key || items?.data?.[0]?.price?.lookup_key;

      if (!newPlanName) {
        console.log('No lookup_key found on plan');
        return;
      }

      const userRes = await iSdk.users.query({
        meta_customerId: customer,
      });

      const user = denormalisedResponseEntities(userRes)[0];

      await iSdk.users.updateProfile({
        id: user.id,
        metadata: {
          subscriptionPlan: newPlanName,
        },
      });
    }
  } catch (error) {
    console.log('Failed to update creator profile', error);
  }
};

module.exports = {
  updateUserProfile,
};
