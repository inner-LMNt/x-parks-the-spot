// src/mocks/handlers/index.ts

import { loginHandler } from './auth/loginHandler';
import { registerHandler } from './auth/registerHandler';
import { resetHandler, resetConfirmHandler } from './auth/resetHandler';
import { searchHandler } from './search/searchHandler';
// Import additional handlers as needed

export const handlers = [
  loginHandler,
  registerHandler,
  resetHandler,
  resetConfirmHandler,
  searchHandler
  // Add additional handlers here
];
