/**
 * Calculates the driving distance between two coordinates via the Mapbox Directions API
 * and checks whether the buyer's location is within the seller's delivery radius.
 *
 * POST body: { buyerLat, buyerLng, sellerLat, sellerLng, deliveryRadiusKm }
 * Response:  { distanceKm, withinRadius }
 */
module.exports = (req, res) => {
  const { buyerLat, buyerLng, sellerLat, sellerLng, deliveryRadiusKm } = req.body || {};

  if (
    buyerLat == null ||
    buyerLng == null ||
    sellerLat == null ||
    sellerLng == null ||
    deliveryRadiusKm == null
  ) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  const accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({ error: 'Mapbox access token is not configured.' });
  }

  const coordinates = `${sellerLng},${sellerLat};${buyerLng},${buyerLat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?overview=false&access_token=${encodeURIComponent(
    accessToken
  )}`;

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Mapbox API responded with status ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        return res
          .status(422)
          .json({ error: 'Could not calculate a route between these locations.' });
      }

      const distanceMeters = data.routes[0].distance;
      const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
      const withinRadius = distanceKm <= Number(deliveryRadiusKm);

      return res.status(200).json({ distanceKm, withinRadius });
    })
    .catch(e => {
      console.error('check-delivery-radius: Mapbox API error', e);
      return res.status(500).json({ error: 'Failed to calculate distance.' });
    });
};
