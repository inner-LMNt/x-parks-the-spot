// src/mocks/handlers/search/searchHandler.ts

import { http, HttpResponse } from "msw";
import { ParkingSpace, SearchRequest } from "@/types/type";
import { findParking } from "../../data/parking/parkingData";

/**
 * Handler for POST /parking/search
 */
export const searchHandler = http.post<never, SearchRequest>(
  "v1/search/spots",
  async ({ request }) => {
    const data = await request.json();
    console.log("Search request:", data);

    // Simulate finding parking spots based on the search criteria
    let spots: ParkingSpace[] = [];

    if (
      data.latitude !== undefined &&
      data.longitude !== undefined &&
      data.radius !== undefined
    ) {
      spots = findParking(data.latitude, data.longitude, data.radius);
    }

    if (spots.length > 0) {
      return HttpResponse.json<ParkingSpace[]>(spots, { status: 200 });
    } else {
      return HttpResponse.json(
        { message: "No parking spots found" },
        { status: 404 }
      );
    }
  }
);
