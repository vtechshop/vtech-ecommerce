// FILE: apps/api/src/services/invoiceService.js
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');

const LOGO_PATH = path.resolve(__dirname, '../assets/logo.png');

// Default platform seller details
const PLATFORM_SELLER = {
  name: 'Vtech',
  tradeName: 'Vtech',
  addressLine1: '9/83E, 4th Street Extension',
  addressLine2: 'T Balan Nagar, Ganapathy Pudur',
  city: 'Coimbatore',
  state: 'Tamil Nadu',
  pincode: '641006',
  stateCode: '33',
  phone: env.SUPPORT_PHONE || '+91 9944556683',
  email: env.SUPPORT_EMAIL || 'vtechshop.customercare@gmail.com',
  website: 'www.vtechkitchen.com',
  gstin: '33AARFV8415B1Z4',
  pan: 'AARFV8415B',
};

/**
 * Build seller details from a vendor profile (for vendor orders).
 * Falls back to PLATFORM_SELLER for any missing critical fields.
 */
function buildSellerFromVendor(vendor) {
  if (!vendor) return PLATFORM_SELLER;

  const gstin = vendor.kyc?.taxId || '';
  const gstStateCode = gstin.length >= 2 ? gstin.substring(0, 2) : '';
  const hasValidGstin = gstin.length === 15;
  const hasAddress = !!(vendor.kyc?.businessAddress);

  // If vendor has no proper GSTIN and no address, use platform seller entirely
  if (!hasValidGstin && !hasAddress) return PLATFORM_SELLER;

  return {
    name: vendor.kyc?.businessName || vendor.storeName || PLATFORM_SELLER.name,
    tradeName: vendor.storeName || vendor.kyc?.businessName || PLATFORM_SELLER.tradeName,
    addressLine1: vendor.kyc?.businessAddress || PLATFORM_SELLER.addressLine1,
    addressLine2: hasAddress ? '' : PLATFORM_SELLER.addressLine2,
    city: vendor.kyc?.city || (hasAddress ? '' : PLATFORM_SELLER.city),
    state: vendor.kyc?.state || (hasAddress ? '' : PLATFORM_SELLER.state),
    pincode: vendor.kyc?.pincode || (hasAddress ? '' : PLATFORM_SELLER.pincode),
    stateCode: gstStateCode || PLATFORM_SELLER.stateCode,
    phone: vendor.kyc?.phoneNumber || PLATFORM_SELLER.phone,
    email: vendor.userId?.email || PLATFORM_SELLER.email,
    website: PLATFORM_SELLER.website,
    gstin: hasValidGstin ? gstin : PLATFORM_SELLER.gstin,
    pan: vendor.panNumber || (hasValidGstin ? gstin.substring(2, 12) : PLATFORM_SELLER.pan),
  };
}

function formatINR(amount) {
  const num = Number(amount) || 0;
  return 'Rs.' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function titleCase(str) {
  if (!str) return 'N/A';
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function numberToWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertChunk(n % 100) : '');
  }

  const amount = Math.abs(Math.round(num * 100));
  const rupees = Math.floor(amount / 100);
  const paise = amount % 100;

  let result = '';
  if (rupees >= 10000000) {
    result += convertChunk(Math.floor(rupees / 10000000)) + ' Crore ';
    const rem = rupees % 10000000;
    if (rem >= 100000) result += convertChunk(Math.floor(rem / 100000)) + ' Lakh ';
    const rem2 = rem % 100000;
    if (rem2 >= 1000) result += convertChunk(Math.floor(rem2 / 1000)) + ' Thousand ';
    const rem3 = rem2 % 1000;
    if (rem3 > 0) result += convertChunk(rem3);
  } else if (rupees >= 100000) {
    result += convertChunk(Math.floor(rupees / 100000)) + ' Lakh ';
    const rem = rupees % 100000;
    if (rem >= 1000) result += convertChunk(Math.floor(rem / 1000)) + ' Thousand ';
    const rem2 = rem % 1000;
    if (rem2 > 0) result += convertChunk(rem2);
  } else if (rupees >= 1000) {
    result += convertChunk(Math.floor(rupees / 1000)) + ' Thousand ';
    const rem = rupees % 1000;
    if (rem > 0) result += convertChunk(rem);
  } else {
    result += convertChunk(rupees);
  }

  result = result.trim() + ' Rupees';
  if (paise > 0) {
    result += ' and ' + convertChunk(paise) + ' Paise';
  }
  result += ' Only';
  return result;
}

