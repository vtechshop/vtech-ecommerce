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

  // South India: Karnataka, Kerala, Puducherry, Maharashtra, AP, Telangana, Goa, DNH&DD
  'kerala':                   'south',
  'karnataka':                'south',
  'andhra pradesh':           'south',
  'telangana':                'south',
  'puducherry':               'south',
  'pondicherry':              'south',
  'maharashtra':              'south',
  'goa':                      'south',
  'dadra and nagar haveli':           'south',
  'dadra & nagar haveli':             'south',
  'daman and diu':                    'south',
  'daman & diu':                      'south',
  'dadra and nagar haveli and daman and diu': 'south',
  'dadra & nagar haveli and daman & diu':     'south',

  // North India: Bihar, Jharkhand, WB, Chandigarh, Punjab, Haryana, Delhi, Rajasthan,
  //              Gujarat, UP, MP, Chhattisgarh, Odisha
  'delhi':                    'north',
  'new delhi':                'north',
  'uttar pradesh':            'north',
  'up':                       'north',
  'punjab':                   'north',
  'haryana':                  'north',
  'rajasthan':                'north',
  'chandigarh':               'north',
  'gujarat':                  'north',
  'madhya pradesh':           'north',
  'mp':                       'north',
  'chhattisgarh':             'north',
  'west bengal':              'north',
  'wb':                       'north',
  'bihar':                    'north',
  'jharkhand':                'north',
  'odisha':                   'north',
  'orissa':                   'north',

  // West India: J&K, Uttarakhand, Himachal Pradesh, Ladakh
  'jammu and kashmir':        'west',
  'jammu & kashmir':          'west',
  'j&k':                      'west',
  'ladakh':                   'west',
  'uttarakhand':              'west',
  'uttaranchal':              'west',
  'himachal pradesh':         'west',
  'hp':                       'west',

  // East India: Sikkim, Meghalaya, Assam, Arunachal Pradesh, Nagaland, Manipur, Tripura, Mizoram
  'assam':                    'east',
  'meghalaya':                'east',
  'manipur':                  'east',
  'mizoram':                  'east',
  'nagaland':                 'east',
  'tripura':                  'east',
  'arunachal pradesh':        'east',
  'sikkim':                   'east',

  // Island territories
  'andaman and nicobar':          'east',
  'andaman & nicobar':            'east',
  'andaman and nicobar islands':  'east',
  'lakshadweep':                  'south',
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
