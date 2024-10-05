// src/mocks/handlers/index.ts

import { loginHandler } from './auth/loginHandler';
import { registerHandler } from './auth/registerHandler';
import { resetHandler, resetConfirmHandler } from './auth/resetHandler';
import { searchHandler } from './search/searchHandler';
import { deleteHandler } from './auth/deleteHandler';
import {
  getUserReservationsHandler,
  getReservationByIdHandler,
  createReservationHandler,
  updateReservationHandler,
  getUserCarInfosHandler,
} from './reservations/reservationsHandler';
import {
  getParkingSpaceHandler,
  lockParkingSpaceHandler,
  unlockParkingSpaceHandler,
} from './parking-space/parkingSpaceHandler';


export const handlers = [
  loginHandler,
  deleteHandler,
  registerHandler,
  resetHandler,
  resetConfirmHandler,
  searchHandler,
  getUserReservationsHandler,
  getReservationByIdHandler,
  createReservationHandler,
  updateReservationHandler,
  getParkingSpaceHandler,
  lockParkingSpaceHandler,
  unlockParkingSpaceHandler,
  getUserCarInfosHandler,
];
