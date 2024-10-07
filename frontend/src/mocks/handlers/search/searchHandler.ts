// src/mocks/handlers/search/searchHandler.ts

import { http, HttpResponse } from "msw";
import {ParkingSpace, SearchRequest, SearchResponse} from "@/types/type";
import {findParking, userSubmissions} from "../../data/parking/parkingData";

/**
 * Handler for POST /parking/search
 */
export const searchHandler = http.get<never, SearchRequest, SearchResponse>(
  "v1/search/spots",
  async ({ request }) => {
    const url = new URL(request.url);
    const latitude = parseFloat(url.searchParams.get("latitude") || "0");
    const longitude = parseFloat(url.searchParams.get("longitude") || "0");
    const radius = parseFloat(url.searchParams.get("radius") || "0");

    console.log("Search request:", { latitude, longitude, radius });

    if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) {
      return HttpResponse.json(
        { spots: [] },
        { status: 400 }
      );
    }

    const result = findParking(latitude, longitude, radius);

    console.log("Search result:", result);

    return HttpResponse.json<SearchResponse>({ spots: result }, { status: 200 });
  }
);
export const searchSpots = http.post<never, SearchRequest, { spots: ParkingSpace[] }>(
    "/v1/search",
    async ({ request }) => {
        const searchRequest: SearchRequest = await request.json();
        console.log("Search request:", searchRequest);

        let result = userSubmissions("523e4567-e89b-12d3-a456-426614174004");

        // Filter based on paid_status
        if (searchRequest.paid_status) {
            switch (searchRequest.paid_status) {
                case 'FREE':
                    result = result.filter(spot => !spot.is_paid);
                    break;
                case 'PAID':
                    result = result.filter(spot => spot.is_paid);
                    break;
                // For 'ALL', we don't need to filter
            }
        }

        console.log("Search result:", result);

        return HttpResponse.json({ spots: result }, { status: 200 });
    }
);