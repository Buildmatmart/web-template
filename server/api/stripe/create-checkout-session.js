const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const ROOT_URL = process.env.REACT_APP_MARKETPLACE_ROOT_URL;

const PRICE_CURRENCY = 'aud';

// Pricing config keyed by type — amount in cents
const CHECKOUT_TYPES = {
  'search-featured': {
    amount: 1900,
    name: 'Featured - 14 Days',
    description: 'Appear in featured listings at the top of search results.',
  },
  'home-featured': {
    amount: 3900,
    name: 'Homepage - 14 Days',
    description: 'Appear in top featured listings on the homepage.',
  },
};

/**
 * POST /api/create-checkout-session
 *
 * Body params:
 *   type      {string} – required ('search-featured' | 'home-featured')
 */
module.exports = async (req, res) => {
  const { type } = req.body || {};
  const { tokenUserId: userId, email } = req || {};

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const priceConfig = CHECKOUT_TYPES[type];
  if (!priceConfig) {
    return res
      .status(400)
      .json({ error: `Invalid type. Must be one of: ${Object.keys(CHECKOUT_TYPES).join(', ')}` });
  }

  const successUrl = `${ROOT_URL}/listings?status=success`;
  const cancelUrl = `${ROOT_URL}/listings?status=fail`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: PRICE_CURRENCY,
            unit_amount: priceConfig.amount,
            product_data: {
              name: priceConfig.name,
              description: priceConfig.description,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      customer_email: email,
      metadata: {
        type,
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('Stripe checkout session error:', e.message);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
