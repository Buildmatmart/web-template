const { transactionLineItems } = require('../api-util/lineItems');
const { getSdk, handleError, serialize, fetchCommission } = require('../api-util/sdk');
const { constructValidLineItems } = require('../api-util/lineItemHelpers');
const { denormalisedResponseEntities } = require('../api-util/data');
const { applyCommissionRate } = require('../api-util/commission');

module.exports = (req, res) => {
  const { isOwnListing, listingId, orderData } = req.body || {};

  const sdk = getSdk(req, res);

  const listingPromise = isOwnListing
    ? sdk.ownListings.show({ id: listingId, include: ['author'] })
    : sdk.listings.show({ id: listingId, include: ['author'] });

  Promise.all([listingPromise, fetchCommission(sdk)])
    .then(([showListingResponse, fetchAssetsResponse]) => {
      const listing = denormalisedResponseEntities(showListingResponse)[0];
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const authorAttributes = listing.author?.attributes || {};

      let { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      providerCommission = applyCommissionRate(providerCommission, authorAttributes);

      const lineItems = transactionLineItems(
        listing,
        orderData,
        providerCommission,
        customerCommission
      );

      // Because we are using returned lineItems directly in this template we need to use the helper function
      // to add some attributes like lineTotal and reversal that Marketplace API also adds to the response.
      const validLineItems = constructValidLineItems(lineItems);

      res
        .status(200)
        .set('Content-Type', 'application/transit+json')
        .send(serialize({ data: validLineItems }))
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
