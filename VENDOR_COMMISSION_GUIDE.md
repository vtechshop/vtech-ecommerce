# Vendor Commission Management Guide

## Overview

The platform takes a commission from every vendor sale. This commission can be customized per vendor and even per product, giving you complete control over your marketplace's revenue model.

## Commission Structure

### Hierarchy (Priority Order)

The system uses a **3-level hierarchy** to determine commissions:

1. **Product-Level Commission** (Highest Priority)
   - Set individually on each product
   - Overrides vendor and system defaults
   - Useful for promotions or high/low margin products

2. **Vendor-Level Commission** (Medium Priority)
   - Set per vendor in admin panel
   - Default: 15%
   - Each vendor can have a different rate

3. **System Default** (Lowest Priority)
   - Fallback: 15%
   - Used when product and vendor have no custom rates

### How It Works

```javascript
// Commission calculation logic (orderController.js:195-197)
const commissionPercentage =
  product.vendorCommissionPercentage !== undefined &&
  product.vendorCommissionPercentage !== null
    ? product.vendorCommissionPercentage  // Use product-specific rate
    : (vendor.defaultCommissionPercentage || 15); // Use vendor rate or default
```

## Current Configuration

### Where Vendor Commissions Are Set NOW

**Currently**, vendor commissions can ONLY be set in the database directly:

1. **Database Field**: `vendors.defaultCommissionPercentage`
2. **Default Value**: 15%
3. **Valid Range**: 0-100%

**To change a vendor's commission NOW (before using new UI):**

```javascript
// MongoDB Shell or Compass
db.vendors.updateOne(
  { _id: ObjectId("vendor_id_here") },
  { $set: { defaultCommissionPercentage: 20 } }
)
```

## NEW: Admin Interface (Just Added)

### How to Set/Change Vendor Commission in Admin Panel

1. **Navigate to Admin Dashboard**
   - Go to `/dashboard/admin/vendors`

2. **View Vendor List**
   - See all vendors with their current commission rates
   - Commission column shows: `% 15%` (icon + percentage)

3. **Click "View Details" on Any Vendor**
   - Opens vendor detail modal
   - Scroll to "Commission Settings" section

4. **Edit Commission**
   - Click "Change Commission" button
   - Enter new commission percentage (0-100)
   - Click "Save" to apply
   - Or "Cancel" to discard changes

5. **Confirmation**
   - Success message shows: "Commission updated to X% for [Vendor Name]"
   - Changes take effect immediately for new orders

### API Endpoint (Just Added)

```http
PUT /api/admin/vendors/:vendorId/commission
Content-Type: application/json

{
  "defaultCommissionPercentage": 20
}
```

**Response:**
```json
{
  "success": true,
  "data": { ...vendor object... },
  "message": "Commission updated to 20% for ABC Store"
}
```

**Validation:**
- Commission must be between 0-100
- Only admins can update commissions
- Change is logged in audit trail

## Commission Examples

### Example 1: Vendor with Default Commission

```
Vendor: ABC Electronics
Vendor Commission: 15% (default)
Product: Laptop - $1000
Product Commission: Not set

Calculation:
- Sale Amount: $1000
- Platform Commission (15%): $150
- Vendor Receives: $850
```

### Example 2: Vendor with Custom Commission

```
Vendor: XYZ Fashion
Vendor Commission: 20% (custom)
Product: Shirt - $50
Product Commission: Not set

Calculation:
- Sale Amount: $50
- Platform Commission (20%): $10
- Vendor Receives: $40
```

### Example 3: Product with Override Commission

```
Vendor: ABC Electronics
Vendor Commission: 15%
Product: Clearance TV - $500
Product Commission: 10% (override)

Calculation:
- Sale Amount: $500
- Platform Commission (10%): $50  ← Uses product override
- Vendor Receives: $450
```

### Example 4: Mixed Order

```
Order contains:
1. Laptop ($1000) - Vendor: 15%, Product: Not set
   Platform gets: $150

2. Phone ($800) - Vendor: 15%, Product: 5% override
   Platform gets: $40

3. Headphones ($100) - Vendor: 20%, Product: Not set
   Platform gets: $20

Total Platform Commission: $210
Total Vendor Payout: $1690
Order Total: $1900
```

## Database Schema

### Vendor Model

```javascript
{
  _id: ObjectId,
  storeName: String,
  userId: ObjectId,
  defaultCommissionPercentage: {
    type: Number,
    default: 15,  // Platform takes 15% by default
    min: 0,
    max: 100
  },
  // ... other fields
}
```

### Product Model

```javascript
{
  _id: ObjectId,
  title: String,
  vendorId: ObjectId,
  price: Number,
  vendorCommissionPercentage: {
    type: Number,
    min: 0,
    max: 100
    // If null, uses vendor's defaultCommissionPercentage
  },
  // ... other fields
}
```

### Commission Model

```javascript
{
  _id: ObjectId,
  type: 'vendor',  // or 'affiliate'
  subjectId: ObjectId,  // Vendor ID
  orderId: ObjectId,
  orderItemId: ObjectId,
  amount: Number,  // Actual commission amount in currency
  percentage: Number,  // Commission percentage used
  status: 'pending' | 'approved' | 'paid'
}
```

## Commission Lifecycle

### 1. Order Placement

When a customer places an order:

