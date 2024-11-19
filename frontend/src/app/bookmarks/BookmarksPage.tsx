"use client"

import React, { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Bookmark } from "@/types/type"
import { motion } from "framer-motion"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { useDispatch, useSelector } from "react-redux"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  fetchUserBookmarks,
  deleteBookmark,
} from "@/features/bookmarks/bookmarkSlice"
import { Bookmark as BookmarkIcon } from "lucide-react" // Imported FileWarning
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function BookmarksPage() {
  const dispatch = useDispatch()
  const isLoggedIn = useSelector((state: any) => state.user.isLoggedIn)
  const router = useRouter()
  const s = useAppSelector((state) => state.bookmarks)

  useEffect(() => {
    if (isLoggedIn) {
      //@ts-ignore
      dispatch(fetchUserBookmarks())
    }
  }, [dispatch, isLoggedIn])

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-900">
        <p className="text-xl">
          Please{" "}
          <Link href="/login" className="text-blue-500 underline">
            log in
          </Link>{" "}
          to see your bookmarks.
        </p>
      </div>
    )
  }

  const renderBookmarks = (bookmarks: Bookmark[]) => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {bookmarks.map((bookmark) => (
        <motion.div
          key={bookmark.parking_spot_id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card
            className="overflow-hidden hover:shadow-lg transition-shadow duration-300"
            onClick={() => {
              router.push(`/bookings/${bookmark.parking_spot_id}/reserve`)
            }}
          >
            <CardHeader className="bg-gray-50">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center space-x-2">
                  <span>{bookmark.name}</span>
                </CardTitle>
              </div>
            </CardHeader>
          </Card>
        </motion.div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-gray-50 p-4 md:p-8 text-gray-900">
      <div className="relative w-full max-w-md md:max-w-lg lg:max-w-xl text-center white rounded-lg p-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white shadow-md rounded-lg p-6 mb-8"
        >
          <h1 className="text-3xl font-bold mb-2 text-black">My Bookmarks</h1>
          <p className="text-gray-600 mb-6">Manage your bookmarks</p>
          {s.loading ? (
            <p>Loading...</p>
          ) : s.error ? (
            <p className="text-red-500">Error: {s.error}</p>
          ) : (
            renderBookmarks(s.bookmarks)
          )}
        </motion.div>
      </div>
      <div className="flex h-16"></div>
    </div>
  )
}
