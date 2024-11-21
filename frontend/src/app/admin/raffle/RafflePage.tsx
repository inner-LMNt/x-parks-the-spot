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
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { getRaffleEntries, performRaffle } from "@/features/admin/adminSlice"
import { useToast } from "@/hooks/use-toast"

interface RaffleEntry {
  user_id: string
  username: string
  email: string
  tickets: number
}

export const RafflePage = () => {
  const dispatch = useAppDispatch()
  const {
    raffleEntries = [],
    loading,
    error,
    raffleResult,
  } = useAppSelector((state) => state.admin)
  const { toast } = useToast()
  const [isRafflePerformed, setIsRafflePerformed] = useState(false)

  useEffect(() => {
    dispatch(getRaffleEntries())
  }, [dispatch])

  const handlePerformRaffle = async () => {
    try {
      await dispatch(performRaffle()).unwrap()
      setIsRafflePerformed(true)
      toast({
        title: "Raffle Performed",
        description: "The raffle has been performed successfully.",
        variant: "success",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to perform raffle: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const handleRefreshEntries = async () => {
    try {
      await dispatch(getRaffleEntries()).unwrap()
      toast({
        title: "Entries Refreshed",
        description: "The raffle entries have been refreshed.",
        variant: "success",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to refresh entries: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <p className="text-center text-lg">Loading...</p>
  }

  if (error) {
    return <p className="text-red-500 text-center">Error: {error}</p>
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white shadow-md rounded-lg p-6 mb-8"
        >
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold mb-2 text-black">
              Raffle Entries
            </h1>
            <div className="flex gap-2">
              <Button variant="default" onClick={handleRefreshEntries}>
                Refresh Entries
              </Button>
              <Button variant="default" onClick={handlePerformRaffle}>
                Perform Raffle
              </Button>
            </div>
          </div>

          {raffleEntries.length === 0 ? (
            <p className="text-center text-black">
              No raffle entries available.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {raffleEntries.map((entry: RaffleEntry) => (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="bg-gray-50">
                      <CardTitle className="flex items-center space-x-2">
                        <span>User: {entry.user_id}</span>
                      </CardTitle>
                      <CardDescription>
                        <p>
                          <strong>Name:</strong> {entry.username}
                        </p>
                        <p>
                          <strong>Email:</strong> {entry.email}
                        </p>
                        <p>
                          <strong>Tickets:</strong> {entry.tickets}
                        </p>
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {raffleResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white shadow-md rounded-lg p-6 mb-8"
          >
            <h2 className="text-2xl font-bold mb-4 text-black">
              Most Recent Raffle Result
            </h2>{" "}
            {/* Only stored locally for now */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {raffleResult.map((winner: RaffleEntry) => (
                <motion.div
                  key={winner.user_id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="bg-gray-50">
                      <CardTitle className="flex items-center space-x-2">
                        <span>User: {winner.user_id}</span>
                      </CardTitle>
                      <CardDescription>
                        <p>
                          <strong>Name:</strong> {winner.username}
                        </p>
                        <p>
                          <strong>Email:</strong> {winner.email}
                        </p>
                        <p>
                          <strong>Tickets:</strong> {winner.tickets}
                        </p>
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default RafflePage
