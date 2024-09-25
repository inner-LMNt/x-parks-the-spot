// src/mocks/handlers/index.ts

import { loginHandler } from './auth/loginHandler';
import { registerHandler } from './auth/registerHandler';
import { resetHandler, resetConfirmHandler } from './auth/resetHandler';
// Import additional handlers as needed

export const handlers = [
  loginHandler,
  registerHandler,
  resetHandler,
  resetConfirmHandler
  // Add additional handlers here
];
