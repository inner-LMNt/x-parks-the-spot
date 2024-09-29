// src/mocks/handlers/search/searchHandler.ts

import { http, HttpResponse } from "msw";
import { SearchRequest, SearchResponse } from "@/types/type";
import { findParking } from "../../data/parking/parkingData";

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