// Country code to name mapping
function formatCountry(code) {
  if (!code) return 'India';
  const c = code.trim().toUpperCase();
  if (c === 'IN' || c === 'IND') return 'India';
  return code;
}

// ─────────── Drawing Helpers ───────────

function drawLine(doc, x1, y1, x2, y2, color = '#e5e7eb', width = 0.5) {
  doc.moveTo(x1, y1).lineTo(x2, y2).strokeColor(color).lineWidth(width).stroke();
}

function drawLabelValue(doc, label, value, x, y, opts = {}) {
  const { labelWidth = 100, valueWidth = 150, fontSize = 8 } = opts;
  doc.fontSize(fontSize).font('Helvetica').fillColor('#6b7280').text(label, x, y, { width: labelWidth });
  doc.fontSize(fontSize).font('Helvetica-Bold').fillColor('#111827').text(value, x + labelWidth, y, { width: valueWidth });
}

/**
 * Generate Amazon-style professional tax invoice PDF.
 */
function generateInvoicePDF(order, outputStream, seller) {
  const CO = seller || PLATFORM_SELLER;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 45, right: 45 },
        bufferPages: true,
        info: {
          Title: `Invoice - ${order.orderId}`,
          Author: CO.tradeName,
          Subject: `Tax Invoice for Order ${order.orderId}`,
        },
      });

      doc.pipe(outputStream);

      const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const L = doc.page.margins.left;
      const R = L + W;
      const halfW = W / 2;

      const customerState = (order.shipTo?.state || '').toLowerCase().trim();
      const isIntraState = customerState.includes('tamil nadu') || customerState === '33' || customerState === 'tn';
      const taxTotal = order.totals?.tax || 0;

      // ═══════════════ WATERMARK (faint centered logo) ═══════════════
      if (fs.existsSync(LOGO_PATH)) {
        doc.save();
        doc.opacity(0.04);
        const wmSize = 280;
        const wmX = (doc.page.width - wmSize) / 2;
        const wmY = (doc.page.height - wmSize) / 2;
        doc.image(LOGO_PATH, wmX, wmY, { width: wmSize, height: wmSize });
        doc.restore();
      }

      // ═══════════════ HEADER ═══════════════
      let y = doc.page.margins.top;

      // Logo + Company name (left) - premium sizing
      const logoSize = 50;
      let logoOffset = 0;
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, L, y, { width: logoSize, height: logoSize });
        logoOffset = logoSize + 12;
      }

      doc.fontSize(24).font('Helvetica-Bold').fillColor('#111827')
        .text(CO.name, L + logoOffset, y + 4);
      doc.fontSize(8).font('Helvetica').fillColor('#6b7280')
        .text(CO.website || '', L + logoOffset, doc.y + 2);

      // "Tax Invoice" label (right-aligned)
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#4f46e5')
        .text('TAX INVOICE', L, y + 2, { align: 'right', width: W });
      doc.fontSize(7.5).font('Helvetica').fillColor('#6b7280')
        .text('Original for Recipient', L, y + 18, { align: 'right', width: W });

      y = Math.max(y + logoSize + 10, doc.y + 14);

      // Bold brand accent line
      doc.rect(L, y, W, 4).fillColor('#4f46e5').fill();
      y += 14;

      // ═══════════════ INVOICE META (2 columns) ═══════════════
      const metaLeftX = L;
      const metaRightX = L + halfW + 20;
      const metaY = y;

      // Left column - Seller details
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#4f46e5').text('SOLD BY', metaLeftX, metaY);
      y = doc.y + 3;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#111827').text(CO.name, metaLeftX, y);
      doc.fontSize(7.5).font('Helvetica').fillColor('#374151');
      if (CO.addressLine1) doc.text(CO.addressLine1, { width: halfW - 10 });
      if (CO.addressLine2) doc.text(CO.addressLine2, { width: halfW - 10 });
      if (CO.city || CO.pincode || CO.state) {
        let cityPart = CO.city || '';
        if (CO.pincode) cityPart += (cityPart ? ' \u2013 ' : '') + CO.pincode;
        if (CO.state) cityPart += (cityPart ? ', ' : '') + CO.state;
        doc.text(cityPart, { width: halfW - 10 });
      }
      if (CO.gstin) doc.text(`GSTIN: ${CO.gstin}`);
      if (CO.pan) doc.text(`PAN: ${CO.pan}`);
      const sellerEndY = doc.y;

      // Right column - Invoice details
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#4f46e5').text('INVOICE DETAILS', metaRightX, metaY);
      let iy = doc.y + 3;

      // Payment mode display
      const paymentMethod = (order.payment?.method || '').toLowerCase();
      let paymentDisplay = titleCase(order.payment?.method);
      if (paymentMethod === 'razorpay' || paymentMethod === 'online') {
        paymentDisplay = 'Prepaid (Online)';
      } else if (paymentMethod === 'upi') {
        paymentDisplay = 'Prepaid (UPI)';
      } else if (paymentMethod === 'cod' || paymentMethod === 'cash_on_delivery') {
        paymentDisplay = 'Cash on Delivery (COD)';
      } else if (paymentMethod === 'cash') {
        paymentDisplay = 'Cash';
      } else if (paymentMethod === 'bank_transfer') {
        paymentDisplay = 'Bank Transfer (NEFT/IMPS)';
      }

      const invoiceRows = [
        ['Invoice No', order.orderId],
        ['Invoice Date', formatDate(order.createdAt)],
        ['Order Date', formatDate(order.createdAt)],
        ['Payment Mode', paymentDisplay],
      ];
      if (order.payment?.paidAt) {
        invoiceRows.push(['Paid On', formatDate(order.payment.paidAt)]);
      }
      if (order.payment?.razorpayPaymentId) {
        invoiceRows.push(['Txn ID', order.payment.razorpayPaymentId]);
      } else if (order.payment?.transactionId) {
        invoiceRows.push(['Txn ID', order.payment.transactionId]);
      }

      invoiceRows.forEach(([label, value]) => {
        doc.fontSize(7.5).font('Helvetica').fillColor('#6b7280')
          .text(label, metaRightX, iy, { continued: true, width: halfW - 30 });
        doc.font('Helvetica-Bold').fillColor('#111827')
          .text(`:  ${value}`);
        iy = doc.y;
      });

      y = Math.max(sellerEndY, doc.y) + 15;

      // ═══════════════ ADDRESSES (2 columns) ═══════════════
      drawLine(doc, L, y, R, y, '#e5e7eb', 0.5);
      y += 10;

      // Billing Address
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#4f46e5').text('BILLING ADDRESS', L, y);
      let ay = doc.y + 3;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#111827');
      if (order.shipTo) {
        doc.text(order.shipTo.fullName || 'N/A', L, ay, { width: halfW - 15 });
        doc.font('Helvetica').fillColor('#374151').fontSize(7.5);
        if (order.shipTo.addressLine1) doc.text(order.shipTo.addressLine1, { width: halfW - 15 });
        if (order.shipTo.addressLine2) doc.text(order.shipTo.addressLine2, { width: halfW - 15 });
        const cityLine = [order.shipTo.city, order.shipTo.district].filter(Boolean).join(', ');
        if (cityLine) doc.text(cityLine, { width: halfW - 15 });
        const stateLine = [order.shipTo.state, order.shipTo.zipCode].filter(Boolean).join(' - ');
        if (stateLine) doc.text(stateLine, { width: halfW - 15 });
        doc.text(formatCountry(order.shipTo.country), { width: halfW - 15 });
        if (order.shipTo.phone) doc.text(`Phone: ${order.shipTo.phone}`);
      }
      const billEndY = doc.y;

      // Shipping Address
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#4f46e5').text('SHIPPING ADDRESS', metaRightX, y);
      ay = doc.y + 3;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#111827');
      if (order.shipTo) {
        doc.text(order.shipTo.fullName || 'N/A', metaRightX, ay, { width: halfW - 30 });
        doc.font('Helvetica').fillColor('#374151').fontSize(7.5);
        if (order.shipTo.addressLine1) doc.text(order.shipTo.addressLine1, metaRightX, undefined, { width: halfW - 30 });
        if (order.shipTo.addressLine2) doc.text(order.shipTo.addressLine2, metaRightX, undefined, { width: halfW - 30 });
        const cityLine = [order.shipTo.city, order.shipTo.district].filter(Boolean).join(', ');
        if (cityLine) doc.text(cityLine, metaRightX, undefined, { width: halfW - 30 });
        const stateLine = [order.shipTo.state, order.shipTo.zipCode].filter(Boolean).join(' - ');
        if (stateLine) doc.text(stateLine, metaRightX, undefined, { width: halfW - 30 });
        doc.text(formatCountry(order.shipTo.country), metaRightX, undefined, { width: halfW - 30 });
        if (order.shipTo.phone) doc.text(`Phone: ${order.shipTo.phone}`, metaRightX, undefined, { width: halfW - 30 });
      }

      y = Math.max(billEndY, doc.y) + 15;

      // ═══════════════ ITEMS TABLE ═══════════════
      drawLine(doc, L, y, R, y, '#e5e7eb', 0.5);
      y += 2;

      // Table column widths
      const cols = {
        sno: 25,
        desc: 0,
        hsn: 45,
        qty: 30,
        unitPrice: 62,
        discount: 48,
        taxRate: 38,
        taxAmt: 55,
        total: 65,
      };
      cols.desc = W - cols.sno - cols.hsn - cols.qty - cols.unitPrice - cols.discount - cols.taxRate - cols.taxAmt - cols.total;

      // Table header
      doc.rect(L, y, W, 20).fillColor('#f9fafb').fill();
      drawLine(doc, L, y, R, y, '#d1d5db', 0.5);
      drawLine(doc, L, y + 20, R, y + 20, '#d1d5db', 0.5);

      let hx = L;
      const hY = y + 6;
      doc.fontSize(6).font('Helvetica-Bold').fillColor('#374151');
      doc.text('#', hx, hY, { width: cols.sno, align: 'center' }); hx += cols.sno;
      doc.text('PRODUCT', hx, hY, { width: cols.desc, align: 'left' }); hx += cols.desc;
      doc.text('HSN', hx, hY, { width: cols.hsn, align: 'center' }); hx += cols.hsn;
      doc.text('QTY', hx, hY, { width: cols.qty, align: 'center' }); hx += cols.qty;
      doc.text('UNIT PRICE', hx, hY, { width: cols.unitPrice, align: 'right' }); hx += cols.unitPrice;
      doc.text('DISCOUNT', hx, hY, { width: cols.discount, align: 'right' }); hx += cols.discount;
      doc.text('GST %', hx, hY, { width: cols.taxRate, align: 'center' }); hx += cols.taxRate;
      doc.text(isIntraState ? 'CGST+SGST' : 'IGST', hx, hY, { width: cols.taxAmt, align: 'right' }); hx += cols.taxAmt;
      doc.text('TOTAL', hx, hY, { width: cols.total, align: 'right' });

      let rowY = y + 24;

      const items = order.items || [];
      const itemSubtotal = items.reduce((sum, i) => sum + (i.priceSnapshot || 0) * (i.qty || 1), 0);

      items.forEach((item, index) => {
        // Page overflow check
        if (rowY > doc.page.height - 180) {
          doc.addPage();
          rowY = doc.page.margins.top + 5;
        }

        // Zebra stripe
        if (index % 2 === 0) {
          doc.rect(L, rowY - 3, W, 20).fillColor('#f9fafb').fill();
        }

        const lineTotal = (item.priceSnapshot || 0) * (item.qty || 1);
        const itemTax = itemSubtotal > 0 ? (lineTotal / itemSubtotal) * taxTotal : 0;
        const itemTaxRate = lineTotal > 0 ? ((itemTax / lineTotal) * 100) : 0;
        const itemGrandTotal = lineTotal + itemTax;

        let cx = L;
        doc.fontSize(6.5).font('Helvetica').fillColor('#374151');

        doc.text(String(index + 1), cx, rowY, { width: cols.sno, align: 'center' }); cx += cols.sno;

        // Product description
        let desc = item.name || 'Product';
        if (item.variantName) desc += `\n${item.variantName}`;
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#111827')
          .text(desc, cx, rowY, { width: cols.desc - 5, align: 'left' });
        if (item.sku) {
          doc.font('Helvetica').fontSize(5.5).fillColor('#9ca3af')
            .text(`SKU: ${item.sku}`, cx, doc.y, { width: cols.desc - 5 });
        }
        // Warranty info below product name
        if (item.warranty?.hasWarranty && item.warranty.duration) {
          const wDur = item.warranty.duration;
          const wType = item.warranty.durationType === 'lifetime' ? 'Lifetime' :
            `${wDur} ${item.warranty.durationType === 'years' ? (wDur === 1 ? 'Year' : 'Years') : (wDur === 1 ? 'Month' : 'Months')}`;
          doc.font('Helvetica-Bold').fontSize(5.5).fillColor('#4f46e5')
            .text(`Warranty: ${wType}`, cx, doc.y, { width: cols.desc - 5 });
        }
        cx += cols.desc;

        // HSN code
        doc.fontSize(6.5).font('Helvetica').fillColor('#374151');
        doc.text(item.hsnCode || item.hsn || '-', cx, rowY, { width: cols.hsn, align: 'center' }); cx += cols.hsn;

        // Reset Y for other columns (align to row start)
        doc.fontSize(6.5).font('Helvetica').fillColor('#374151');
        doc.text(String(item.qty || 1), cx, rowY, { width: cols.qty, align: 'center' }); cx += cols.qty;
        doc.text(formatINR(item.priceSnapshot || 0), cx, rowY, { width: cols.unitPrice, align: 'right' }); cx += cols.unitPrice;

        // Discount
        const itemDiscount = item.discount || 0;
        if (itemDiscount > 0) {
          doc.fillColor('#059669').text('-' + formatINR(itemDiscount), cx, rowY, { width: cols.discount, align: 'right' });
        } else {
          doc.fillColor('#9ca3af').text('-', cx, rowY, { width: cols.discount, align: 'right' });
        }
        cx += cols.discount;

        // Tax - use item's taxRate if available, else calculate from order totals
        const displayTaxRate = item.taxRate != null ? item.taxRate : (taxTotal > 0 ? itemTaxRate : 0);
        if (displayTaxRate > 0 || taxTotal > 0) {
          doc.fillColor('#374151');
          doc.text(displayTaxRate.toFixed(0) + '%', cx, rowY, { width: cols.taxRate, align: 'center' }); cx += cols.taxRate;
          doc.text(formatINR(itemTax), cx, rowY, { width: cols.taxAmt, align: 'right' }); cx += cols.taxAmt;
        } else {
          doc.fillColor('#9ca3af');
          doc.text('Incl.', cx, rowY, { width: cols.taxRate, align: 'center' }); cx += cols.taxRate;
          doc.text('-', cx, rowY, { width: cols.taxAmt, align: 'right' }); cx += cols.taxAmt;
        }

        // Total
        doc.font('Helvetica-Bold').fillColor('#111827')
          .text(formatINR(itemGrandTotal), cx, rowY, { width: cols.total, align: 'right' });

        rowY += 22;
      });

      // Table bottom line
      drawLine(doc, L, rowY - 2, R, rowY - 2, '#d1d5db', 0.5);
      rowY += 8;
      doc.y = rowY;

      // ═══════════════ TOTALS (right-aligned box) ═══════════════
      const totalsBoxW = 230;
      const totalsX = R - totalsBoxW;
      const totalsStartY = rowY;

      // Totals background
      doc.rect(totalsX - 10, totalsStartY - 5, totalsBoxW + 10, 0).fillColor('#f9fafb');

      const tLabelW = 130;
      const tValueW = 90;
      let ty = totalsStartY;

      const drawTotalRow = (label, value, opts = {}) => {
        const fontName = opts.bold ? 'Helvetica-Bold' : 'Helvetica';
        const size = opts.bold ? 10 : 8;
        const labelColor = opts.bold ? '#111827' : '#6b7280';
        const valueColor = opts.valueColor || (opts.bold ? '#111827' : '#374151');
        doc.fontSize(size).font('Helvetica').fillColor(labelColor)
          .text(label, totalsX, ty, { width: tLabelW, align: 'left' });
        doc.moveUp();
        doc.fontSize(size).font(fontName).fillColor(valueColor)
          .text(value, totalsX + tLabelW, ty, { width: tValueW, align: 'right' });
        ty = doc.y + 2;
      };

      drawTotalRow('Subtotal', formatINR(order.totals?.subtotal || 0));

      if (taxTotal > 0) {
        // Calculate effective GST rate from totals
        const subtotal = order.totals?.subtotal || 0;
        const effectiveRate = subtotal > 0 ? ((taxTotal / subtotal) * 100) : 0;
        const rateLabel = effectiveRate > 0 ? ` (${effectiveRate.toFixed(0)}%)` : '';

        if (isIntraState) {
          const halfRate = effectiveRate > 0 ? ` @ ${(effectiveRate / 2).toFixed(0)}%` : '';
          drawTotalRow(`CGST${halfRate}`, formatINR(taxTotal / 2));
          drawTotalRow(`SGST${halfRate}`, formatINR(taxTotal / 2));
        } else {
          drawTotalRow(`IGST${rateLabel}`, formatINR(taxTotal));
        }
      }

      if (order.totals?.shipping > 0) {
        drawTotalRow('Shipping', formatINR(order.totals.shipping));
      } else {
        drawTotalRow('Shipping', 'FREE', { valueColor: '#059669' });
      }

      if (order.totals?.discount > 0) {
        drawTotalRow('Discount', '-' + formatINR(order.totals.discount), { valueColor: '#059669' });
      }

      // Grand total separator
      ty += 3;
      drawLine(doc, totalsX, ty, R, ty, '#111827', 1);
      ty += 6;

      drawTotalRow('Grand Total', formatINR(order.totals?.total || 0), { bold: true });

      doc.y = ty + 5;

      // ═══════════════ AMOUNT IN WORDS ═══════════════
      const wordsY = Math.max(doc.y, totalsStartY + 10);
      doc.fontSize(7).font('Helvetica').fillColor('#6b7280')
        .text('Amount in Words:', L, wordsY);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#374151')
        .text(numberToWords(order.totals?.total || 0), L, doc.y + 1, { width: totalsX - L - 20 });

      // GST note - always show
      doc.moveDown(0.5);
      if (taxTotal > 0) {
        doc.fontSize(6.5).font('Helvetica-Oblique').fillColor('#6b7280')
          .text('* GST has been charged separately as shown above.', L);
      } else {
        doc.fontSize(6.5).font('Helvetica-Oblique').fillColor('#6b7280')
          .text('* All prices are inclusive of applicable GST.', L);
      }
      doc.fontSize(6.5).font('Helvetica').fillColor('#9ca3af')
        .text('Whether tax is payable under reverse charge: No', L);

      // Move Y past the totals box
      const afterTotals = Math.max(doc.y, ty) + 20;
      doc.y = afterTotals;

      // ═══════════════ SIGNATURE SECTION ═══════════════
      drawLine(doc, L, doc.y, R, doc.y, '#e5e7eb', 0.5);
      doc.moveDown(0.8);

      // Right-aligned signature block
      const sigX = R - 180;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#111827')
        .text(`For ${CO.name}`, sigX, doc.y, { width: 170, align: 'right' });

      // Space for signature/seal (will be added later)
      doc.moveDown(3);

      doc.fontSize(7).font('Helvetica').fillColor('#6b7280')
        .text('Authorized Signatory', sigX, doc.y, { width: 170, align: 'right' });

      // ═══════════════ FOOTER ═══════════════
      doc.moveDown(1.5);
      drawLine(doc, L, doc.y, R, doc.y, '#e5e7eb', 0.5);
      doc.moveDown(0.5);

      // Warranty claim instructions (only if any item has warranty)
      const hasAnyWarranty = items.some(i => i.warranty?.hasWarranty && i.warranty.duration);
      if (hasAnyWarranty) {
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#4f46e5')
          .text('Warranty Information', L, doc.y, { align: 'center', width: W });
        doc.moveDown(0.2);
        doc.fontSize(6).font('Helvetica').fillColor('#6b7280')
          .text('For warranty claims, contact us with your invoice number and product details. Warranty covers manufacturing defects only and does not cover damage caused by misuse, accidents, or unauthorized modifications. Keep this invoice as proof of purchase for all warranty claims.', L, doc.y, {
            align: 'center', width: W,
          });
        doc.moveDown(0.4);
      }

      // Return policy note
      doc.fontSize(6.5).font('Helvetica').fillColor('#6b7280');
      doc.text('Return Policy: Products can be returned within 7 days of delivery if unused and in original packaging. No returns on used or installed items.', L, doc.y, {
        align: 'center', width: W,
      });
      doc.moveDown(0.4);

      doc.fontSize(6.5).font('Helvetica').fillColor('#9ca3af');
      doc.text('This is a computer-generated invoice and does not require a physical signature.', L, doc.y, {
        align: 'center', width: W,
      });
      doc.moveDown(0.3);
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#6b7280')
        .text(`Thank you for shopping with ${CO.name}!`, { align: 'center', width: W });
      doc.moveDown(0.2);
      doc.fontSize(6.5).font('Helvetica').fillColor('#9ca3af')
        .text([CO.email, CO.phone, CO.website].filter(Boolean).join('  |  '), { align: 'center', width: W });

      doc.end();

      outputStream.on('finish', resolve);
      doc.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate invoice PDF as a Buffer (for email attachments).
 */
function generateInvoiceBuffer(order, seller) {
  const { PassThrough } = require('stream');
  return new Promise((resolve, reject) => {
    const chunks = [];
    const passthrough = new PassThrough();
    passthrough.on('data', (chunk) => chunks.push(chunk));
    passthrough.on('end', () => resolve(Buffer.concat(chunks)));
    passthrough.on('error', reject);
    generateInvoicePDF(order, passthrough, seller).catch(reject);
  });
}

module.exports = { generateInvoicePDF, generateInvoiceBuffer, buildSellerFromVendor };
