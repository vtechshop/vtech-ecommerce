// FILE: apps/api/src/jobs/crmOutboxWorker.js
const os = require('os');
const CrmOutbox = require('../models/CrmOutbox');
const crmEventService = require('../services/crmEventService');
const logger = require('../config/logger');

// Delivers order events to the WhatsApp CRM. Same claim / backoff / stall-recovery pattern as
// jobs/webhookWorker.js. Runs only when CRM events are enabled.

const WORKER_ID = `${os.hostname()}-${process.pid}`;

const MAX_ATTEMPTS = 6;
const BATCH_SIZE = 10;
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

// Delay before the next attempt, indexed by attempts already made: 1min, 5min, 30min, 2hr, 6hr
const BACKOFF_MS = [60_000, 300_000, 1_800_000, 7_200_000, 21_600_000];

function backoffDelay(attemptCount) {
  return BACKOFF_MS[Math.min(Math.max(attemptCount - 1, 0), BACKOFF_MS.length - 1)];
}

async function recoverStalled() {
  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);
  const result = await CrmOutbox.updateMany(
    { status: 'processing', claimedAt: { $lt: staleThreshold } },
    { $set: { status: 'pending', nextRetryAt: new Date() } }
  );
  if (result.modifiedCount > 0) {
    logger.warn(`[CrmOutbox] Recovered ${result.modifiedCount} stalled event(s)`);
  }
}

async function claimNext() {
  const now = new Date();
  return CrmOutbox.findOneAndUpdate(
    {
      status: 'pending',
      $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
    },
    {
      $set: { status: 'processing', claimedAt: now, claimedBy: WORKER_ID },
      $inc: { attemptCount: 1 },
    },
    { new: true, sort: { createdAt: 1 } }
  );
}

/**
 * Run one worker tick. `httpClient` is injectable for tests.
 */
async function runOneTick(httpClient) {
  if (!crmEventService.isEnabled()) return { skipped: true };
  const summary = { sent: 0, retried: 0, dead: 0 };
  try {
    await recoverStalled();

    for (let i = 0; i < BATCH_SIZE; i++) {
      const event = await claimNext();
      if (!event) break;

      const result = await crmEventService.deliver(event, httpClient);
      const lock = { _id: event._id, status: 'processing', claimedAt: event.claimedAt };

      if (result.ok) {
        // Delivered rows are removed by the TTL index on sentAt
        await CrmOutbox.findOneAndUpdate(lock, { $set: { status: 'sent', sentAt: new Date(), lastError: null } });
        summary.sent++;
        continue;
      }

      const isDead = !result.retry || event.attemptCount >= MAX_ATTEMPTS;
      await CrmOutbox.findOneAndUpdate(lock, {
        $set: {
          status: isDead ? 'dead' : 'pending',
          lastError: String(result.error).slice(0, 300),
          nextRetryAt: isDead ? null : new Date(Date.now() + backoffDelay(event.attemptCount)),
        },
      });
      if (isDead) {
        summary.dead++;
        // Event id only: the payload holds a customer's name and phone number
        logger.error(`[CrmOutbox] Event ${event.eventId} gave up after ${event.attemptCount} attempt(s): ${result.error}`);
      } else {
        summary.retried++;
        logger.warn(`[CrmOutbox] Event ${event.eventId} not delivered (attempt ${event.attemptCount}/${MAX_ATTEMPTS}): ${result.error}`);
        // The CRM is down or refusing: leave the rest of the queue for the next tick
        break;
      }
    }
  } catch (err) {
    logger.error(`[CrmOutbox] Tick error: ${err.message}`);
  }
  return summary;
}

module.exports = { runOneTick, backoffDelay, MAX_ATTEMPTS };
