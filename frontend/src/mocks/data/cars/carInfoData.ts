// mocks/data/cars/carInfoData.ts

import { CarInfo } from "@/types/type";

export const carInfos: CarInfo[] = [
  {
    id: "car1",
    make: "Toyota",
    model: "Camry",
    year: 2020,
    color: "Blue",
    license_plate: "ABC123",
    license_plate_state: "CA",
  },
  {
    id: "car2",
    make: "Honda",
    model: "Civic",
    year: 2018,
    color: "Red",
    license_plate: "XYZ789",
    license_plate_state: "NY",
  },
  // Add more car infos as needed
];
