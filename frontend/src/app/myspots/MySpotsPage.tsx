"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  MapPin,
  Edit,
  Trash2,
  Plus,
  FileCheck2,
  ShieldEllipsis,
  ShieldCheck,
  ShieldX,
  TrendingUp,
} from "lucide-react"
import { ParkingSpace } from "@/types/type"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getOwnerSpots, deleteParkingSpot } from "@/features/owner/ownerSlice"
import verifyParkingSpot from "@/features/owner/ownerSlice"
import ImageWrapper from "@/components/custom/ImageWrapper"
import VerificationModal from "@/components/custom/VerificationModal" // Import the verification modal
import EditSpotModal from "@/components/custom/EditSpotModal"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog" // Import your dialog components

export default function MySpotsPage() {
  const isLoggedIn = useAppSelector((state) => state.user.isLoggedIn)
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { paidSpots, freeSpots, pendingSpots, loading, error } = useAppSelector(
    (state) => state.owner,
  )

  const [verificationModalOpen, setVerificationModalOpen] = useState(false)
  const [currentSpotId, setCurrentSpotId] = useState<string | null>(null)
  const [domLoaded, setDomLoaded] = useState(false)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [spotToDelete, setSpotToDelete] = useState<string | null>(null)

  useEffect(() => {
    setDomLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      //@ts-ignore
      dispatch(getOwnerSpots())
    }
  }, [dispatch, isLoggedIn])

  const openDeleteModal = (id: string) => {
    setSpotToDelete(id)
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setSpotToDelete(null)
    setDeleteModalOpen(false)
  }

  const handleConfirmDelete = async () => {
    if (spotToDelete) {
      // @ts-ignore
      await dispatch(deleteParkingSpot(spotToDelete))
      // @ts-ignore
      dispatch(getOwnerSpots())
      closeDeleteModal()
    }
  }

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpace | null>(null)

  const openModal = (spot: ParkingSpace) => {
    setSelectedSpot(spot)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setSelectedSpot(null)
    setIsModalOpen(false)
  }
  const emptySpots = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col justify-center items-center h-64 w-full bg-white rounded-lg shadow-md"
    >
      <MapPin className="w-16 h-16 text-gray-400 mb-4" />
      <p className="text-gray-500 text-lg">No spots available</p>
      <Link href="/add" className="mt-4 text-slate-950">
        <Button variant="outline" className="flex items-center">
          <Plus className="w-4 h-4 mr-2 " />
          Add Your First Spot
        </Button>
      </Link>
    </motion.div>
  )

  const openVerificationModal = (spotId: string) => {
    setCurrentSpotId(spotId)
    setVerificationModalOpen(true)
  }

  const closeVerificationModal = () => {
    setVerificationModalOpen(false)
    setCurrentSpotId(null)
  }

  const getVerificationStatusIcon = (spot: ParkingSpace) => {
    console.log("next ", spot.verification_status)
    if (spot.verification_status === "verified") {
      // @ts-ignore
      return <ShieldCheck className="w-6 h-6 text-green-500" />
    }
    if (spot.verification_status === "pending") {
      // @ts-ignore
      return <ShieldEllipsis className="w-6 h-6 text-yellow-500" />
    }
    return (
      <ShieldX className="w-6 h-6 text-red-500" aria-label="Not Verified" />
    )
  }

  const renderSpots = (spots: ParkingSpace[]) => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {spots.map((spot) => (
        <motion.div
          key={spot.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
            {/* Display Image if Exists */}
            {spot.photos && (
              <div className="relative w-full h-40">
                <ImageWrapper
                  src={spot.photos[0]}
                  alt={spot.name || "Parking Spot Image"}
                  layout="fill"
                  objectFit="cover"
                  className="w-full h-48 object-cover"
                />
              </div>
            )}

            <CardHeader className="bg-gray-50">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center space-x-2">
                  <MapPin
                    className={`w-5 h-5 ${spot.is_paid ? "text-green-500" : "text-blue-500"}`}
                  />
                  <span>
                    {spot.name || (spot.is_paid ? "Unnamed Spot" : "Free Spot")}
                  </span>
                </CardTitle>
              </div>

              <CardDescription>
                {spot.location?.address ? (
                  <span className="text-sm text-gray-600">
                    {spot.location.address}
                  </span>
                ) : spot.location ? (
                  `${spot.location.latitude.toFixed(4)}, ${spot.location.longitude.toFixed(4)}`
                ) : (
                  "Location not available"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium">
                  {spot.is_paid ? "Paid" : "Free"}
                </span>
                <span
                  className={`text-sm font-medium ${spot.availability_schedule && spot.availability_schedule.length > 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {spot.is_paid
                    ? spot.availability_schedule &&
                      spot.availability_schedule.length > 0
                      ? "Available"
                      : "Unavailable"
                    : "Always Available"}
                </span>
              </div>

              {/* Display price and verification icon */}
              {spot.is_paid && spot.pricing_info && (
                <div className="flex items-center justify-between mb-4">
                  <p className="text-lg font-bold">
                    ${spot.pricing_info.base_price / 100}/hour
                  </p>
                  {getVerificationStatusIcon(spot)}{" "}
                  {/* Verification status icon */}
                </div>
              )}

              {/* Submit Verification Button for Unverified Spots */}
              {spot.verification_status !== "pending" &&
                spot.verification_status !== "verified" &&
                spot.is_paid && (
                  <Button
                    onClick={() => openVerificationModal(spot.id ?? "")}
                    className="mt-2 w-full bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-300 hover:text-gray-900 transition-colors"
                    variant="outline"
                  >
                    <FileCheck2 className="w-4 h-4 mr-2" />
                    Submit Verification
                  </Button>
                )}

              {spot.is_paid && (
                <div className="flex justify-between mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 mr-2"
                    onClick={() => openModal(spot)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => openDeleteModal(spot.id as string)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}

              {/* Redirect Button for Analytics */}
              {spot.is_paid && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex justify-center items-center mt-4 w-full"
                  onClick={() =>
                    router.push(
                      `/owner-dashboard?spotId=${spot.id}&tab=bookings`,
                    )
                  }
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Spot Analytics
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )

  return (
    domLoaded && (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white shadow-md rounded-lg p-6 mb-8"
          >
            <div className="sticky top-0 z-50 bg-white border-b border-gray-200 mb-6">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      My Parking Spots
                    </h1>
                    <p className="text-gray-600 mt-1">
                      Manage and track your parking locations
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto text-sm">
                    <Link
                      href="/owner-dashboard"
                      className="w-full sm:max-w-xs"
                    >
                      <Button
                        variant="outline"
                        className="w-full h-11 bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-900 text-sm overflow-hidden whitespace-normal break-words"
                      >
                        <TrendingUp className="w-4 h-4 mr-2 text-gray-600" />
                        <span>Analytics Dashboard</span>
                      </Button>
                    </Link>
                    <Link href="/add" className="w-full sm:max-w-xs">
                      <Button className="w-full h-11 shadow-sm text-sm overflow-hidden whitespace-normal break-words">
                        <Plus className="w-4 h-4 mr-2" />
                        <span>Add New Spot</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <p>Loading...</p>
            ) : error ? (
              <p className="text-red-500">Error: {error}</p>
            ) : paidSpots.length === 0 &&
              freeSpots.length === 0 &&
              pendingSpots.length === 0 ? (
              emptySpots
            ) : (
              <>
                {freeSpots.length > 0 && (
                  <>
                    <h2 className="text-2xl font-bold mb-4 text-gray-900">
                      Free Spots
                    </h2>
                    {renderSpots(freeSpots)}
                  </>
                )}

                {paidSpots.length > 0 && (
                  <>
                    <h2 className="text-2xl font-bold mb-4 mt-8 text-gray-900">
                      Paid Spots
                    </h2>
                    {renderSpots(paidSpots)}
                  </>
                )}

                {pendingSpots.length > 0 && (
                  <>
                    <h2 className="text-2xl font-bold mb-4 mt-8 text-gray-900">
                      Pending Spots
                    </h2>
                    {renderSpots(pendingSpots)}
                  </>
                )}
              </>
            )}

            {(freeSpots.length > 0 ||
              paidSpots.length > 0 ||
              pendingSpots.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-8"
              >
                <Link href="/add">
                  <Button className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Spot
                  </Button>
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Verification Modal */}
        {currentSpotId && (
          <VerificationModal
            isOpen={verificationModalOpen}
            onClose={closeVerificationModal}
            spotId={currentSpotId}
          />
        )}

        {/* Edit Spot Modal */}
        {selectedSpot && (
          <EditSpotModal
            isOpen={isModalOpen}
            onClose={closeModal}
            spot={selectedSpot}
          />
        )}

        {/* Delete Confirmation Modal */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this parking spot? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={closeDeleteModal}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex h-16"></div>
      </div>
    )
  )
}
