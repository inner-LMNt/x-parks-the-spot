import React, { useState } from "react"
import { Star, ChevronDown, X } from "lucide-react"
import { ParkingSpace } from "@/types/type"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface RatingStarsProps {
  rating: number
}

export const RatingStars = ({ rating }: RatingStarsProps) => (
  <div className="flex">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={cn(
          "w-5 h-5 transition-all",
          star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200",
        )}
      />
    ))}
  </div>
)

export const RatingDisplay = ({
  parkingSpace,
}: {
  parkingSpace: ParkingSpace
}): React.JSX.Element => {
  const [showDetails, setShowDetails] = useState(false)

  // If no ratings or unrated
  if (parkingSpace.avg_total_rating === "unrated") {
    return (
      <div className="flex items-center text-gray-500">
        <Star className="w-5 h-5 mr-1" />
        <span>Not yet rated</span>
      </div>
    )
  }

  const totalRatings = Math.max(
    parkingSpace.ratings_count_availability || 0,
    parkingSpace.ratings_count_cleanliness || 0,
  )

  return (
    <>
      <button
        onClick={() => setShowDetails(true)}
        className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center space-x-2">
          <RatingStars rating={parkingSpace.avg_total_rating as number} />
          <span className="text-sm text-gray-600">({totalRatings})</span>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </div>
      </button>

      {/* Overlay Card */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="relative w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={() => setShowDetails(false)}
            >
              <X className="h-4 w-4" />
            </Button>

            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Rating Details</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Total Rating */}
              <div className="flex flex-col items-center space-y-2 pb-4 border-b">
                <span className="text-sm font-medium">Overall Rating</span>
                <RatingStars rating={parkingSpace.avg_total_rating as number} />
                <span className="text-xs text-gray-500">
                  Based on {totalRatings} ratings
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Availability Rating */}
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-sm font-medium">Availability</span>
                  {parkingSpace.avg_availability_rating ? (
                    <>
                      <RatingStars
                        rating={parkingSpace.avg_availability_rating}
                      />
                      <span className="text-xs text-gray-500">
                        {parkingSpace.ratings_count_availability} ratings
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500">Not rated</span>
                  )}
                </div>

                {/* Cleanliness Rating */}
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-sm font-medium">Cleanliness</span>
                  {parkingSpace.avg_cleanliness_rating ? (
                    <>
                      <RatingStars
                        rating={parkingSpace.avg_cleanliness_rating}
                      />
                      <span className="text-xs text-gray-500">
                        {parkingSpace.ratings_count_cleanliness} ratings
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500">Not rated</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
