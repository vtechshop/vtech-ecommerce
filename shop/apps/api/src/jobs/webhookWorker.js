// FILE: apps/api/src/jobs/webhookWorker.js
const os = require('os');
const WebhookEvent = require('../models/WebhookEvent');
const Order = require('../models/Order');
const logger = require('../config/logger');

// Unique ID for this process instance — used in optimistic lock checks
const WORKER_ID = `${os.hostname()}-${process.pid}`;

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 5;
const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

// Exponential backoff delays indexed by attemptCount (0-based after first attempt)
// [immediate, 1min, 5min, 30min, 2hr]
const BACKOFF_MS = [0, 60_000, 300_000, 1_800_000, 7_200_000];

function backoffDelay(attemptCount) {
  return BACKOFF_MS[Math.min(attemptCount, BACKOFF_MS.length - 1)];
}

/**
 * Reset webhook events that have been stuck in 'processing' for longer than
 * STALE_THRESHOLD_MS. Handles crashes and multi-instance takeover scenarios.
 * Also resets stale notification claims on Order documents.
 */
async function recoverStalledEvents() {
  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);

  const result = await WebhookEvent.updateMany(
    { status: 'processing', claimedAt: { $lt: staleThreshold } },
    { $set: { status: 'pending', nextRetryAt: new Date() } }
  );
  if (result.modifiedCount > 0) {
    logger.warn(`[WebhookWorker] Recovered ${result.modifiedCount} stalled webhook event(s)`);
  }

  // Reset stale notification claims so they can be retried
  for (const field of ['notifications.customerEmail', 'notifications.adminNotification']) {
    const notifResult = await Order.updateMany(
      { [`${field}.status`]: 'claimed', [`${field}.claimedAt`]: { $lt: staleThreshold } },
      { $set: { [`${field}.status`]: 'pending', [`${field}.nextRetryAt`]: new Date() } }
    );
    if (notifResult.modifiedCount > 0) {
      logger.warn(`[WebhookWorker] Recovered ${notifResult.modifiedCount} stalled ${field} claim(s)`);
    }
  }
}

/**
 * Atomically claim the next pending webhook event ready for processing.
 * Returns null when the queue is empty.
 */
async function claimNextEvent() {
  const now = new Date();
  return WebhookEvent.findOneAndUpdate(
    {
      status: 'pending',
      $or: [
        { nextRetryAt: null },
        { nextRetryAt: { $lte: now } },
      ],
    },
    {
      $set: { status: 'processing', claimedAt: now, claimedBy: WORKER_ID },
      $inc: { attemptCount: 1 },
    },
    { new: true, sort: { createdAt: 1 } }
  );
}

/**
 * Dispatch a webhook event to the appropriate handler.
 * Handlers imported lazily to avoid circular-dependency issues at startup.
 */
async function processEvent(event) {
  const { processWebhookPaymentCaptured, processWebhookPaymentFailed } = require('../controllers/razorpayController');

  switch (event.event) {
    case 'payment.captured':
      await processWebhookPaymentCaptured(event.payload);
      break;
    case 'payment.failed':
      await processWebhookPaymentFailed(event.payload);
      break;
    default:
      logger.info(`[WebhookWorker] Unhandled event type skipped: ${event.event} (${event.eventId})`);
  }
}

/**
 * Mark an event as completed using an optimistic lock.
 * If another instance re-claimed this event after a stall recovery, the update
 * will find no matching document and the current result is safely discarded.
 */
async function markCompleted(eventId, claimedAt) {
  const result = await WebhookEvent.findOneAndUpdate(
    { _id: eventId, status: 'processing', claimedAt },
    { $set: { status: 'completed', completedAt: new Date() } }
  );
  if (!result) {
    logger.warn(`[WebhookWorker] Event ${eventId} completion skipped — already re-claimed by another instance`);
  }
}

/**
 * Mark an event as failed (or dead if max attempts reached) using an optimistic lock.
 */
async function markFailed(eventId, claimedAt, error, attemptCount) {
  const isDead = attemptCount >= MAX_ATTEMPTS;
  const delay = backoffDelay(attemptCount);

  await WebhookEvent.findOneAndUpdate(
    { _id: eventId, status: 'processing', claimedAt },
    {
      $set: {
        status: isDead ? 'dead' : 'pending',
        lastError: error?.message?.slice(0, 500) || String(error),
        nextRetryAt: isDead ? null : new Date(Date.now() + delay),
      },
    }
  );

  if (isDead) {
    logger.error(`[WebhookWorker] Event ${eventId} is dead after ${attemptCount} attempt(s): ${error?.message}`);
  } else {
    logger.warn(`[WebhookWorker] Event ${eventId} failed (attempt ${attemptCount}/${MAX_ATTEMPTS}), retry in ${delay / 1000}s: ${error?.message}`);
  }
}

/**
 * Run one worker tick: stall recovery + process up to BATCH_SIZE events.
 * Called every 30 seconds by the server.js cron schedule.
 */
async function runOneTick() {
  try {
    await recoverStalledEvents();

    for (let i = 0; i < BATCH_SIZE; i++) {
      const event = await claimNextEvent();
      if (!event) break; // Queue empty

      try {
        await processEvent(event);
        await markCompleted(event._id, event.claimedAt);
        logger.info(`[WebhookWorker] Completed: ${event.event} (${event.eventId})`);
      } catch (err) {
        logger.error(`[WebhookWorker] Error processing ${event.eventId}: ${err.message}`);
        await markFailed(event._id, event.claimedAt, err, event.attemptCount);
      }
    }
  } catch (err) {
    logger.error('[WebhookWorker] Tick error:', err);
  }
}

module.exports = { runOneTick };
