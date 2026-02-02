// FILE: apps/api/src/models/Commission.js
const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  type: { type: String, enum: ['vendor', 'affiliate'], required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'subjectModel' },
  subjectModel: { type: String, required: true, enum: ['Vendor', 'Affiliate'] },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderItemId: mongoose.Schema.Types.ObjectId,
  amount: { type: Number, required: true },
  percentage: Number,
  // TDS (Tax Deducted at Source) - applicable for affiliate payouts
  tds: {
    rate: { type: Number, default: 0 }, // TDS percentage (e.g. 2)
    amount: { type: Number, default: 0 }, // TDS amount deducted
    netAmount: { type: Number, default: 0 }, // Amount after TDS deduction
  },
  status: { type: String, enum: ['pending', 'approved', 'paid', 'cancelled'], default: 'pending' },
  approvedAt: Date,
  paidAt: Date,
  paymentRef: String,
  notes: String,
  // Razorpay Route/Transfer details
  transfer: {
    transferId: String, // Razorpay transfer ID (trf_XXXXX)
    status: { type: String, enum: ['created', 'pending', 'processed', 'reversed', 'failed'] },
    processedAt: Date,
    failureReason: String,
    linkedAccountId: String, // Razorpay linked account ID
    retryCount: { type: Number, default: 0 },
    lastRetryAt: Date,
  },
}, { timestamps: true });

commissionSchema.index({ subjectId: 1, type: 1 });
commissionSchema.index({ orderId: 1 });
commissionSchema.index({ status: 1 });
commissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Commission', commissionSchema);
