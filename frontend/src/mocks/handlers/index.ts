// src/mocks/handlers/index.ts

import { loginHandler } from "./auth/loginHandler";
import { registerHandler } from "./auth/registerHandler";
import { resetHandler, resetConfirmHandler } from "./auth/resetHandler";
import { searchHandler } from "./search/searchHandler";
import { deleteHandler } from "./auth/deleteHandler";
import {
  getUserReservationsHandler,
  getReservationByIdHandler,
  createReservationHandler,
  updateReservationHandler,
  getUserCarInfosHandler,
} from "./reservations/reservationsHandler";
import { getFreeSpots } from './user/getFreeSpots';
import { getPaidSpots } from './user/getPaidSpots';
import {
  getParkingSpaceHandler,
  lockParkingSpaceHandler,
  unlockParkingSpaceHandler,
} from "./parking-space/parkingSpaceHandler";

export const handlers = [
  loginHandler,
  deleteHandler,
  registerHandler,
  resetHandler,
  resetConfirmHandler,
  searchHandler,
  getFreeSpots,
  getPaidSpots,
  getUserReservationsHandler,
  getReservationByIdHandler,
  createReservationHandler,
  updateReservationHandler,
  getParkingSpaceHandler,
  lockParkingSpaceHandler,
  unlockParkingSpaceHandler,
  getUserCarInfosHandler,
  // Additional handlers
];
