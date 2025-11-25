// apps/web/src/assets/store/index.js
import { configureStore } from '@reduxjs/toolkit';

import cartReducer from './slices/cartSlice';
import authReducer from './slices/authSlice';
import consentReducer from './slices/consentSlice';
import chatReducer from './slices/chatSlice'; // <-- add

const store = configureStore({
  reducer: {
    cart: cartReducer,
    auth: authReducer,
    consent: consentReducer,
    chat: chatReducer, // <-- wire it
  },
});

export default store;
