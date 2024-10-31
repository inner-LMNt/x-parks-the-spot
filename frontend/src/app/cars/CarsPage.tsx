'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { CarInfo } from '@/types/type'
import { motion } from 'framer-motion'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { useDispatch, useSelector } from 'react-redux'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchUserCars, deleteCar } from '@/features/cars/carSlice'
import { Car } from 'lucide-react' // Imported FileWarning
import { Button } from '@/components/ui/button'
import AddCarModal from '@/components/custom/AddCarModal'
import EditCarModal from '@/components/custom/EditCarModal'
import { useRouter } from 'next/navigation'

export default function CarsPage() {
  const dispatch = useDispatch()
  const isLoggedIn = useSelector((state: any) => state.user.isLoggedIn)
  const router = useRouter()

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [selectedCar, setSelectedCar] = useState<CarInfo | null>(null)
  const { cars, loading, error } = useAppSelector((state) => state.cars)
  const [isAddCarModalOpen, setIsAddCarModalOpen] = useState(false) // State to control modal
  const [isEditCarModalOpen, setIsEditCarModalOpen] = useState(false)
  const [currentlyEditingCar, setCurrentlyEditingCar] =
    useState<CarInfo | null>(null)

  const openAddCarModal = () => {
    setIsAddCarModalOpen(true)
  }

  const openEditCarModal = (car: CarInfo) => {
    setCurrentlyEditingCar(car)
    setIsEditCarModalOpen(true)
  }

  useEffect(() => {
    if (isLoggedIn) {
      //@ts-ignore
      dispatch(fetchUserCars())
    }
  }, [dispatch, isLoggedIn])

  if (!isLoggedIn) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 text-slate-900'>
        <p className='text-xl'>
          Please{' '}
          <Link href='/login' className='text-blue-500 underline'>
            log in
          </Link>{' '}
          to modify your cars.
        </p>
      </div>
    )
  }

  const renderCars = (cars: CarInfo[]) => (
    <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
      {cars.map((car: CarInfo) => (
        <motion.div
          key={car.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card
            className='overflow-hidden hover:shadow-lg transition-shadow duration-300'
            onClick={() => {
              // @ts-ignore
              dispatch(openEditCarModal(car))
            }}
          >
            <CardHeader className='bg-gray-50'>
              <div className='flex justify-between items-center'>
                <CardTitle className='flex items-center space-x-2'>
                  <span>
                    {car.make} {car.model}
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
          </Card>
        </motion.div>
      ))}
    </div>
  )

  return (
    <div className='min-h-screen flex flex-col items-center justify-between bg-gray-50 p-4 md:p-8 text-gray-900'>
      <div className='relative w-full max-w-md md:max-w-lg lg:max-w-xl text-center white rounded-lg p-6 md:p-8'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='bg-white shadow-md rounded-lg p-6 mb-8'
        >
          <h1 className='text-3xl font-bold mb-2 text-black'>My Cars</h1>
          <p className='text-gray-600 mb-6'>Manage your cars</p>
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className='text-red-500'>Error: {error}</p>
          ) : (
            renderCars(cars)
          )}
        </motion.div>
        <div className='text-left mb-6'>
          <Button
            variant='outline'
            onClick={() => {
              // @ts-ignore
              dispatch(setIsAddCarModalOpen(true))
            }}
          >
            <Car className='mr-2' /> Add Car
          </Button>
        </div>
      </div>
      <div className='flex h-16'></div>

      {/* AddCarModal Component */}
      <AddCarModal
        isOpen={isAddCarModalOpen}
        onClose={() => setIsAddCarModalOpen(false)}
      />

      {/* Edit Car Component */}
      {currentlyEditingCar && (
        <EditCarModal
          car={currentlyEditingCar}
          isOpen={isEditCarModalOpen}
          onClose={() => setIsEditCarModalOpen(false)}
        />
      )}
    </div>
  )
}
