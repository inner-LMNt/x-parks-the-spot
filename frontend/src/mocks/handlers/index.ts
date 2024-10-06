// src/mocks/handlers/index.ts

import { loginHandler } from './auth/loginHandler';
import { registerHandler } from './auth/registerHandler';
import { resetHandler, resetConfirmHandler } from './auth/resetHandler';
import { searchHandler } from './search/searchHandler';
import { deleteHandler } from './auth/deleteHandler';
import { getFreeSpots } from './user/getFreeSpots';
import { getPaidSpots } from './user/getPaidSpots';

export const handlers = [
  loginHandler,
  deleteHandler,
  registerHandler,
  resetHandler,
  resetConfirmHandler,
  searchHandler,
  getFreeSpots,
  getPaidSpots,
  // Additional handlers
];
