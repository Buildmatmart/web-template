const express = require('express');
const middleware = require('../../middleware');
const stripeWebhooks = require('./stripe-webhooks');
const createBillingPortalSession = require('./create-billing-portal-session');
const createCheckoutSession = require('./create-checkout-session');

const stripeRouter = express.Router();

stripeRouter.post('/webhooks', express.raw({ type: 'application/json' }), stripeWebhooks);
stripeRouter.get('/create-billing-portal-session', createBillingPortalSession);
stripeRouter.post('/create-checkout-session', middleware.auth, createCheckoutSession);

module.exports = stripeRouter;
