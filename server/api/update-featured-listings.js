const { denormalisedResponseEntities } = require('../api-util/data');
const { getSdk, handleError, getIntegrationSdk, serialize } = require('../api-util/sdk');

// Tier definitions — keep in sync with SubscriptionPage
const FEATURED_LIMITS = {
  search: { pro: 2, elite: 15, business: 30 },
  home:   { pro: 0, elite: 2,  business: 5  },
};

const LOCATION_CONFIG = {
  search: {
    countKey: 'searchFeaturedCount',
    scoreKey: 'searchFeaturedScore',
  },
  home: {
    countKey: 'homeFeaturedCount',
    scoreKey: 'homeFeaturedScore',
  },
};

const makeError = (message, status, data = {}) => {
  const error = new Error(message);
  error.status = status;
  error.statusText = message;
  error.data = data;
  return error;
};

module.exports = async (req, res) => {
  try {
    const { location, active, listingId } = req.body;

    if (!location || active === undefined || !listingId) {
      throw makeError('Missing required fields: location, active, listingId', 400, {
        location,
        active,
        listingId,
      });
    }

    const config = LOCATION_CONFIG[location];
    if (!config) {
      throw makeError('Invalid location value', 400, { location });
    }

    const sdk = getSdk(req, res);
    const iSdk = getIntegrationSdk();

    const userRes = await sdk.currentUser.show();
    const currentUser = denormalisedResponseEntities(userRes)[0];

    const { subscriptionPlan, ...userMeta } =
      currentUser?.attributes?.profile?.metadata || {};

    const { countKey, scoreKey } = config;
    const currentCount = userMeta[countKey] ?? 0;
    const limit = FEATURED_LIMITS[location][subscriptionPlan] || 0;

    if (active && currentCount >= limit) {
      throw makeError(`${location} featured listings limit reached`, 403, {
        subscriptionPlan,
        currentCount,
        limit,
      });
    }

    if (!active && currentCount === 0) {
      throw makeError('Cannot deactivate: no active featured listings', 403, {
        subscriptionPlan,
        currentCount,
      });
    }

    const newCount = active ? currentCount + 1 : currentCount - 1;
    const newScore = active ? 1 : 0;

    const [lisRes, updatedUserRes] = await Promise.all([
      iSdk.listings.update({ id: listingId, metadata: { [scoreKey]: newScore } }, { expand: true }),
      iSdk.users.updateProfile(
        { id: currentUser.id, metadata: { [countKey]: newCount } },
        { expand: true }
      ),
    ]);

    return res
      .status(200)
      .set('Content-Type', 'application/transit+json')
      .send(
        serialize({
          status: 200,
          statusText: 'OK',
          data: { success: true, user: updatedUserRes, listing: lisRes },
        })
      );
  } catch (e) {
    handleError(res, e);
  }
};

