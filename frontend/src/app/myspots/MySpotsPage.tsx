'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Edit, Trash2, Plus } from 'lucide-react'
import { ParkingSpace } from '@/types/type'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getOwnerSpots } from '@/features/owner/ownerSlice'
import { set } from 'date-fns'

export default function MySpotsPage() {
    const router = useRouter()
    const dispatch = useAppDispatch()

    const { loading, error } = useAppSelector(state => state.owner) // freeSpots, paidSpots, 

    const [freeSpots, setFreeSpots] = React.useState<ParkingSpace[]>([]) // fake
    const [paidSpots, setPaidSpots] = React.useState<ParkingSpace[]>([]) // fake
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentSpot, setCurrentSpot] = useState<ParkingSpace | null>(null)
    const [editedAddress, setEditedAddress] = useState('')

    const fakeResponse = { // fake
        freeSpots: [
            {
                id: '1',
                is_paid: false,
                location: {
                    address: '1234 Elm St',
                    latitude: 37.7749,
                    longitude: -122.4194,
                },
                availability_schedule: [
                    {
                        day_of_week: "Monday" as const,
                        start_time: '2021-07-10T09:00:00Z',
                        end_time: '2021-07-10T17:00:00Z',
                    },
                ],
            },
            {
                id: '2',
                is_paid: false,
                location: {
                    address: '5678 Oak St',
                    latitude: 37.7749,
                    longitude: -122.4194,
                },
                availability_schedule: [
                    {
                        day_of_week: "Monday" as const,
                        start_time: '2021-07-10T09:00:00Z',
                        end_time: '2021-07-10T17:00:00Z',
                    },
                ],
            },
        ],
        paidSpots: [
            {
                id: '3',
                is_paid: true,
                location: {
                    address: '91011 Pine St',
                    latitude: 37.7749,
                    longitude: -122.4194,
                },
                availability_schedule: [
                    {
                        day_of_week: "Monday" as const,
                        start_time: '2021-07-10T09:00:00Z',
                        end_time: '2021-07-10T17:00:00Z',
                    },
                ],
                pricing_info: {
                    base_price: 10,
                },
            },
            {
                id: '4',
                is_paid: true,
                location: {
                    address: '121314 Maple St',
                    latitude: 37.7749,
                    longitude: -122.4194,
                },
                availability_schedule: [
                    {
                        day_of_week: "Monday" as const,
                        start_time: '2021-07-10T09:00:00Z',
                        end_time: '2021-07-10T17:00:00Z',
                    },
                ],
                pricing_info: {
                    base_price: 15,
                },
            },
        ],
    }

    // useEffect(() => { // real
    //     dispatch(getOwnerSpots({ paid_status: 'ALL' }))
    // }, [dispatch])


    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/spots/${id}`, {
                method: 'DELETE',
            })
            if (response.ok) {
                // You might want to dispatch an action to remove the spot from the state
                console.log('Spot deleted successfully')
                setFreeSpots(freeSpots.filter(spot => spot.id !== id)) // fake
                setPaidSpots(paidSpots.filter(spot => spot.id !== id)) // fake
            } else {
                throw new Error('Failed to delete spot')
            }
        } catch (error) {
            console.error('Error deleting spot:', error)
        }
    }

    useEffect(() => {  // fake
        setFreeSpots(fakeResponse.freeSpots);
        setPaidSpots(fakeResponse.paidSpots);
    }, [])

    const handleEdit = (spot: ParkingSpace) => { // fake
        setCurrentSpot(spot)
        setEditedAddress(spot.location.address || '')
        setIsModalOpen(true)
    }

    const handleSave = () => { // fake
        if (!currentSpot) return
        const updatedSpot = { ...currentSpot, location: { ...currentSpot.location, address: editedAddress } }
        setFreeSpots(freeSpots.map(spot => (spot.id === currentSpot.id ? updatedSpot : spot)))
        setPaidSpots(paidSpots.map(spot => (spot.id === currentSpot.id ? updatedSpot : spot)))
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
            <Link href="/add" className="mt-4">
                <Button variant="outline" className="flex items-center">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Spot
                </Button>
            </Link>
        </motion.div>
    )

    const renderSpots = (spots: ParkingSpace[]) => (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {spots.map((spot) => (
                <motion.div key={spot.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                        <CardHeader className="bg-gray-50">
                            <div className="flex gap-4">
                                <CardTitle className="flex justify-between items-center">
                                    <span className="text-wrap">{spot.location.address || 'Unnamed Spot'}</span>
                                </CardTitle>
                                <MapPin className={`top-0 right-0 ${spot.availability_schedule ? 'text-green-500' : 'text-red-500'}`} />
                            </div>
                            <CardDescription>{`${spot.location.latitude.toFixed(4)}, ${spot.location.longitude.toFixed(4)}`}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-medium">{spot.is_paid ? 'Paid' : 'Free'}</span>
                                <span className={`text-sm font-medium ${spot.availability_schedule ? 'text-green-600' : 'text-red-600'}`}>
                                    {spot.availability_schedule ? 'Available' : 'Unavailable'}
                                </span>
                            </div>
                            {spot.is_paid && spot.pricing_info && (
                                <p className="text-lg font-bold mb-4">${spot.pricing_info.base_price}/hour</p>
                            )}
                            <div className="flex justify-between">
                                {/* <Button variant="outline" size="sm" className="flex-1 mr-2" onClick={() => router.push(`/edit/${spot.id}`)}> */}
                                <Button variant="outline" size="sm" className="flex-1 mr-2" onClick={() => handleEdit(spot)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                </Button>
                                <Button variant="destructive" size="sm" className="flex-1" onClick={() => spot.id && handleDelete(spot.id)}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white shadow-md rounded-lg p-6 mb-8"
                >
                    <h1 className="text-3xl font-bold mb-2 text-black">My Parking Spots</h1>
                    <p className="text-gray-600 mb-6">Manage and track your parking locations</p>

                    {loading ? (
                        <p>Loading...</p>
                        // ) : error ? (
                        //     <p>Error: {error}</p>
                    ) : freeSpots.length === 0 && paidSpots.length === 0 ? (
                        emptySpots
                    ) : (
                        <>
                            {freeSpots.length > 0 && (
                                <>
                                    <h2 className="text-2xl font-bold mb-4 text-gray-900">Free Spots</h2>
                                    {renderSpots(freeSpots)}
                                </>
                            )}

                            {paidSpots.length > 0 && (
                                <>
                                    <h2 className="text-2xl font-bold mb-4 mt-8 text-gray-900">Paid Spots</h2>
                                    {renderSpots(paidSpots)}
                                </>
                            )}
                        </>
                    )}

                    {(freeSpots.length > 0 || paidSpots.length > 0) && (
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

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Edit Spot</h2>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                            Address
                            <input
                                type="text"
                                value={editedAddress}
                                onChange={(e) => setEditedAddress(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                        </label>
                        <div className="flex justify-end mt-4">
                            <Button variant="outline" className="mr-2" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave}>
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}