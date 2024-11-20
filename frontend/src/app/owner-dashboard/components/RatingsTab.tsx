"use client"

import React, { useState } from "react"
import { Star } from "lucide-react"
import { motion } from "framer-motion"

interface RatingDistribution {
  stars: number
  count: number
  percentage: number
}

interface RatingsBySpot {
  spotId: string
  spotName: string
  availabilityRating: number
  cleanlinessRating: number
  totalRating: number
  ratingCount: number
  ratingDistribution: RatingDistribution[]
  recentReviews: any[]
}

interface RatingMetrics {
  averageRatings: {
    availability: number
    cleanliness: number
    total: number
  }
  totalRatings: number
  ratingsBySpot: RatingsBySpot[]
}

interface RatingsTabProps {
  ratingMetrics?: RatingMetrics
}

interface ParkingSpotCardProps {
  spotName: string
  onClose: () => void
}

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          className={`w-3 h-3 ${
            index <= Math.round(rating) ? "fill-yellow-400" : "fill-gray-200"
          }`}
          strokeWidth={0}
        />
      ))}
    </div>
  )
}

const ParkingSpotCard: React.FC<ParkingSpotCardProps> = ({
  spotName,
  onClose,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
    >
      <div className="bg-white p-4 rounded-lg shadow-lg relative w-80">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
        >
          &times;
        </button>
        <h2 className="text-lg font-semibold text-slate-950">{spotName}</h2>
      </div>
    </motion.div>
  )
}

const RatingsTab: React.FC<RatingsTabProps> = ({ ratingMetrics }) => {
  const [openSpotId, setOpenSpotId] = useState<string | null>(null)

  if (!ratingMetrics) {
    return <p className="text-gray-500">No rating metrics available.</p>
  }

  const { averageRatings, totalRatings, ratingsBySpot } = ratingMetrics

  return (
    <div className="space-y-6">
      {/* Overall Ratings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-slate-950">
          Overall Ratings
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-gray-600">Availability</p>
            <p className="text-2xl font-bold text-slate-950">
              {Number(averageRatings.availability).toFixed(1)} / 5
            </p>
          </div>
          <div>
            <p className="text-gray-600">Cleanliness</p>
            <p className="text-2xl font-bold text-slate-950">
              {Number(averageRatings.cleanliness).toFixed(1)} / 5
            </p>
          </div>
          <div>
            <p className="text-gray-600">Overall</p>
            <p className="text-2xl font-bold text-slate-950">
              {Number(averageRatings.total).toFixed(1)} / 5
            </p>
          </div>
        </div>
        <p className="mt-4 text-gray-500">Total Ratings: {totalRatings}</p>
      </div>

      {/* Ratings by Spot */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-slate-950">
          Ratings by Spot
        </h2>
        {ratingsBySpot.length === 0 ? (
          <p className="text-gray-500">
            No ratings available for your spots yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spot
                  </th>
                  <th className="p-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="p-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="p-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Dist.
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ratingsBySpot.map((spot) => (
                  <tr key={spot.spotId} className="hover:bg-gray-50">
                    <td className="p-2.5">
                      <button
                        onClick={() => setOpenSpotId(spot.spotId)}
                        className="text-slate-950 hover:text-slate-600 font-medium text-sm"
                      >
                        {spot.spotName.length > 20
                          ? `${spot.spotName.slice(0, 20)}...`
                          : spot.spotName}
                      </button>
                      {openSpotId === spot.spotId && (
                        <ParkingSpotCard
                          spotName={spot.spotName}
                          onClose={() => setOpenSpotId(null)}
                        />
                      )}
                    </td>

                    <td className="p-2.5">
                      <div className="flex flex-col items-center">
                        <div className="text-lg font-bold text-slate-950">
                          {Number(spot.totalRating).toFixed(1)}
                        </div>
                        <StarRating rating={spot.totalRating} />
                        <div className="text-xs text-gray-500 mt-0.5">
                          {spot.ratingCount}
                        </div>
                      </div>
                    </td>

                    <td className="p-2.5">
                      <div className="flex flex-col gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 text-xs text-gray-500">
                              avail
                            </div>
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{
                                  width: `${(spot.availabilityRating / 5) * 100}%`,
                                }}
                              />
                            </div>
                            <div className="text-xs font-medium text-slate-950">
                              {Number(spot.availabilityRating).toFixed(1)}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 text-xs text-gray-500">
                              clean
                            </div>
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{
                                  width: `${(spot.cleanlinessRating / 5) * 100}%`,
                                }}
                              />
                            </div>
                            <div className="text-xs font-medium text-slate-950">
                              {Number(spot.cleanlinessRating).toFixed(1)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-2.5">
                      <div className="space-y-0.5">
                        {spot.ratingDistribution
                          .sort((a, b) => b.stars - a.stars)
                          .map((dist) => (
                            <div
                              key={dist.stars}
                              className="flex items-center gap-1 text-xs"
                            >
                              <div className="w-6 text-slate-950 flex items-center">
                                {dist.stars}
                                <Star
                                  className="w-2 h-2 fill-yellow-400 ml-0.5"
                                  strokeWidth={0}
                                />
                              </div>
                              <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-yellow-400 rounded-full"
                                  style={{ width: `${dist.percentage}%` }}
                                />
                              </div>
                              <div className="w-8 text-[10px] text-slate-950">
                                {dist.count}
                              </div>
                            </div>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default RatingsTab
