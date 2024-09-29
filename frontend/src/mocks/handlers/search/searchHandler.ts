// src/mocks/handlers/search/searchHandler.ts

import { http, HttpResponse } from "msw";
import { ParkingSpace, SearchRequest, SearchResponse } from "@/types/type";
import { findParking } from "../../data/parking/parkingData";

/**
 * Handler for POST /parking/search
 */
export const searchHandler = http.get<SearchResponse, SearchRequest>(
  "v1/search/spots",
  async ({ request }) => {
    const data = await request.json();
    console.log("Search request:", data);

    // Simulate finding parking spots based on the search criteria
    // empty array of parking spaces for search response
    let result: ParkingSpace[] = [];

    if (
      data.latitude !== undefined &&
      data.longitude !== undefined &&
      data.radius !== undefined
    ) {
        result = findParking(data.latitude, data.longitude, data.radius);
    }

    console.log("Search result:", result);

    if (result.length > 0) {
      return HttpResponse.json<SearchResponse>({ spots: result }, { status: 200 });
    } else {
      return HttpResponse.json(
        { spots: [] },
        { status: 404 }
      );
    }
  }
);
