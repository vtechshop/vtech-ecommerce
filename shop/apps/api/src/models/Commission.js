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
  status: { type: String, enum: ['pending', 'approved', 'paid', 'cancelled'], default: 'pending' },
  approvedAt: Date,
  paidAt: Date,
  paymentRef: String,
  notes: String,
}, { timestamps: true });

commissionSchema.index({ subjectId: 1, type: 1 });
commissionSchema.index({ orderId: 1 });
commissionSchema.index({ status: 1 });
commissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Commission', commissionSchema);
