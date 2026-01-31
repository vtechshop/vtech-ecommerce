import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cartApi } from '../../api/cart';
import { Cart } from '../../types';

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CartState = {
  cart: null,
  isLoading: false,
  error: null,
};

export const fetchCart = createAsyncThunk('cart/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await cartApi.get();
    return data.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch cart');
  }
});

export const addToCart = createAsyncThunk(
  'cart/add',
  async ({ productId, quantity, variant }: { productId: string; quantity: number; variant?: string }, { rejectWithValue }) => {
    try {
      const { data } = await cartApi.addItem(productId, quantity, variant);
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add item');
    }
  }
);

export const updateCartItem = createAsyncThunk(
  'cart/update',
  async ({ itemId, quantity }: { itemId: string; quantity: number }, { rejectWithValue }) => {
    try {
      const { data } = await cartApi.updateItem(itemId, quantity);
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update item');
    }
  }
);

export const removeCartItem = createAsyncThunk(
  'cart/remove',
  async (itemId: string, { rejectWithValue }) => {
    try {
      const { data } = await cartApi.removeItem(itemId);
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove item');
    }
  }
);

export const applyCoupon = createAsyncThunk(
  'cart/applyCoupon',
  async (code: string, { rejectWithValue }) => {
    try {
      const { data } = await cartApi.applyCoupon(code);
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Invalid coupon');
    }
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearCart: (state) => { state.cart = null; },
  },
  extraReducers: (builder) => {
    const setLoading = (state: CartState) => { state.isLoading = true; state.error = null; };
    const setCart = (state: CartState, action: any) => { state.isLoading = false; state.cart = action.payload; };
    const setError = (state: CartState, action: any) => { state.isLoading = false; state.error = action.payload; };

    builder.addCase(fetchCart.pending, setLoading);
    builder.addCase(fetchCart.fulfilled, setCart);
    builder.addCase(fetchCart.rejected, setError);
    builder.addCase(addToCart.pending, setLoading);
    builder.addCase(addToCart.fulfilled, setCart);
    builder.addCase(addToCart.rejected, setError);
    builder.addCase(updateCartItem.pending, setLoading);
    builder.addCase(updateCartItem.fulfilled, setCart);
    builder.addCase(updateCartItem.rejected, setError);
    builder.addCase(removeCartItem.pending, setLoading);
    builder.addCase(removeCartItem.fulfilled, setCart);
    builder.addCase(removeCartItem.rejected, setError);
    builder.addCase(applyCoupon.pending, setLoading);
    builder.addCase(applyCoupon.fulfilled, setCart);
    builder.addCase(applyCoupon.rejected, setError);
  },
});

export const { clearCart } = cartSlice.actions;
export default cartSlice.reducer;
