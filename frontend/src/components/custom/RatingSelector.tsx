"use client"

import React, { useState, useEffect } from "react"
import { Star } from "lucide-react"
import {
  submitRating,
  fetchParkingSpace,
  fetchUserRatings,
  selectUserRatingForSpace,
} from "@/features/parking-space/parkingSpaceSlice"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAppDispatch, useAppSelector } from "@/store/hooks"

const StarRatingInput = ({
  value,
  onChange,
  disabled,
  originalValue,
}: {
  value: number | null
  onChange: (rating: number) => void
  disabled?: boolean
  originalValue: number
}) => {
  value = value ?? 0
  const [hoverValue, setHoverValue] = useState<number | null>(null)

  const handleStarClick = (rating: number) => {
    if (!disabled) {
      // If clicking the same star that's currently selected, revert to original value
      if (value === rating) {
        onChange(originalValue)
      } else {
        onChange(rating)
      }
    }
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "w-6 h-6 cursor-pointer transform transition-all duration-200",
            (hoverValue !== null ? star <= hoverValue : star <= value)
              ? "text-yellow-400 fill-yellow-400 scale-110"
              : "text-gray-300 hover:scale-105",
            disabled && "cursor-not-allowed opacity-50",
            "hover:rotate-[8deg]",
          )}
          onMouseEnter={() => !disabled && setHoverValue(star)}
          onMouseLeave={() => !disabled && setHoverValue(null)}
          onClick={() => handleStarClick(star)}
        />
      ))}
    </div>
  )
}

const RatingSelector = ({ parkingSpaceId }: { parkingSpaceId: string }) => {
  const dispatch = useAppDispatch()
  const userRating = useAppSelector((state) =>
    selectUserRatingForSpace(state, parkingSpaceId),
  )
  const [availabilityRating, setAvailabilityRating] = useState(
    userRating.availability_rating,
  )
  const [cleanlinessRating, setCleanlinessRating] = useState(
    userRating.cleanliness_rating,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      // @ts-ignore
      const result = await dispatch(fetchParkingSpace(parkingSpaceId))
      if (fetchParkingSpace.rejected.match(result)) {
        toast({
          title: "Error",
          description: "Failed to load parking space.",
          variant: "destructive",
        })
      }

      // Fetch all user ratings at once
      // @ts-ignore
      const ratingsResult = await dispatch(fetchUserRatings())
      if (fetchUserRatings.rejected.match(ratingsResult)) {
        toast({
          title: "Error",
          description: "Failed to load user ratings.",
          variant: "destructive",
        })
      }
    }

    fetchData()
  }, [dispatch, parkingSpaceId])

  // Check for changes whenever ratings are updated
  useEffect(() => {
    const hasRatingChanges =
      availabilityRating !== (userRating?.availability_rating ?? 0) ||
      cleanlinessRating !== (userRating?.cleanliness_rating ?? 0)
    setHasChanges(hasRatingChanges)
  }, [availabilityRating, cleanlinessRating])

  useEffect(() => {
    setAvailabilityRating(userRating.availability_rating)
    setCleanlinessRating(userRating.cleanliness_rating)
  }, [userRating])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    // @ts-ignore
    const result = dispatch(
      //@ts-ignore
      submitRating({
        parkingSpaceId,
        availabilityRating: availabilityRating || undefined,
        cleanlinessRating: cleanlinessRating || undefined,
      }),
    )

    if (submitRating.fulfilled.match(result)) {
      toast({
        title: "Rating Submitted",
        description: "Thank you for your feedback!",
        variant: "success",
      })
      // @ts-ignore
      dispatch(fetchParkingSpace(parkingSpaceId))
    } else {
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        variant: "destructive",
      })
    }
    setIsSubmitting(false)
  }

  const handleReset = () => {
    setAvailabilityRating(userRating?.availability_rating ?? 0)
    setCleanlinessRating(userRating?.cleanliness_rating ?? 0)
  }

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      <h4 className="text-sm font-medium">Rate your experience</h4>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-600 block mb-1">
            Availability
          </label>
          <StarRatingInput
            value={availabilityRating}
            onChange={setAvailabilityRating}
            disabled={isSubmitting}
            originalValue={userRating?.availability_rating ?? 0}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">
            Cleanliness
          </label>
          <StarRatingInput
            value={cleanlinessRating}
            onChange={setCleanlinessRating}
            disabled={isSubmitting}
            originalValue={userRating?.cleanliness_rating ?? 0}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            (!availabilityRating && !cleanlinessRating) ||
            !hasChanges
          }
          className="flex-1"
          variant="default"
        >
          {isSubmitting ? "Submitting..." : "Submit Rating"}
        </Button>

        {hasChanges && (
          <Button
            onClick={handleReset}
            disabled={isSubmitting}
            variant="outline"
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  )
}

export { RatingSelector, StarRatingInput }
