"use client"

import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { ImageUpload } from "./ImageUpload"
import { ReservationsGroupSelect } from "./ReservationsGroupSelect"
import { Reservation } from "@/types/type"
import { Input } from "@/components/ui/input"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchReservationCar } from "@/features/cars/reservationCarSlice"

interface RenterOverstayFieldsProps {
  form: any
  handleReservationSelect: (value: string) => void
  imageUploadProps: any // Adjust this according to your actual props
  selectedReservation: Reservation | null
}

export const RenterOverstayFields = ({
  form,
  handleReservationSelect,
  imageUploadProps,
  selectedReservation,
}: RenterOverstayFieldsProps) => {
  const dispatch = useAppDispatch()

  // Fetch car info when a reservation is selected
  useEffect(() => {
    if (selectedReservation && selectedReservation.car_info_id) {
      dispatch(fetchReservationCar(selectedReservation.car_info_id))
    }
  }, [dispatch, selectedReservation])

  // Get car info from Redux store
  const { carInfo, loading: carInfoLoading } = useAppSelector(
    (state) => state.reservationCar,
  )

  const [overstayDuration, setOverstayDuration] = useState<number>(0)
  const [overstayCharge, setOverstayCharge] = useState<number>(0)

  // Use form.watch to subscribe to changes in 'departure_time'
  const departureTimeStr = form.watch("departure_time")

  useEffect(() => {
    if (selectedReservation && departureTimeStr) {
      const departureTime = parseISO(departureTimeStr)
      const endTime = new Date(selectedReservation.end_time)

      // Ensure departureTime is not before reservation end time
      if (departureTime < endTime) {
        setOverstayDuration(0)
        setOverstayCharge(0)
        form.setError("departure_time", {
          type: "manual",
          message: "Departure time cannot be before reservation end time.",
        })
      } else {
        form.clearErrors("departure_time")
        const durationMinutes = Math.max(
          0,
          Math.round((departureTime.getTime() - endTime.getTime()) / 1000 / 60),
        )
        setOverstayDuration(durationMinutes)

        // Calculate the hourly rate
        const reservationDurationHours =
          (new Date(selectedReservation.end_time).getTime() -
            new Date(selectedReservation.start_time).getTime()) /
          (1000 * 60 * 60)

        const hourlyRate = selectedReservation.price / reservationDurationHours
        const charge = ((hourlyRate * 1.5) / 60) * durationMinutes // Charge per minute
        setOverstayCharge(charge)

        // Update the description field
        form.setValue(
          "description",
          `Overstay of ${durationMinutes} minutes detected for reservation ending at ${format(
            endTime,
            "MMM d, yyyy h:mm a",
          )}.`,
        )
      }
    } else {
      // If departure time is not set, reset values
      setOverstayDuration(0)
      setOverstayCharge(0)
    }
  }, [selectedReservation, departureTimeStr, form])

  return (
    <>
      <FormField
        control={form.control}
        name="owner_reservation_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Reported Reservation</FormLabel>
            <FormControl>
              <ReservationsGroupSelect
                onChange={(value) => {
                  field.onChange(value)
                  handleReservationSelect(value)
                }}
                value={field.value}
                title="Reported Reservation"
                isOwnerReservations={true}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Display car info in a compact form */}
      {selectedReservation && carInfo && (
        <div className="mt-2 space-y-1">
          <p className="text-sm font-medium">
            Car: {carInfo.make} {carInfo.model}
          </p>
          <p className="text-sm text-gray-600">
            License Plate: {carInfo.license_plate}
          </p>
        </div>
      )}

      <FormField
        control={form.control}
        name="departure_time"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Departure Time</FormLabel>
            <FormControl>
              <Input
                type="datetime-local"
                {...field}
                onChange={(e) => {
                  field.onChange(e)
                  // No need to handle calculation here since useEffect will handle it
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Display dynamic data compactly */}
      {selectedReservation && departureTimeStr && (
        <div className="mt-2 space-y-1 text-sm">
          <p>
            <strong>Renter:</strong> {selectedReservation.renter_name}
          </p>
          <p>
            <strong>Reservation Time:</strong>{" "}
            {format(
              new Date(selectedReservation.start_time),
              "MMM d, yyyy h:mm a",
            )}{" "}
            -{" "}
            {format(
              new Date(selectedReservation.end_time),
              "MMM d, yyyy h:mm a",
            )}
          </p>
          <p>
            <strong>Overstay Duration:</strong> {overstayDuration} minutes
          </p>
          <p>
            <strong>Overstay Charge:</strong> ${overstayCharge.toFixed(2)}
          </p>
        </div>
      )}

      <FormField
        control={form.control}
        name="image"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Photo Evidence</FormLabel>
            <FormControl>
              <ImageUpload
                {...imageUploadProps}
                onFileSelect={(file) => form.setValue("image", file)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
