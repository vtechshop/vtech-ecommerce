// FILE: apps/web/src/assets/store/slices/cartSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/utils/api';

/**
 * Shape we keep in Redux so components never crash
 */
const emptyCart = {
  items: [],
  totals: {
    subtotal: 0,
    discount: 0,
    shipping: 0,
    tax: 0,
    total: 0,
  },
};

const initialState = {
  ...emptyCart,
  loading: false,
  error: null,
};

/**
 * --- Thunks ---
 * These hit the API and normalize the response back into {items, totals}
 * Adjust the endpoints here if your server differs.
 */

// Load current cart
export const loadCart = createAsyncThunk('cart/load', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/cart');
    const data = res?.data?.data || {};
    return {
      items: Array.isArray(data.items) ? data.items : [],
      totals: { ...emptyCart.totals, ...(data.totals || {}) },
    };
  } catch (err) {
    return rejectWithValue(err.response?.data || { message: err.message });
  }
});

// Add item to cart
export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async ({ productId, variantId, quantity = 1 }, { rejectWithValue }) => {
    try {
      // Backend uses /cart/add endpoint
      const res = await api.post('/cart/add', { productId, variantId, quantity });
      const data = res?.data?.data || {};
      return {
        items: Array.isArray(data.items) ? data.items : [],
        totals: { ...emptyCart.totals, ...(data.totals || {}) },
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// Update item quantity
export const updateCartItem = createAsyncThunk(
  'cart/updateItem',
  async ({ itemId, quantity }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/cart/items/${itemId}`, { quantity });
      const data = res?.data?.data || {};
      return {
        items: Array.isArray(data.items) ? data.items : [],
        totals: { ...emptyCart.totals, ...(data.totals || {}) },
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// Remove item from cart
export const removeCartItem = createAsyncThunk(
  'cart/removeItem',
  async (itemId, { rejectWithValue }) => {
    try {
      const res = await api.delete(`/cart/items/${itemId}`);
      const data = res?.data?.data || {};
      return {
        items: Array.isArray(data.items) ? data.items : [],
        totals: { ...emptyCart.totals, ...(data.totals || {}) },
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || { message: err.message });
    }
  }
);

// Clear cart (optional server call; falls back to local clear)
export const clearCart = createAsyncThunk('cart/clear', async (_, { rejectWithValue }) => {
  try {
    const res = await api.delete('/cart');
    const data = res?.data?.data || {};
    return {
      items: Array.isArray(data.items) ? data.items : [],
      totals: { ...emptyCart.totals, ...(data.totals || {}) },
    };
  } catch (err) {
    // If your API doesn’t implement DELETE /cart, just clear locally
    return emptyCart;
  }
});

/**
 * --- Slice ---
 */
const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    const pending = (state) => {
      state.loading = true;
      state.error = null;
    };
    const fulfilled = (state, action) => {
      state.loading = false;
      state.items = action.payload.items ?? [];
      state.totals = { ...emptyCart.totals, ...(action.payload.totals || {}) };
    };
    const rejected = (state, action) => {
      state.loading = false;
      state.error = action.payload?.error || action.payload || { message: 'Request failed' };
    };

    builder
      .addCase(loadCart.pending, pending)
      .addCase(loadCart.fulfilled, fulfilled)
      .addCase(loadCart.rejected, rejected)

      .addCase(addToCart.pending, pending)
      .addCase(addToCart.fulfilled, fulfilled)
      .addCase(addToCart.rejected, rejected)

      .addCase(updateCartItem.pending, pending)
      .addCase(updateCartItem.fulfilled, fulfilled)
      .addCase(updateCartItem.rejected, rejected)

      .addCase(removeCartItem.pending, pending)
      .addCase(removeCartItem.fulfilled, fulfilled)
      .addCase(removeCartItem.rejected, rejected)

      .addCase(clearCart.pending, pending)
      .addCase(clearCart.fulfilled, fulfilled)
      .addCase(clearCart.rejected, rejected);
  },
});

export default cartSlice.reducer;
