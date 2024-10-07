'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Edit, Trash2 } from 'lucide-react'
import { ParkingSpace } from '@/types/type'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getFreeSpots } from '@/features/user/userSlice'

export default function MySpotsPage() {
  const history = useRouter()
  const dispatch = useAppDispatch()

  const freeParkingSpots = useAppSelector(state => state.user.myFreeSpots)

  const [spots, setSpots] = useState<ParkingSpace[]>([])

  const fetchFreeSpots = async () => {
    try {
      dispatch(getFreeSpots({id: '523e4567-e89b-12d3-a456-426614174004'}))
    } catch (error) {
      console.error('Error fetching free spots:', error)
    }
  }

  useEffect(() => {
    fetchFreeSpots()
    console.log("Free Spots:", freeParkingSpots)
  }, [])

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/spots/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setSpots(spots.filter(spot => spot.id !== id))
      } else {
        throw new Error('Failed to delete spot')
      }
    } catch (error) {
      console.error('Error deleting spot:', error)
    }
  }

  const emptySpots = (
    <div className="flex justify-center items-center h-32 w-full bg-gray-100 rounded-lg">
      <p className="text-gray-500">No spots available</p>
    </div>
  )

  return (
    <div className="container mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-6">My Parking Spots</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {freeParkingSpots && freeParkingSpots.length > 0 ? (
            freeParkingSpots.map((spot: ParkingSpace) => (
              <Card key={spot.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {spot.id}
                    <MapPin className={spot.availability_schedule ? "text-green-500" : "text-red-500"} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-2">{spot.location.latitude}, {spot.location.longitude}</p>
                  <p className="mb-2">Type: {spot.is_paid ? 'Paid' : 'Free'}</p>
                  {spot.is_paid && <p className="mb-2">Price: ${spot.pricing_info?.base_price}/hour</p>}
                  <p className="mb-4">Status: {spot.availability_schedule ? 'Available' : 'Unavailable'}</p>
                  <div className="flex justify-between">
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => spot.id && handleDelete(spot.id)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            emptySpots
          )}
        </div>
        <div className="mt-6">
          <Link href="/add">
            <Button>Add New Spot</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};