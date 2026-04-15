const express = require('express');
const stripeWebhooks = require('./stripe-webhooks');
const createBillingPortalSession = require('./create-billing-portal-session');

const stripeRouter = express.Router();

stripeRouter.post('/webhooks', express.raw({ type: 'application/json' }), stripeWebhooks);
stripeRouter.get('/create-billing-portal-session', createBillingPortalSession);

module.exports = stripeRouter;
