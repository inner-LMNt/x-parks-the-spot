"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { format, parseISO } from "date-fns"
import {
  CalendarDays,
  Clock,
  MapPin,
  Car,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Mail,
  User,
  X,
  Repeat,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CancelReservationButton } from "./CancelReservationButton"
import { rateRenter, getRating } from "@/features/owner/ownerSlice"
import { StarRatingInput } from "@/components/custom/RatingSelector"

interface BookingDetails {
  id: string
  spotId: string
  spotName: string
  renterName: string
  renterEmail: string
  startTime: string
  endTime: string
  status: "booked" | "current" | "completed" | "canceled"
  price: number
  duration: number
  time_status: "upcoming" | "current" | "past"
  isMultiDay: boolean
  daysDuration: number
  rentalCount: number
  carDetails: {
    make: string
    model: string
    color: string
    plate: string
  }
}

interface BookingDetailCardProps {
  isOpen: boolean
  onClose: () => void
  booking: BookingDetails
}

const BookingDetailCard = ({
  isOpen,
  onClose,
  booking,
}: BookingDetailCardProps) => {
  const [isCarExpanded, setIsCarExpanded] = useState(false)
  const [rating, setRating] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dispatch = useAppDispatch()

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = "unset"
      }
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [onClose])

  useEffect(() => {
    //@ts-ignore
    const fetchScore = async () => {
      setIsSubmitting(true)

      const resultAction = await dispatch(
        getRating({ reservationId: booking.id }),
      )
      const { score } = resultAction.payload
      setRating(score)
      setIsSubmitting(false)
    }
    fetchScore()
  }, [])

  useEffect(() => {
    if (rating != 0) {
      dispatch(rateRenter({ reservationId: booking.id, score: rating }))
    }
  }, [rating])

  const getStatusBadgeVariant = (status: string, timeStatus: string) => {
    if (status === "canceled") return "destructive"
    switch (timeStatus) {
      case "current":
        return "default"
      case "upcoming":
        return "secondary"
      case "past":
        return "outline"
      default:
        return "outline"
    }
  }

  const formatDuration = (
    duration: number,
    isMultiDay: boolean,
    daysDuration: number,
  ) => {
    if (isMultiDay) {
      return `${daysDuration} day${daysDuration !== 1 ? "s" : ""}`
    }
    return `${duration.toFixed(1)} hours`
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40"
          />

          {/* Card Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="rounded-lg shadow-xl max-w-lg max-h-[90vh] w-[90vw] overflow-y-auto z-[100]"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="shadow-xl w-full overflow-hidden">
              <CardHeader className="relative border-b">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="flex items-center justify-between pr-8">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    {booking.spotName}
                  </CardTitle>
                  <Badge
                    variant={getStatusBadgeVariant(
                      booking.status,
                      booking.time_status,
                    )}
                  >
                    {booking.status === "canceled"
                      ? "Canceled"
                      : booking.time_status.charAt(0).toUpperCase() +
                      booking.time_status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent
                className="p-6 overflow-y-auto"
                style={{ maxHeight: "calc(90vh - 100px)" }}
              >
                <div className="space-y-6">
                  {/* Renter Information */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{booking.renterName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{booking.renterEmail}</span>
                    </div>
                    {booking.rentalCount > 1 && (
                      <div className="flex items-center gap-2">
                        <Repeat className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          Repeat customer ({booking.rentalCount}x)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Timing and Duration */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CalendarDays className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div className="text-sm space-y-1">
                        <div>
                          From: {format(parseISO(booking.startTime), "PPP p")}
                        </div>
                        <div>
                          To: {format(parseISO(booking.endTime), "PPP p")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">
                        Duration:{" "}
                        {formatDuration(
                          booking.duration,
                          booking.isMultiDay,
                          booking.daysDuration,
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">
                      ${booking.price.toFixed(2)}
                    </span>
                  </div>

                  {/* Car Information */}
                  <div className="border rounded-lg p-4">
                    <Button
                      variant="ghost"
                      className="w-full flex items-center justify-between p-2"
                      onClick={() => setIsCarExpanded(!isCarExpanded)}
                    >
                      <span className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        <span className="font-medium">Vehicle Information</span>
                      </span>
                      {isCarExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>

                    <AnimatePresence>
                      {isCarExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 px-2">
                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                              <div className="text-gray-500">Make:</div>
                              <div>{booking.carDetails.make}</div>
                              <div className="text-gray-500">Model:</div>
                              <div>{booking.carDetails.model}</div>
                              <div className="text-gray-500">Color:</div>
                              <div>{booking.carDetails.color}</div>
                              <div className="text-gray-500">
                                License Plate:
                              </div>
                              <div>{booking.carDetails.plate}</div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Rate Renter */}
                  <div>
                    <span className="font-medium">
                      Rate Renter's Responsiveness
                    </span>
                    <StarRatingInput
                      value={rating}
                      onChange={setRating}
                      disabled={isSubmitting}
                      originalValue={rating}
                    />
                  </div>

                  {/* Cancel Button */}
                  {booking.time_status === "upcoming" &&
                    booking.status !== "canceled" && (
                      <div className="pt-4">
                        <CancelReservationButton
                          reservationId={booking.id}
                          onCancelSuccess={onClose}
                        />
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default BookingDetailCard
