// Zone-based shipping utility for India
// Five zones: Tamil Nadu (local), South, North, East, West
// At checkout: state → zone → highest product zone charge across cart

const ZONES = ['tamilnadu', 'south', 'north', 'east', 'west'];

const ZONE_LABELS = {
  tamilnadu: 'Tamil Nadu',
  south:     'South India',
  north:     'North India',
  east:      'East India',
  west:      'West India',
};

// State → zone mapping (lowercase for comparison)
const STATE_TO_ZONE = {
  // Tamil Nadu (separate zone)
  'tamil nadu':               'tamilnadu',
  'tamilnadu':                'tamilnadu',
  'tn':                       'tamilnadu',

  // South (Kerala, Karnataka, AP, Telangana, Puducherry)
  'kerala':                   'south',
  'karnataka':                'south',
  'andhra pradesh':           'south',
  'telangana':                'south',
  'puducherry':               'south',
  'pondicherry':              'south',
  'andaman and nicobar':      'south',
  'andaman & nicobar':        'south',
  'andaman and nicobar islands': 'south',
  'lakshadweep':              'south',

  // North
  'delhi':                    'north',
  'new delhi':                'north',
  'uttar pradesh':            'north',
  'up':                       'north',
  'punjab':                   'north',
  'haryana':                  'north',
  'rajasthan':                'north',
  'himachal pradesh':         'north',
  'hp':                       'north',
  'jammu and kashmir':        'north',
  'jammu & kashmir':          'north',
  'j&k':                      'north',
  'ladakh':                   'north',
  'uttarakhand':              'north',
  'uttaranchal':              'north',
  'chandigarh':               'north',

  // East
  'west bengal':              'east',
  'wb':                       'east',
  'bihar':                    'east',
  'jharkhand':                'east',
  'odisha':                   'east',
  'orissa':                   'east',
  'assam':                    'east',
  'meghalaya':                'east',
  'manipur':                  'east',
  'mizoram':                  'east',
  'nagaland':                 'east',
  'tripura':                  'east',
  'arunachal pradesh':        'east',
  'sikkim':                   'east',

  // West
  'maharashtra':              'west',
  'gujarat':                  'west',
  'goa':                      'west',
  'madhya pradesh':           'west',
  'mp':                       'west',
  'chhattisgarh':             'west',
  'daman and diu':            'west',
  'daman & diu':              'west',
  'dadra and nagar haveli':   'west',
  'dadra & nagar haveli':     'west',
  'dadra and nagar haveli and daman and diu': 'west',
};

/**
 * Get zone for a given state name string.
 * Defaults to 'north' if not found (safe fallback).
 */
function getZoneForState(stateName = '') {
  const key = stateName.trim().toLowerCase();
  return STATE_TO_ZONE[key] || 'north';
}

/**
 * Given an array of product documents (with shippingZones populated)
 * and a destination state name, return the highest zone charge.
 *
 * Returns: { zone: 'tamilnadu'|'south'|'north'|'east'|'west', charge: Number|null }
 * charge is null if no product has shippingZones configured.
 */
function getZoneShippingCharge(products, stateName) {
  const zone = getZoneForState(stateName);
  let maxCharge = null;

  for (const product of products) {
    if (!product.shippingZones || product.shippingZones.length === 0) continue;
    const entry = product.shippingZones.find(z => z.zone === zone);
    if (entry && entry.charge != null) {
      if (maxCharge === null || entry.charge > maxCharge) {
        maxCharge = entry.charge;
      }
    }
  }

  return { zone, charge: maxCharge };
}

module.exports = { ZONES, ZONE_LABELS, getZoneForState, getZoneShippingCharge };
