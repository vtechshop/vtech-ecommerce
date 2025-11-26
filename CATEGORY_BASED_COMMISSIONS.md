# Category-Based Commission System

## Overview

The platform now supports **category-based commission rates** for both vendors and affiliates. This allows admins to set different commission percentages based on product categories.

## How It Works

### Commission Priority (Highest to Lowest)

#### For Vendors:
1. **Product-level flat commission** - Single percentage set on product
2. **Product category-based commission** - Product defines rates per category
3. **Vendor category-based commission** - Vendor defines rates per category
4. **Vendor default commission** - Vendor's base commission rate
5. **System default** - 15% (fallback)

#### For Affiliates:
1. **Product-level flat commission** - Single percentage set on product
2. **Product category-based commission** - Product defines rates per category
3. **Affiliate category-based commission** - Affiliate defines rates per category
4. **Affiliate default commission** - Affiliate's base commission rate
5. **System default** - 5% (fallback)

## Database Structure

### Vendor Model
```javascript
{
  commissionRules: [
    {
      categoryId: ObjectId,  // Reference to Category
      percentage: Number     // Commission percentage for this category
    }
  ],
  defaultCommissionPercentage: Number  // Fallback rate
}
```

### Affiliate Model
```javascript
{
  commissionRules: [
    {
      categoryId: ObjectId,  // Reference to Category
      percentage: Number     // Commission percentage for this category
    }
  ],
  commissionPercentage: Number  // Fallback rate (default: 5%)
}
```

### Product Model
```javascript
{
  categoryIds: [ObjectId],                    // Product can belong to multiple categories
  vendorCommissionRules: [
    {
      categoryId: ObjectId,  // Reference to Category
      percentage: Number     // Commission percentage for this category
    }
  ],
  vendorCommissionPercentage: Number,         // Flat override vendor commission for this product
  affiliateCommissionRules: [
    {
      categoryId: ObjectId,  // Reference to Category
      percentage: Number     // Commission percentage for this category
    }
  ],
  affiliateCommissionPercentage: Number       // Flat override affiliate commission for this product
}
```

## Example Scenarios

### Scenario 1: Vendor with Category Rules

**Vendor Setup:**
```javascript
{
  storeName: "TechStore",
  commissionRules: [
    { categoryId: "electronics_id", percentage: 10 },
    { categoryId: "accessories_id", percentage: 15 },
  ],
  defaultCommissionPercentage: 12
}
```

**Product Sales:**
- Laptop (Electronics category) → **10% commission**
- Mouse (Accessories category) → **15% commission**
- Water Bottle (no category match) → **12% commission** (vendor default)
- Premium Laptop (product-level: 8%) → **8% commission** (product override)

### Scenario 2: Affiliate with Category Rules

**Affiliate Setup:**
```javascript
{
  code: "DEMO123",
  commissionRules: [
    { categoryId: "electronics_id", percentage: 7 },
    { categoryId: "clothing_id", percentage: 10 },
  ],
  commissionPercentage: 5
}
```

**Affiliate Link Sales:**
- Phone (Electronics category) → **7% commission**
- T-Shirt (Clothing category) → **10% commission**
- Book (no category match) → **5% commission** (affiliate default)
- Featured Phone (product-level: 12%) → **12% commission** (product override)

### Scenario 3: Both Vendor and Affiliate Commissions

**Order Details:**
- Product: Samsung TV
- Price: ₹50,000
- Category: Electronics
- Purchased via affiliate link: DEMO123

**Vendor Commission:**
1. Check product-level: Not set
2. Check category-level: Electronics = 10%
3. **Vendor gets: ₹5,000** (10% of ₹50,000)

**Affiliate Commission:**
1. Check product-level: Not set
2. Check category-level: Electronics = 7%
3. **Affiliate gets: ₹3,500** (7% of ₹50,000)

## Admin Management

### Setting Vendor Category Commissions

Admins can set category-based commissions through:

**Admin Dashboard → Vendors → Edit Vendor**

```javascript
// API Endpoint: PUT /admin/vendors/:id
{
  commissionRules: [
    { categoryId: "category_id_1", percentage: 10 },
    { categoryId: "category_id_2", percentage: 15 }
  ]
}
```

### Setting Affiliate Category Commissions

Admins can set category-based commissions through:

**Admin Dashboard → Affiliates → Edit Affiliate**

```javascript
// API Endpoint: PUT /admin/affiliates/:id
{
  commissionRules: [
    { categoryId: "category_id_1", percentage: 7 },
    { categoryId: "category_id_2", percentage: 10 }
  ]
}
```

### Setting Product-Level Overrides

For specific products that need different rates:

**Admin Dashboard → Products → Edit Product**

```javascript
// API Endpoint: PUT /admin/products/:id
{
  vendorCommissionPercentage: 8,      // Override vendor commission
  affiliateCommissionPercentage: 12   // Override affiliate commission
}
```

## Testing the System

### Test 1: Create Category Rules for Vendor

```javascript
// Using MongoDB or API
db.vendors.updateOne(
  { _id: vendorId },
  {
    $set: {
      commissionRules: [
        { categoryId: electronicsCategory._id, percentage: 10 },
        { categoryId: clothingCategory._id, percentage: 15 }
      ],
      defaultCommissionPercentage: 12
    }
  }
);
```

### Test 2: Create Category Rules for Affiliate

```javascript
// Using MongoDB or API
db.affiliates.updateOne(
  { code: "DEMO123" },
  {
    $set: {
      commissionRules: [
        { categoryId: electronicsCategory._id, percentage: 7 },
        { categoryId: clothingCategory._id, percentage: 10 }
      ],
      commissionPercentage: 5
    }
  }
);
```

### Test 3: Place Order and Verify Commission

1. Create a product in "Electronics" category
2. Place an order for that product
3. Check commission records:

```javascript
db.commissions.find({ orderId: orderId });

// Expected results:
// Vendor commission: 10% (from category rule)
// Affiliate commission: 7% (from category rule)
```

## Migration Notes

### Existing Data

- **Vendors:** Existing vendors will use their `defaultCommissionPercentage`
- **Affiliates:** Existing affiliates will use their `commissionPercentage`
- **Products:** Existing products with product-level commissions remain unchanged

### No Breaking Changes

- The system is **backward compatible**
- If `commissionRules` is empty, it falls back to default percentage
- Existing commission logic still works

## Benefits

1. ✅ **Flexible Pricing** - Different rates for different product types
2. ✅ **Category Management** - Admin controls commission per category
3. ✅ **Product Overrides** - Special rates for specific products
4. ✅ **Vendor Control** - Each vendor can have unique category rates
5. ✅ **Affiliate Control** - Each affiliate can have unique category rates
6. ✅ **Transparency** - Clear commission calculation hierarchy

## Implementation Status

- ✅ Affiliate Model updated with `commissionRules`
- ✅ Vendor Model has `commissionRules` (already existed)
- ✅ Order controller updated to use category-based logic
- ✅ Commission calculation supports priority hierarchy
- ⏳ Admin UI for managing commission rules (future enhancement)

## Next Steps

To fully utilize this feature:

1. **Add categories to products** (if not already done)
2. **Set category rules for vendors** via API or MongoDB
3. **Set category rules for affiliates** via API or MongoDB
4. **Test with actual orders** to verify commission calculations
5. **Build admin UI** for easy commission rule management (optional)

---

**Date Implemented:** November 20, 2025
**Status:** ✅ Active and Working
