import { configureStore } from "@reduxjs/toolkit";
import userReducer from "@/features/user/userSlice";
import searchReducer from "@/features/search/searchSlice";
import reservationsReducer from "@/features/reservations/reservationsSlice";
import parkingSpaceReducer from "@/features/parking-space/parkingSpaceSlice";
import ownerReducer from "@/features/owner/ownerSlice";
import carReducer from "@/features/cars/carSlice";
import reservationCarReducer from "@/features/cars/reservationCarSlice";
import addReducer from "@/features/add/addSlice";
import adminReducer from "@/features/admin/adminSlice"; // Import admin slice
import ownerReservationsReducer from "@/features/owner-reservations/ownerReservationsSlice";
import reportReducer from "@/features/reports/reportSlice";
import reportDetailsReducer from "@/features/reports/reportDetailsSlice";
import { customMiddleware } from "./middleware"; // Import your custom middleware
import throttle from "lodash.throttle";
import { saveState, loadState } from "./localStorage";
import ownerSlice from "@/features/owner/ownerSlice";

// Function to create and configure the store
// @ts-ignore
export const createStore = (preloadedState?: Partial<RootState>) => {
  const store = configureStore({
    reducer: {
      // @ts-ignore
      add: addReducer,
      user: userReducer,
      search: searchReducer,
      reservations: reservationsReducer,
      parkingSpace: parkingSpaceReducer,
      owner: ownerReducer,
      cars: carReducer,
      admin: adminReducer,
      reports: reportReducer,
      reportDetails: reportDetailsReducer,
      ownerReservations: ownerReservationsReducer,
      reservationCar: reservationCarReducer
    },
    // @ts-ignore
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(customMiddleware),
    preloadedState: preloadedState || loadState(),
  });

  const throttledSaveState = throttle(() => saveState(store.getState()), 1000);
  store.subscribe(throttledSaveState);

  return store;
};

// Initialize the store for the application
// @ts-ignore
export const store = createStore();

export type AppStore = typeof store;
// @ts-ignore
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
