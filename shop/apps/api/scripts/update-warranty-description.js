/**
 * One-time script: update warranty description for all products that have a warranty.
 * Preserves existing duration/durationType. Products with no warranty are untouched.
 * Run: node scripts/update-warranty-description.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

function buildDescription(duration, durationType) {
  let period;
  if (durationType === 'lifetime') {
    period = 'lifetime';
    return `This machine is covered by a lifetime warranty against manufacturing defects only. The warranty does not cover normal wear and tear, accidental damage, misuse, improper handling, or unauthorized modifications. For warranty service, the machine must be sent to our VTECH store in Coimbatore at the customer's own cost. Transport charges are not covered under warranty. Service will be provided only after the machine is received at our store.`;
  } else if (durationType === 'years') {
    period = `${duration}-year`;
  } else {
    // months
    period = `${duration}-month`;
  }
  return `This machine is covered by a ${period} warranty against manufacturing defects only. The warranty does not cover normal wear and tear, accidental damage, misuse, improper handling, or unauthorized modifications. For warranty service, the machine must be sent to our VTECH store in Coimbatore at the customer's own cost. Transport charges are not covered under warranty. Service will be provided only after the machine is received at our store.`;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const col = mongoose.connection.db.collection('products');

  const products = await col
    .find({ hasWarranty: true }, { projection: { title: 1, warranty: 1 } })
    .toArray();

  console.log(`\nFound ${products.length} products with warranty\n`);

  let updated = 0;
  for (const p of products) {
    const dur = p.warranty?.duration;
    const type = p.warranty?.durationType || 'months';

    if (!dur && type !== 'lifetime') {
      console.log(`  SKIP (no duration): ${p.title}`);
      continue;
    }

    const newDesc = buildDescription(dur, type);
    await col.updateOne(
      { _id: p._id },
      { $set: { 'warranty.description': newDesc } }
    );
    console.log(`  ✓ Updated: ${p.title} [${dur} ${type}]`);
    updated++;
  }

  console.log(`\nDone. Updated ${updated} / ${products.length} products.`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
