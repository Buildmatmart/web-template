const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getSdk } = require('../../api-util/sdk');
const { denormalisedResponseEntities } = require('../../api-util/data');
const log = require('../../log');

const RETURN_URL = process.env.REACT_APP_MARKETPLACE_ROOT_URL + '/p/pricing';

/**
 * Creates a Stripe Billing Portal session for the authenticated user.
 * Looks up the user's Stripe customerId from their metadata and creates
 * a session URL they can be redirected to in order to manage or cancel
 * their subscription.
 */
module.exports = async (req, res) => {
  const sdk = getSdk(req, res);

  let currentUser;
  try {
    const userRes = await sdk.currentUser.show();
    currentUser = denormalisedResponseEntities(userRes)[0];
  } catch (e) {
    return res
      .status(401)
      .json({ error: 'Not authenticated' })
      .end();
  }

  const customerId = currentUser?.attributes?.profile?.metadata?.customerId;
  if (!customerId) {
    return res
      .status(400)
      .json({ error: 'No Stripe customer found for this user' })
      .end();
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: RETURN_URL,
    });

    return res
      .status(200)
      .json({ url: session.url })
      .end();
  } catch (e) {
    log.error(e, 'create-billing-portal-session-failed');
    return res
      .status(500)
      .json({ error: e.message })
      .end();
  }
};
