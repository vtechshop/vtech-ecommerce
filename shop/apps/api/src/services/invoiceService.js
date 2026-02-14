// FILE: apps/api/src/services/invoiceService.js
const PDFDocument = require('pdfkit');
const env = require('../config/env');

// Default platform seller details (used when order is NOT a vendor order)
const PLATFORM_SELLER = {
  name: 'VTECH',
  tradeName: 'V-Tech Kitchen',
  address: '9/83 E, 4th Street Ext, T Balan Nagar, Ganapathy Pudur, Coimbatore, Tamil Nadu - 641006',
  stateCode: '33',
  state: 'Tamil Nadu',
  phone: env.SUPPORT_PHONE || '+91 9944556683',
  email: env.SUPPORT_EMAIL || 'vtechshop.customercare@gmail.com',
  website: 'www.vtechkitchen.com',
  gstin: '33AARFV8415B1Z4',
  pan: 'AARFV8415B',
};

/**
 * Build seller details from a vendor profile (for vendor orders).
 * Falls back to platform defaults for missing fields.
 */
function buildSellerFromVendor(vendor) {
  if (!vendor) return PLATFORM_SELLER;

  // Extract state and state code from GSTIN (first 2 digits = state code)
  const gstin = vendor.kyc?.taxId || '';
  const gstStateCode = gstin.length >= 2 ? gstin.substring(0, 2) : '';

  return {
    name: vendor.kyc?.businessName || vendor.storeName || 'Vendor',
    tradeName: vendor.storeName || vendor.kyc?.businessName || 'Vendor',
    address: vendor.kyc?.businessAddress || 'Address not provided',
    stateCode: gstStateCode || '',
    state: '', // Will be determined from GSTIN state code or left blank
    phone: vendor.kyc?.phoneNumber || '',
    email: vendor.userId?.email || '',
    website: '',
    gstin: gstin,
    pan: vendor.panNumber || (gstin.length === 15 ? gstin.substring(2, 12) : ''),
  };
}

