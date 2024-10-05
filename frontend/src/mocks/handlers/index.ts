// src/mocks/handlers/index.ts

import { loginHandler } from './auth/loginHandler';
import { registerHandler } from './auth/registerHandler';
import { resetHandler, resetConfirmHandler } from './auth/resetHandler';
import { searchHandler } from './search/searchHandler';
import { deleteHandler } from './auth/deleteHandler';
import {
  getUserReservationsHandler,
  createReservationHandler,
  getUserCarInfosHandler,
  getParkingSpaceHandler,
  lockParkingSpaceHandler,
  unlockParkingSpaceHandler,
} from './reservations/reservationsHandler';


export const handlers = [
  loginHandler,
  deleteHandler,
  registerHandler,
  resetHandler,
  resetConfirmHandler,
  searchHandler,
  getUserReservationsHandler,
  createReservationHandler,
  getUserCarInfosHandler,
  getParkingSpaceHandler,
  lockParkingSpaceHandler,
  unlockParkingSpaceHandler,

  // Additional handlers
];
