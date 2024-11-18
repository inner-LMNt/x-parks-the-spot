// src/pages/bookings.tsx

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  bookParkingSpace,
  resetError,
  fetchUserReservations,
} from "@/features/reservations/reservationsSlice";
import {
  fetchParkingSpace,
  unlockParkingSpace,
  lockParkingSpace,
} from "@/features/parking-space/parkingSpaceSlice";
import { fetchUserCars } from "@/features/cars/carSlice";
import {
  ReservationCreateRequest,
  Reservation,
  CarInfo,
  TimeSlot,
} from "@/types/type";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  DollarSign,
  Clock,
  Star,
  Calendar,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddCarModal from "@/components/custom/AddCarModal";
import Link from "next/link";
import ImageWrapper from "@/components/custom/ImageWrapper";
import { RatingDisplay } from "@/components/custom/RatingDisplay";

/**
 * **Booking Page Component**
 */
export default function ParkingSpaceBooking() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddCarModalOpen, setIsAddCarModalOpen] = useState(false); // State to control modal
  const [showFullImage, setShowFullImage] = useState(false);
  const params = useParams();
  const parkingSpaceId = (params?.["parking-space-id"] as string) ?? "invalid";
  const router = useRouter();
  const searchParams = useSearchParams();
  const previousUrl = searchParams?.get("previousUrl") ?? "/bookings";

  const dispatch = useAppDispatch();
  const parkingSpace = useAppSelector(
    (state) => state.parkingSpace.parkingSpace,
  );
  const loading = useAppSelector((state) => state.parkingSpace.loading);
  const error = useAppSelector((state) => state.parkingSpace.error);
  const lockStatus: string = useAppSelector(
    (state) => state.parkingSpace.lockStatus,
  );
  const lockExpiresAt = useAppSelector(
    (state) => state.parkingSpace.lockExpiresAt,
  );
  const bookingError = useAppSelector((state) => state.parkingSpace.error);
  const userReservations = useAppSelector((state) =>
    state.reservations.reservations.filter(
      (r: Reservation) => r.parking_space_id === parkingSpaceId,
    ),
  );
  const carInfos = useAppSelector((state) => state.cars.cars); // Use cars from carSlice
  const carLoading = useAppSelector((state) => state.cars.loading);
  const carError = useAppSelector((state) => state.cars.error);

  // Authentication Check
  const isLoggedIn = useAppSelector((state) => state.user.isLoggedIn);
  const userId = useAppSelector((state) => state.user.id); // Assuming user ID is stored here

  const [booking, setBooking] = useState<ReservationCreateRequest>({
    parking_space_id: parkingSpaceId,
    start_time: "",
    end_time: "",
    car_info_id: "",
    renter_id: userId, // Dynamically set the authenticated user ID
  });

  /**
   * **Fetch Parking Space Details and User's Car Info**
   */
  useEffect(() => {
    // @ts-ignore
    dispatch(fetchParkingSpace(parkingSpaceId));
    // @ts-ignore
    dispatch(fetchUserCars()); // Fetch cars from carSlice
  }, [dispatch, parkingSpaceId]);

  /**
   * **Open AddCarModal if No Cars Exist**
   */
  useEffect(() => {
    if (!carLoading && carInfos.length === 0) {
      setIsAddCarModalOpen(true);
    }
  }, [carLoading, carInfos.length]);

  /**
   * **Handle Booking Errors**
   */
  useEffect(() => {
    if (bookingError) {
      toast({
        title: "Booking Failed",
        description: bookingError,
        variant: "destructive",
      });
      dispatch(resetError());
    }
  }, [bookingError, dispatch]);

  /**
   * **Handle Input Changes**
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setBooking((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * **Check if Booking is 24 Hours**
   */
  const is24Hours = (
    start: string | undefined,
    end: string | undefined,
  ): boolean => {
    if (!start || !end) {
      return false;
    }
    return start === end;
  };

  /**
   * **Validate Date String**
   */
  const isValidDate = (dateString: string | undefined): boolean => {
    if (!dateString) {
      return false;
    }
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  /**
   * **Handle Form Submission**
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); // Mark the form as submitting

    // Validate input fields
    if (!booking.car_info_id) {
      toast({
        title: "Car Not Selected",
        description: "Please select a car before proceeding with the booking.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    if (!isValidDate(booking.start_time) || !isValidDate(booking.end_time)) {
      toast({
        title: "Invalid Date",
        description: "Please enter valid start and end times.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Check if it's a 24-hour booking
    if (!is24Hours(booking.start_time, booking.end_time)) {
      // Not a 24-hour booking, validate end_time > start_time
      if (new Date(booking.end_time) <= new Date(booking.start_time)) {
        toast({
          title: "Invalid Time",
          description: "End time must be after start time.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Additionally, ensure duration is at least one hour
      const durationMinutes =
        (new Date(booking.end_time).getTime() -
          new Date(booking.start_time).getTime()) /
        (1000 * 60);
      if (durationMinutes > 0 && durationMinutes < 60) {
        toast({
          title: "Invalid Duration",
          description: "Booking duration must be at least one hour.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
    }

    const startDateTime = new Date(booking.start_time).toISOString();
    const endDateTime = is24Hours(booking.start_time, booking.end_time)
      ? new Date(booking.start_time).toISOString() // For 24-hour booking, end_time same as start_time
      : new Date(booking.end_time).toISOString();

    const reservationRequest: ReservationCreateRequest = {
      parking_space_id: booking.parking_space_id,
      start_time: startDateTime,
      end_time: endDateTime,
      car_info_id: booking.car_info_id,
      renter_id: booking.renter_id,
    };

    const resultAction = await dispatch(bookParkingSpace(reservationRequest));
    if (bookParkingSpace.fulfilled.match(resultAction)) {
      // Booking successful
      toast({
        title: "Booking Successful",
        description: "Your reservation has been confirmed.",
        variant: "success",
      });
      router.push("/bookings");
    } else {
      // Booking failed
      const errormsg = useAppSelector((state) => state.reservations.error);
      toast({
        title: "Booking Failed",
        description: errormsg || "Unable to complete your booking.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false); // Reset the submitting state
  };

  /**
   * **Calculate Total Price**
   */
  const calculateTotal = (): number => {
    if (
      !booking.start_time ||
      !booking.end_time ||
      !parkingSpace?.pricing_info?.base_price
    ) {
      return 0;
    }
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    let price = hours * parkingSpace.pricing_info.base_price;

    if (
      parkingSpace.pricing_info.dynamic_pricing &&
      parkingSpace.pricing_info.dynamic_pricing_algorithm
    ) {
      switch (parkingSpace.pricing_info.dynamic_pricing_algorithm) {
        case "peak_hours":
          price *= 1.2;
          break;
        case "off_peak":
          price *= 0.9;
          break;
        default:
          break;
      }
    }

    return price > 0 ? price : 0;
  };

  /**
   * **Render Availability Schedule**
   */
  const renderAvailability = (): JSX.Element | string => {
    if (
      parkingSpace.availability_schedule &&
      parkingSpace.availability_schedule.length > 0
    ) {
      return parkingSpace.availability_schedule.map(
        (schedule: TimeSlot, index: number) => {
          const { day_of_week, start_time, end_time } = schedule;

          if (start_time === end_time && start_time === "00:00") {
            return (
              <div
                key={`${day_of_week}-${index}`}
                className="flex items-center"
              >
                <Clock className="w-5 h-5 text-blue-500 mr-1" />
                <span className="text-sm">{day_of_week}: 24 hours</span>
              </div>
            );
          }

          // Function to format "HH:mm" to "p" format
          const formatTime = (time: string): string => {
            const [hour, minute] = time.split(":").map(Number);
            const date = new Date();
            date.setHours(hour, minute, 0, 0);
            return format(date, "p"); // e.g., "12:00 AM"
          };

          const timeRange = `${formatTime(start_time)} - ${formatTime(end_time)}`;

          return (
            <div key={`${day_of_week}-${index}`} className="flex items-center">
              <Clock className="w-5 h-5 text-blue-500 mr-1" />
              <span className="text-sm">
                {day_of_week}: {timeRange}
              </span>
            </div>
          );
        },
      );
    }
    return "No availability schedule";
  };

  /**
   * **Render Loading State**
   */
  if (loading || carLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  /**
   * **Render Error State**
   */
  if (error || carError) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-red-500">Error: {error || carError}</p>
        <Button
          onClick={() => {
            // @ts-ignore
            dispatch(fetchParkingSpace(parkingSpaceId));
            // @ts-ignore
            dispatch(fetchUserCars());
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  /**
   * **Render No Parking Space Found**
   */
  if (!parkingSpace) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>No parking space found.</p>
      </div>
    );
  }

  /**
   * **Authentication Check**
   */
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-900">
        <p className="text-xl">
          Please{" "}
          <Link href="/login" className="text-blue-500 underline">
            log in
          </Link>{" "}
          to view your profile.
        </p>
      </div>
    );
  }

  /**
   * **Main Component Render**
   */
  return (
    <div className="container mx-auto p-4 max-w-md">
      <Card className="shadow-lg">
        <CardHeader className="pb-2 flex items-center">
          <Button
            variant="ghost"
            onClick={() => router.push(previousUrl)}
            className="mr-2"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex flex-col space-y-1.5">
            <CardTitle className="text-2xl">
              {parkingSpace.location.address}
            </CardTitle>
            <p className="text-sm text-muted-foreground flex items-center">
              <MapPin className="w-4 h-4 mr-1" />{" "}
              {parkingSpace.location.address}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {parkingSpace.photos && (
            <div
              className="relative w-full h-48 my-2 shadow-md rounded-md cursor-pointer"
              onClick={() => setShowFullImage(true)}
            >
              <ImageWrapper
                src={parkingSpace.photos[0]} // Can be relative; ImageWrapper handles absolute URL
                alt={parkingSpace.name || "Parking Spot Image"}
                layout="fill"
                objectFit="cover"
                className="w-full h-48 object-cover rounded-md"
              />
            </div>
          )}
          {showFullImage && (
            <div
              className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-10"
              onClick={() => setShowFullImage(false)}
            >
              <ImageWrapper
                src={parkingSpace.photos[0]} // Can be relative; ImageWrapper handles absolute URL
                alt={parkingSpace.name || "Parking Spot Image"}
                layout="fill"
                objectFit="contain"
                className="max-w-full max-h-full"
              />
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <RatingDisplay parkingSpace={parkingSpace} />
            <Badge variant="default">Available</Badge>
          </div>
          <Separator className="my-4" />
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-green-600 mr-1" />
                <span className="font-semibold">
                  ${parkingSpace.pricing_info?.base_price ?? "???"}/hour
                </span>
              </div>
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-blue-500 mr-1" />
                <span className="text-sm">See availability below</span>
              </div>
            </div>
            <ScrollArea className="h-20 rounded-md border p-2">
              <p className="text-sm text-muted-foreground">
                {parkingSpace.cancellation_policy}
              </p>
            </ScrollArea>
            <div>
              <h3 className="font-semibold mb-2 text-sm">Features:</h3>
              <div className="flex flex-wrap gap-2">
                {parkingSpace.features?.map((feature: string) => (
                  <Badge key={feature} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
            {/* Render All Availability Schedules */}
            <div>
              <h3 className="font-semibold mb-2 text-sm">Availability:</h3>
              {renderAvailability()}
            </div>
          </div>
        </CardContent>
        <Separator className="my-2" />
        {userReservations.length > 0 && (
          <CardContent>
            <h3 className="font-semibold mb-2 text-lg">
              Your Previous Reservations:
            </h3>
            <div className="space-y-2">
              {userReservations.map((reservation: Reservation) => (
                <div
                  key={reservation.id}
                  className="text-sm border p-2 rounded-md text-wrap"
                >
                  <p>
                    <strong>Start Time:</strong>{" "}
                    {isValidDate(reservation.start_time)
                      ? format(
                          new Date(reservation.start_time as string),
                          "PPp",
                        )
                      : "N/A"}
                  </p>
                  <p>
                    <strong>End Time:</strong>{" "}
                    {isValidDate(reservation.start_time) &&
                    isValidDate(reservation.end_time)
                      ? format(new Date(reservation.end_time as string), "PPp")
                      : "N/A"}
                  </p>
                  <p>
                    <strong>License Plate:</strong>{" "}
                    {/* Should never need to reduce, but if id are same somehow, we reduce by licence plate */}
                    {carInfos
                      .filter(
                        (carInfo: CarInfo) =>
                          carInfo.id === reservation.car_info_id,
                      )
                      .reduce((a: CarInfo, b: CarInfo) =>
                        a.license_plate > b.license_plate ? a : b,
                      ).license_plate || "N/A"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        )}
        <Separator className="my-2" />
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time" className="text-sm font-medium">
                  Start Date & Time
                </Label>
                <div className="relative">
                  {/* <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /> */}
                  <Input
                    id="start_time"
                    name="start_time"
                    type="datetime-local"
                    value={booking.start_time}
                    onChange={handleChange}
                    className=""
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time" className="text-sm font-medium">
                  End Date & Time
                </Label>
                <div className="relative">
                  {/* <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /> */}
                  <Input
                    id="end_time"
                    name="end_time"
                    type="datetime-local"
                    value={booking.end_time}
                    onChange={handleChange}
                    className=""
                    min={
                      booking.start_time ||
                      new Date().toISOString().slice(0, 16)
                    }
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="car_info_id" className="text-sm font-medium">
                Select Car
              </Label>
              <Select
                name="car_info_id"
                value={booking.car_info_id}
                onValueChange={(value) =>
                  setBooking((prev: ReservationCreateRequest) => ({
                    ...prev,
                    car_info_id: value,
                  }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your car" />
                </SelectTrigger>
                <SelectContent>
                  {carInfos.map((car: CarInfo) => (
                    <SelectItem
                      key={car.id ?? "no-id"}
                      value={car.id ?? "no-id"}
                    >
                      {`${car.color ? `${car.color} ` : ""}${car.make} ${car.model} (${car.license_plate})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full flex justify-between items-center mt-4">
              <div className="text-lg font-semibold">Total:</div>
              <div className="text-2xl font-bold">
                ${calculateTotal().toFixed(2)}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-4"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Book Now"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* AddCarModal Component */}
      <AddCarModal
        isOpen={isAddCarModalOpen}
        onClose={() => setIsAddCarModalOpen(false)}
      />
    </div>
  );
}
