const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = process.env;

const stripe = require('stripe')(STRIPE_SECRET_KEY);
const { updateUserProfile } = require('./helper');

const stripeWebhooks = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log('error', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const checkoutSessionCompleted = event.data.object;
      updateUserProfile(checkoutSessionCompleted, event.type);
      break;

    case 'customer.subscription.deleted':
      const subscriptionDeleted = event.data.object;
      updateUserProfile(subscriptionDeleted, event.type);
      break;

    case 'customer.subscription.updated':
      const subscriptionUpdated = event.data.object;
      updateUserProfile(subscriptionUpdated, event.type);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.status(200).send();
};

module.exports = stripeWebhooks;
