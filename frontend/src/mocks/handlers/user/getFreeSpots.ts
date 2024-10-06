import { http, HttpResponse } from "msw";
import { ParkingSpace, User } from "@/types/type";
import { userSubmissions } from "../../data/parking/parkingData";


export const getFreeSpots = http.get<never, User, ParkingSpace[]>(
  "v1/user/getFreeSpots",
  async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    console.log("Free Spots request:", { id });

    const result = userSubmissions(id ?? "");

    console.log("Free Spots result:", result);

    return HttpResponse.json<ParkingSpace[]>(result, { status: 200 });
  }
);