```javascript
// For each item in the order
for (const item of orderItems) {
  // Get vendor and product
  const vendor = await Vendor.findById(item.vendorId);
  const product = await Product.findById(item.productId);

  // Determine commission rate (product > vendor > default)
  const rate = product.vendorCommissionPercentage ??
               vendor.defaultCommissionPercentage ??
               15;

  // Calculate commission amount
  const amount = (item.priceSnapshot * item.qty * rate) / 100;

  // Create commission record
  await Commission.create({
    type: 'vendor',
    subjectId: vendor._id,
    orderId: order._id,
    amount: amount,
    percentage: rate,
    status: 'pending'
  });
}
```

### 2. Commission Status Flow

```
pending → approved → paid
```

- **pending**: Order placed, commission calculated
- **approved**: Order delivered/completed successfully
- **paid**: Commission paid out to platform account

### 3. Vendor Payout Calculation

```
Vendor Payout = Item Total - Platform Commission

Example:
Item Total: $1000
Commission Rate: 15%
Platform Commission: $150
Vendor Payout: $850
```

## Admin Features

### View All Vendor Commissions

**Location**: Admin Dashboard → Vendors

**Features**:
- See commission rate for each vendor in table
- Sort/filter vendors
- Default shows 15% if not customized

### Update Vendor Commission

**Location**: Vendor Details Modal → Commission Settings

**Features**:
- Current rate displayed prominently
- Edit mode with validation (0-100%)
- Shows vendor's earnings percentage
- Explains product-level overrides
- Immediate effect on new orders

### Audit Trail

All commission changes are logged:

```javascript
{
  action: 'vendor_commission_updated',
  userId: adminId,
  resourceType: 'Vendor',
  resourceId: vendorId,
  details: {
    vendorName: 'ABC Store',
    newCommission: 20
  },
  timestamp: Date
}
```

## Best Practices

### Setting Commission Rates

1. **New Vendors**: Start with default 15%
2. **Top Performers**: Reward with lower commission (10-12%)
3. **High Volume**: Negotiate volume-based rates
4. **Premium Brands**: May require lower commission (8-10%)
5. **Niche Products**: Higher commission acceptable (20-25%)

### Product-Level Overrides

Use product commissions for:
- **Promotions**: Lower commission to boost sales
- **Clearance**: Higher commission to move inventory
- **New Launches**: Attract vendors with lower rates
- **High Margin**: Take more from luxury items

### Communication

When changing commissions:
1. Notify vendor via email/notification
2. Explain reason for change
3. Document in vendor notes
4. Update vendor agreement if needed

## Reporting & Analytics

### Commission Reports

**Platform Revenue by Vendor:**
```javascript
// MongoDB Aggregation
db.commissions.aggregate([
  { $match: { type: 'vendor', status: 'paid' } },
  { $group: {
      _id: '$subjectId',
      totalCommission: { $sum: '$amount' },
      orderCount: { $sum: 1 }
    }
  },
  { $sort: { totalCommission: -1 } }
])
```

**Vendor Earnings:**
```javascript
// For each vendor
const totalSales = await Order.aggregate([
  { $match: { 'items.vendorId': vendorId, status: 'delivered' } },
  { $unwind: '$items' },
  { $match: { 'items.vendorId': vendorId } },
  { $group: {
      _id: null,
      total: { $sum: { $multiply: ['$items.priceSnapshot', '$items.qty'] } }
    }
  }
]);

const commissions = await Commission.find({
  subjectId: vendorId,
  type: 'vendor',
  status: 'paid'
});

const platformCommission = commissions.reduce((sum, c) => sum + c.amount, 0);
const vendorEarnings = totalSales[0].total - platformCommission;
```

## Troubleshooting

### Commission Not Updating

**Problem**: Changed commission but old rate still applies

**Solution**:
- Commission only affects NEW orders
- Existing orders keep original commission rate
- Check order was placed AFTER commission change

### Incorrect Commission Amount

**Problem**: Commission calculation seems wrong

**Solution**:
1. Check product-level commission override
2. Verify vendor commission setting
3. Check commission record in database
4. Review calculation: `amount = (price × qty × rate) / 100`

### Cannot Update Commission

**Problem**: Save button doesn't work or shows error

**Solution**:
1. Ensure value is between 0-100
2. Check admin permissions
3. Verify vendor exists and is not deleted
4. Check browser console for errors

## Future Enhancements

Potential features to add:

1. **Tiered Commissions**: Different rates based on sales volume
2. **Category-Based**: Different rates per product category
3. **Time-Limited**: Temporary commission adjustments
4. **Automated Adjustments**: Based on performance metrics
5. **Commission Analytics Dashboard**: Visual reports and trends
6. **Bulk Commission Updates**: Update multiple vendors at once
7. **Commission Templates**: Pre-defined commission structures
8. **Negotiation Workflow**: Vendors request commission changes

## API Reference

### Get Vendor Commission

```http
GET /api/admin/vendors/:vendorId
```

Response includes `defaultCommissionPercentage` field.

### Update Vendor Commission

```http
PUT /api/admin/vendors/:vendorId/commission
Content-Type: application/json

{
  "defaultCommissionPercentage": 20
}
```

### Get Commission Records

```http
GET /api/admin/commissions?vendorId=:vendorId&status=pending
```

## Support

For questions or issues:
- Check this documentation
- Review code in `models/Vendor.js` and `controllers/adminController.js`
- Test with sample vendor and orders
- Contact development team for technical support