function formatINR(amount) {
  const num = Number(amount) || 0;
  return '\u20B9' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function titleCase(str) {
  if (!str) return 'N/A';
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Convert number to Indian words for amount in words
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

/**
 * Generate an Amazon-style tax invoice PDF.
 * @param {Object} order - Lean order document
 * @param {import('http').ServerResponse} outputStream - Express response
 * @param {Object} [seller] - Seller details (vendor info). Defaults to platform seller (VTECH).
 */
function generateInvoicePDF(order, outputStream, seller) {
  // Use provided seller details, or default to platform seller
  const COMPANY = seller || PLATFORM_SELLER;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 30, bottom: 30, left: 40, right: 40 },
        bufferPages: true,
        info: {
          Title: `Invoice - ${order.orderId}`,
          Author: COMPANY.tradeName,
          Subject: `Tax Invoice for Order ${order.orderId}`,
        },
      });

      doc.pipe(outputStream);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const L = doc.page.margins.left;
      const halfW = pageWidth / 2;

      // Determine if intra-state (Tamil Nadu) or inter-state for GST split
      const customerState = (order.shipTo?.state || '').toLowerCase().trim();
      const isIntraState = customerState.includes('tamil nadu') || customerState === '33' || customerState === 'tn';
      const taxTotal = order.totals?.tax || 0;

      // ============== OUTER BORDER ==============
      doc.rect(L - 5, doc.page.margins.top - 5, pageWidth + 10, doc.page.height - doc.page.margins.top - doc.page.margins.bottom + 10)
        .strokeColor('#000000').lineWidth(1).stroke();

      // ============== HEADER: SOLD BY / INVOICE INFO ==============
      let y = doc.page.margins.top + 5;

      // Title
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
        .text('Tax Invoice / Bill of Supply', L, y, { align: 'center', width: pageWidth });
      y = doc.y + 5;

      // Horizontal line
      doc.moveTo(L, y).lineTo(L + pageWidth, y).strokeColor('#000000').lineWidth(0.5).stroke();
      y += 8;

      // Left: Sold By | Right: Invoice Details
      const soldByY = y;

      // -- Sold By (left column) --
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
        .text('Sold By:', L + 5, soldByY, { width: halfW - 10 });
      doc.fontSize(8).font('Helvetica-Bold').text(COMPANY.name, L + 5, undefined, { width: halfW - 10 });
      doc.font('Helvetica').fillColor('#333333')
        .text(COMPANY.address, { width: halfW - 10 })
        .text(`GSTIN: ${COMPANY.gstin}`)
        .text(`PAN: ${COMPANY.pan}`)
        .text(`State: ${COMPANY.state} (${COMPANY.stateCode})`);

      const soldByEndY = doc.y;

      // -- Invoice Details (right column) --
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
        .text('Invoice Details:', L + halfW + 5, soldByY, { width: halfW - 10 });
      doc.fontSize(8).font('Helvetica').fillColor('#333333');

      const invoiceDetails = [
        ['Invoice No:', order.orderId],
        ['Invoice Date:', formatDate(order.createdAt)],
        ['Order No:', order.orderId],
        ['Order Date:', formatDate(order.createdAt)],
      ];
      if (order.payment?.paidAt) {
        invoiceDetails.push(['Payment Date:', formatDate(order.payment.paidAt)]);
      }
      invoiceDetails.push(['Payment Method:', titleCase(order.payment?.method)]);
      if (order.payment?.razorpayPaymentId) {
        invoiceDetails.push(['Transaction ID:', order.payment.razorpayPaymentId]);
      } else if (order.payment?.transactionId) {
        invoiceDetails.push(['Transaction ID:', order.payment.transactionId]);
      }

      invoiceDetails.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(label, L + halfW + 5, undefined, { continued: true, width: halfW - 10 });
        doc.font('Helvetica').text(` ${value}`);
      });

      const invoiceEndY = doc.y;

      // Vertical divider between columns
      doc.moveTo(L + halfW, soldByY - 3).lineTo(L + halfW, Math.max(soldByEndY, invoiceEndY) + 5)
        .strokeColor('#cccccc').lineWidth(0.5).stroke();

      y = Math.max(soldByEndY, invoiceEndY) + 8;

      // Horizontal line
      doc.moveTo(L, y).lineTo(L + pageWidth, y).strokeColor('#000000').lineWidth(0.5).stroke();
      y += 8;

      // ============== BILLING & SHIPPING ADDRESS ==============
      const addrY = y;

      // Billing Address (left)
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
        .text('Billing Address:', L + 5, addrY, { width: halfW - 10 });
      doc.fontSize(8).font('Helvetica').fillColor('#333333');
      if (order.shipTo) {
        doc.text(order.shipTo.fullName || 'N/A', { width: halfW - 10 });
        if (order.shipTo.addressLine1) doc.text(order.shipTo.addressLine1, { width: halfW - 10 });
        if (order.shipTo.addressLine2) doc.text(order.shipTo.addressLine2, { width: halfW - 10 });
        const cityLine = [order.shipTo.city, order.shipTo.district].filter(Boolean).join(', ');
        if (cityLine) doc.text(cityLine, { width: halfW - 10 });
        const stateLine = [order.shipTo.state, order.shipTo.zipCode].filter(Boolean).join(' - ');
        if (stateLine) doc.text(stateLine, { width: halfW - 10 });
        doc.text(order.shipTo.country || 'India', { width: halfW - 10 });
        if (order.shipTo.phone) doc.text(`Phone: ${order.shipTo.phone}`, { width: halfW - 10 });
      }
      if (order.isGuest && order.guestEmail) {
        doc.text(`Email: ${order.guestEmail}`, { width: halfW - 10 });
      }

      const billAddrEndY = doc.y;

      // Shipping Address (right)
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
        .text('Shipping Address:', L + halfW + 5, addrY, { width: halfW - 10 });
      doc.fontSize(8).font('Helvetica').fillColor('#333333');
      if (order.shipTo) {
        doc.text(order.shipTo.fullName || 'N/A', L + halfW + 5, undefined, { width: halfW - 10 });
        if (order.shipTo.addressLine1) doc.text(order.shipTo.addressLine1, L + halfW + 5, undefined, { width: halfW - 10 });
        if (order.shipTo.addressLine2) doc.text(order.shipTo.addressLine2, L + halfW + 5, undefined, { width: halfW - 10 });
        const cityLine = [order.shipTo.city, order.shipTo.district].filter(Boolean).join(', ');
        if (cityLine) doc.text(cityLine, L + halfW + 5, undefined, { width: halfW - 10 });
        const stateLine = [order.shipTo.state, order.shipTo.zipCode].filter(Boolean).join(' - ');
        if (stateLine) doc.text(stateLine, L + halfW + 5, undefined, { width: halfW - 10 });
        doc.text(order.shipTo.country || 'India', L + halfW + 5, undefined, { width: halfW - 10 });
        if (order.shipTo.phone) doc.text(`Phone: ${order.shipTo.phone}`, L + halfW + 5, undefined, { width: halfW - 10 });
      }

      // Vertical divider
      doc.moveTo(L + halfW, addrY - 3).lineTo(L + halfW, Math.max(billAddrEndY, doc.y) + 5)
        .strokeColor('#cccccc').lineWidth(0.5).stroke();

      y = Math.max(billAddrEndY, doc.y) + 8;

      // Horizontal line
      doc.moveTo(L, y).lineTo(L + pageWidth, y).strokeColor('#000000').lineWidth(0.5).stroke();
      y += 5;

      // ============== ITEMS TABLE ==============
      // Columns: S.No | Description | Qty | Unit Price | Discount | Net Amount | Tax Rate | Tax | Total
      const cols = {
        sno: 25,
        desc: 0, // calculated below
        qty: 30,
        unitPrice: 62,
        discount: 50,
        netAmt: 62,
        taxRate: 35,
        taxAmt: 55,
        total: 65,
      };
      cols.desc = pageWidth - cols.sno - cols.qty - cols.unitPrice - cols.discount - cols.netAmt - cols.taxRate - cols.taxAmt - cols.total;

      // Table header (dark background)
      doc.rect(L, y, pageWidth, 22).fillColor('#1a1a1a').fill();

      let hx = L + 3;
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('S.No', hx, y + 3, { width: cols.sno, align: 'center' }); hx += cols.sno;
      doc.text('Description', hx, y + 3, { width: cols.desc, align: 'left' }); hx += cols.desc;
      doc.text('Qty', hx, y + 3, { width: cols.qty, align: 'center' }); hx += cols.qty;
      doc.text('Unit\nPrice', hx, y + 2, { width: cols.unitPrice, align: 'right' }); hx += cols.unitPrice;
      doc.text('Disc.', hx, y + 3, { width: cols.discount, align: 'right' }); hx += cols.discount;
      doc.text('Net\nAmount', hx, y + 2, { width: cols.netAmt, align: 'right' }); hx += cols.netAmt;
      doc.text('Tax\n%', hx, y + 2, { width: cols.taxRate, align: 'center' }); hx += cols.taxRate;
      // Show CGST+SGST or IGST header based on intra/inter state
      if (isIntraState) {
        doc.text('CGST+\nSGST', hx, y + 2, { width: cols.taxAmt, align: 'right' });
      } else {
        doc.text('IGST', hx, y + 3, { width: cols.taxAmt, align: 'right' });
      }
      hx += cols.taxAmt;
      doc.text('Total', hx, y + 3, { width: cols.total, align: 'right' });

      let rowY = y + 26;

      // Calculate per-item tax (distribute total tax proportionally)
      const items = order.items || [];
      const itemSubtotal = items.reduce((sum, i) => sum + (i.priceSnapshot || 0) * (i.qty || 1), 0);

      items.forEach((item, index) => {
        // Page overflow
        if (rowY > doc.page.height - 140) {
          doc.addPage();
          // Redraw outer border on new page
          doc.rect(L - 5, doc.page.margins.top - 5, pageWidth + 10, doc.page.height - doc.page.margins.top - doc.page.margins.bottom + 10)
            .strokeColor('#000000').lineWidth(1).stroke();
          rowY = doc.page.margins.top + 5;
        }

        // Alternating row
        if (index % 2 === 0) {
          doc.rect(L, rowY - 2, pageWidth, 16).fillColor('#f8f9fa').fill();
        }

        const lineTotal = (item.priceSnapshot || 0) * (item.qty || 1);
        // Proportional tax for this item
        const itemTax = itemSubtotal > 0 ? (lineTotal / itemSubtotal) * taxTotal : 0;
        const itemTaxRate = lineTotal > 0 ? ((itemTax / lineTotal) * 100) : 0;
        const itemGrandTotal = lineTotal + itemTax;

        let cx = L + 3;
        doc.fontSize(7).font('Helvetica').fillColor('#333333');

        doc.text(String(index + 1), cx, rowY, { width: cols.sno, align: 'center' }); cx += cols.sno;

        // Description: name + variant
        let desc = item.name || 'Product';
        if (item.variantName) desc += ` | ${item.variantName}`;
        if (item.sku) desc += ` (SKU: ${item.sku})`;
        doc.text(desc, cx, rowY, { width: cols.desc, align: 'left' }); cx += cols.desc;

        doc.text(String(item.qty || 1), cx, rowY, { width: cols.qty, align: 'center' }); cx += cols.qty;
        doc.text(formatINR(item.priceSnapshot || 0), cx, rowY, { width: cols.unitPrice, align: 'right' }); cx += cols.unitPrice;
        doc.text('-', cx, rowY, { width: cols.discount, align: 'right' }); cx += cols.discount;
        doc.text(formatINR(lineTotal), cx, rowY, { width: cols.netAmt, align: 'right' }); cx += cols.netAmt;

        // Tax rate & amount
        if (taxTotal > 0) {
          doc.text(itemTaxRate.toFixed(0) + '%', cx, rowY, { width: cols.taxRate, align: 'center' }); cx += cols.taxRate;
          doc.text(formatINR(itemTax), cx, rowY, { width: cols.taxAmt, align: 'right' }); cx += cols.taxAmt;
        } else {
          doc.text('-', cx, rowY, { width: cols.taxRate, align: 'center' }); cx += cols.taxRate;
          doc.text('-', cx, rowY, { width: cols.taxAmt, align: 'right' }); cx += cols.taxAmt;
        }

        doc.font('Helvetica-Bold').text(formatINR(itemGrandTotal), cx, rowY, { width: cols.total, align: 'right' });

        rowY += 16;
      });

      // Table bottom border
      doc.moveTo(L, rowY).lineTo(L + pageWidth, rowY).strokeColor('#000000').lineWidth(0.5).stroke();
      rowY += 8;

      doc.y = rowY;

      // ============== TOTALS SECTION ==============
      const totalsX = L + pageWidth - 220;
      const tLabelW = 120;
      const tValueW = 95;

      const drawRow = (label, value, opts = {}) => {
        const f = opts.bold ? 'Helvetica-Bold' : 'Helvetica';
        const s = opts.bold ? 10 : 8;
        const c = opts.color || '#333333';
        doc.fontSize(s).font(f).fillColor(c);
        doc.text(label, totalsX, doc.y, { width: tLabelW, align: 'left' });
        doc.moveUp();
        doc.text(value, totalsX + tLabelW, doc.y, { width: tValueW, align: 'right' });
      };

      drawRow('Subtotal:', formatINR(order.totals?.subtotal || 0));

      // GST breakdown
      if (taxTotal > 0) {
        if (isIntraState) {
          drawRow(`CGST:`, formatINR(taxTotal / 2));
          drawRow(`SGST:`, formatINR(taxTotal / 2));
        } else {
          drawRow(`IGST:`, formatINR(taxTotal));
        }
      }

      if (order.totals?.shipping > 0) {
        drawRow('Shipping Charges:', formatINR(order.totals.shipping));
      } else {
        drawRow('Shipping Charges:', 'FREE', { color: '#16a34a' });
      }

      if (order.totals?.discount > 0) {
        drawRow('Discount:', '-' + formatINR(order.totals.discount), { color: '#16a34a' });
      }

      // Grand total divider
      doc.moveDown(0.2);
      doc.moveTo(totalsX, doc.y).lineTo(totalsX + tLabelW + tValueW, doc.y)
        .strokeColor('#000000').lineWidth(1).stroke();
      doc.moveDown(0.3);

      drawRow('Grand Total:', formatINR(order.totals?.total || 0), { bold: true });

      doc.moveDown(0.5);

      // ============== AMOUNT IN WORDS ==============
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000')
        .text('Amount in Words:', L + 5, doc.y, { continued: true })
        .font('Helvetica-Oblique').fillColor('#333333')
        .text('  ' + numberToWords(order.totals?.total || 0));

      doc.moveDown(0.5);

      // Horizontal line
      doc.moveTo(L, doc.y).lineTo(L + pageWidth, doc.y).strokeColor('#000000').lineWidth(0.5).stroke();
      doc.moveDown(0.5);

      // ============== GST NOTE ==============
      doc.fontSize(7).font('Helvetica').fillColor('#666666')
        .text('Whether tax is payable under reverse charge: No', L + 5, doc.y, { width: pageWidth });

      doc.moveDown(1.5);

      // ============== AUTHORIZED SIGNATORY (right-aligned) ==============
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000')
        .text(`For ${COMPANY.name}`, L, doc.y, { align: 'right', width: pageWidth - 10 });
      doc.moveDown(1.5);
      doc.fontSize(8).font('Helvetica')
        .text('Authorized Signatory', L, doc.y, { align: 'right', width: pageWidth - 10 });

      doc.moveDown(1);

      // ============== FOOTER ==============
      doc.moveTo(L, doc.y).lineTo(L + pageWidth, doc.y).strokeColor('#cccccc').lineWidth(0.5).stroke();
      doc.moveDown(0.3);

      doc.fontSize(7).font('Helvetica').fillColor('#999999');
      doc.text('This is a computer-generated invoice and does not require a physical signature.', L, doc.y, {
        align: 'center', width: pageWidth,
      });
      doc.moveDown(0.2);
      doc.text(`Thank you for shopping with ${COMPANY.tradeName}!`, { align: 'center', width: pageWidth });
      doc.moveDown(0.2);
      doc.text(`For queries: ${COMPANY.email} | ${COMPANY.phone} | ${COMPANY.website}`, { align: 'center', width: pageWidth });

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
 * @param {Object} order - Lean order document
 * @param {Object} [seller] - Seller details (vendor info). Defaults to platform seller.
 * @returns {Promise<Buffer>}
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
