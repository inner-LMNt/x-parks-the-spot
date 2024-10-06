import { http, HttpResponse } from "msw";
import { SpotFinderProfile, ParkingSpace } from "@/types/type";
import { userSubmissions } from "../../data/parking/parkingData";


export const getPaidSpots = http.get<never, SpotFinderProfile, ParkingSpace[]>(
  "v1/user/getPaidSpots",
  async ({ request }) => {
    const url = new URL(request.url);
    const owner_id = url.searchParams.get("owner_id");
    console.log("Paid Spots request:", { owner_id });

    const result = userSubmissions(owner_id ?? "");

    console.log("Paid Spots result:", result);

    return HttpResponse.json<ParkingSpace[]>(result, { status: 200 });
  }
);
