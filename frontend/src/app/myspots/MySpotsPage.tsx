'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface Spot {
  id: string
  name: string
  address: string
  type: 'free' | 'rental'
  isAvailable: boolean
  price?: number
}

export default function MySpotsPage() {
  const [spots, setSpots] = useState<Spot[]>([])

  useEffect(() => {
    const fetchSpots = async () => {
      try {
        const response = await fetch('/api/myspots')
        if (response.ok) {
          const data = await response.json()
          setSpots(data)
        } else {
          throw new Error('Failed to fetch spots')
        }
      } catch (error) {
        console.error('Error fetching spots:', error)
      }
    }

    fetchSpots()
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

  return (
    <div className="container mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-6">My Parking Spots</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {spots.map((spot) => (
            <Card key={spot.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {spot.name}
                  <MapPin className={spot.isAvailable ? "text-green-500" : "text-red-500"} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-2">{spot.address}</p>
                <p className="mb-2">Type: {spot.type}</p>
                {spot.type === 'rental' && <p className="mb-2">Price: ${spot.price}/hour</p>}
                <p className="mb-4">Status: {spot.isAvailable ? 'Available' : 'Unavailable'}</p>
                <div className="flex justify-between">
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(spot.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6">
          <Link href="/add">
            <Button>Add New Spot</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}