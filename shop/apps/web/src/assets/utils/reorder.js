// FILE: apps/web/src/utils/reorder.js
import api from './api';

/**
 * Reorder all items from a previous order
 * @param {Object} order - The order object to reorder
 * @param {Function} dispatch - Redux dispatch function
 * @param {Function} addToCart - Redux addToCart action
 * @returns {Promise<Object>} Result with success status and message
 */
export const reorderItems = async (order, dispatch, addToCart) => {
  try {
    const results = {
      added: [],
      failed: [],
      outOfStock: [],
    };

    // Get fresh product data to check availability and current prices
    const productIds = order.items.map(item => item.productId);
    const productsResponse = await api.get(`/catalog/products?ids=${productIds.join(',')}`);
    const products = productsResponse.data.data || [];

    // Create a map for quick lookup
    const productMap = new Map(products.map(p => [p._id, p]));

    // Process each item
    for (const item of order.items) {
      const product = productMap.get(item.productId);

      if (!product) {
        results.failed.push({
          item,
          reason: 'Product no longer available',
        });
        continue;
      }

      if (product.stock <= 0) {
        results.outOfStock.push({
          item,
          product,
        });
        continue;
      }

      // Add to cart with the quantity from the original order
      // or max available stock, whichever is lower
      const quantity = Math.min(item.qty, product.stock);

      try {
        await dispatch(addToCart({
          productId: product._id,
          quantity,
          variantId: item.variantId,
        })).unwrap();

        results.added.push({
          item,
          product,
          quantity,
          quantityAdjusted: quantity !== item.qty,
        });
      } catch (error) {
        results.failed.push({
          item,
          product,
          reason: error.message || 'Failed to add to cart',
        });
      }
    }

    return {
      success: results.added.length > 0,
      results,
      message: generateResultMessage(results),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to reorder items',
    };
  }
};

/**
 * Reorder a single item from an order
 * @param {Object} orderItem - The order item to reorder
 * @param {Function} dispatch - Redux dispatch function
 * @param {Function} addToCart - Redux addToCart action
 * @returns {Promise<Object>} Result with success status
 */
export const reorderSingleItem = async (orderItem, dispatch, addToCart) => {
  try {
    // Get fresh product data
    const response = await api.get(`/catalog/products/${orderItem.productId}`);
    const product = response.data.data;

    if (!product) {
      return {
        success: false,
        error: 'Product no longer available',
      };
    }

    if (product.stock <= 0) {
      return {
        success: false,
        error: 'Product is out of stock',
      };
    }

    // Add to cart with original quantity or max available
    const quantity = Math.min(orderItem.qty, product.stock);

    await dispatch(addToCart({
      productId: product._id,
      quantity,
      variantId: orderItem.variantId,
    })).unwrap();

    return {
      success: true,
      product,
      quantity,
      quantityAdjusted: quantity !== orderItem.qty,
      message: quantity !== orderItem.qty
        ? `Added ${quantity} item(s) to cart (${orderItem.qty - quantity} unavailable)`
        : 'Added to cart successfully',
    };
  } catch (error) {
    console.error('Reorder single item error:', error);
    return {
      success: false,
      error: error.message || 'Failed to add item to cart',
    };
  }
};

/**
 * Generate a user-friendly message from reorder results
 */
const generateResultMessage = (results) => {
  const { added, failed, outOfStock } = results;
  const parts = [];

  if (added.length > 0) {
    const adjustedCount = added.filter(a => a.quantityAdjusted).length;
    if (adjustedCount > 0) {
      parts.push(`Added ${added.length} item(s) to cart (${adjustedCount} with adjusted quantities)`);
    } else {
      parts.push(`Successfully added ${added.length} item(s) to cart`);
    }
  }

  if (outOfStock.length > 0) {
    parts.push(`${outOfStock.length} item(s) out of stock`);
  }

  if (failed.length > 0) {
    parts.push(`${failed.length} item(s) could not be added`);
  }

  return parts.join('. ');
};

/**
 * Check if an order can be reordered
 * @param {Object} order - The order to check
 * @returns {boolean}
 */
export const canReorder = (order) => {
  // Can't reorder cancelled or returned orders
  if (['cancelled', 'returned'].includes(order.status)) {
    return false;
  }

  // Must have items
  if (!order.items || order.items.length === 0) {
    return false;
  }

  return true;
};
