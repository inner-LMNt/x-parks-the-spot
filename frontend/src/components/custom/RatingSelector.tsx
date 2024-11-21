import React, { useState, useEffect } from "react"
import { Star } from "lucide-react"
import { useDispatch } from "react-redux"
import {
  submitRating,
  fetchParkingSpace,
  fetchUserRating,
} from "@/features/parking-space/parkingSpaceSlice"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAppSelector } from "@/store/hooks"

const StarRatingInput = ({
  value,
  onChange,
  disabled,
  originalValue,
}: {
  value: number
  onChange: (rating: number) => void
  disabled?: boolean
  originalValue: number
}) => {
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
  const dispatch = useDispatch()
  const userRating = useAppSelector((state) => state.parkingSpace.userRating)
  const [availabilityRating, setAvailabilityRating] = useState(0)
  const [cleanlinessRating, setCleanlinessRating] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
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
        setIsLoading(false)
        return
      }
      // @ts-ignore
      const result2 = await dispatch(fetchUserRating(parkingSpaceId))
      if (fetchUserRating.rejected.match(result2)) {
        toast({
          title: "Error",
          description: "Failed to load user rating.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }
      setIsLoading(false)
    }

    fetchData()
  }, [dispatch, parkingSpaceId])

  // Update local state when userRating changes
  useEffect(() => {
    if (userRating) {
      setAvailabilityRating(userRating.availabilityRating ?? 0)
      setCleanlinessRating(userRating.cleanlinessRating ?? 0)
    }
  }, [userRating])

  // Check for changes whenever ratings are updated
  useEffect(() => {
    const hasRatingChanges =
      availabilityRating !== (userRating?.availabilityRating ?? 0) ||
      cleanlinessRating !== (userRating?.cleanlinessRating ?? 0)
    setHasChanges(hasRatingChanges)
  }, [availabilityRating, cleanlinessRating, userRating])

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
    setAvailabilityRating(userRating?.availabilityRating ?? 0)
    setCleanlinessRating(userRating?.cleanlinessRating ?? 0)
  }

  if (isLoading) {
    return <div className="mt-4 text-sm text-gray-600">Loading ratings...</div>
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
            originalValue={userRating?.availabilityRating ?? 0}
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
            originalValue={userRating?.cleanlinessRating ?? 0}
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
