"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  get_user_location,
  connect_account,
  create_account_session,
  get_points,
  get_score,
  get_badge_list,
  get_raffle_tickets,
} from "@/features/user/userSlice"
import {
  Settings,
  ArrowUpCircle,
  ArrowDownCircle,
  LogOut,
  FileWarning,
  Car,
  Ticket,
  Bookmark,
  Award,
} from "lucide-react" // Imported FileWarning
import { logout } from "@/features/user/userSlice"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js"
import { loadConnectAndInitialize } from "@stripe/connect-js"
import { RatingStars } from "@/components/custom/RatingDisplay"

function ProfileStats({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg md:text-xl font-bold">{value}</p>
      <p className="text-sm md:text-base text-gray-600">{label}</p>
    </div>
  )
}

function AchievementCard({
  colorClass,
  label,
}: {
  colorClass: string
  label: string
}) {
  return (
    <div className="flex flex-col items-center">
      <Award className={`w-12 h-12 mb-2 ${colorClass} drop-shadow-lg`} />
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  )
}

function CommentCard({
  user,
  comment,
  sentiment,
}: {
  user: string
  comment: string
  sentiment: string
}) {
  return (
    <div className="bg-gray-100 p-4 rounded-lg shadow-sm flex justify-between items-start drop-shadow-lg">
      <div>
        <p className="text-sm font-bold text-gray-900">{user}</p>
        <p className="text-sm text-gray-700">{comment}</p>
      </div>
      <div className="flex items-center">
        {sentiment === "positive" ? (
          <ArrowUpCircle className="w-6 h-6 text-green-500" />
        ) : (
          <ArrowDownCircle className="w-6 h-6 text-red-500" />
        )}
      </div>
    </div>
  )
}

function getTimeRemaining(endTime: Date) {
  const total =
    Date.parse(endTime.toString()) - Date.parse(new Date().toString())
  const seconds = Math.floor((total / 1000) % 60)
  const minutes = Math.floor((total / 1000 / 60) % 60)
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
  const days = Math.floor(total / (1000 * 60 * 60 * 24))
  return { total, days, hours, minutes, seconds }
}

function getEndOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
}

export default function ProfilePage() {
  const dispatch = useAppDispatch()
  const isLoggedIn = useAppSelector((state: any) => state.user.isLoggedIn)
  const [eloRating] = React.useState(1200)
  const router = useRouter()
  const name = useAppSelector((state: any) => state.user.name)
  const userState = useAppSelector((state: any) => state.user.userState)
  const userCity = useAppSelector((state: any) => state.user.userCity)
  const currentPoints = useAppSelector((state) => state.user.current_points)
  const totalPoints = useAppSelector((state) => state.user.total_points)
  const connectedAccountId = useAppSelector((state) => state.user.stripeId)
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>()

  useEffect(() => {
    const fetchClientSecret = async () => {
      // const connectedAccountId = await dispatch(connect_account()).unwrap()
      const a = await dispatch(
        create_account_session({ accountId: connectedAccountId }),
      ).unwrap()
      console.log("a! " + JSON.stringify(a.account))
      return a.account
    }

    setStripeConnectInstance(
      loadConnectAndInitialize({
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PK || "",
        fetchClientSecret,
        appearance: {
          overlays: "dialog",
          variables: {
            colorPrimary: "#635BFF",
          },
        },
      }),
    )
  }, [connectedAccountId])
  const userBadges = useAppSelector((state) => state.user.badges) || []
  const raffleTickets = useAppSelector(
    (state) => state.user.active_raffle_tickets,
  )
  const [badges, setBadges] = useState(userBadges)
  const [timeRemaining, setTimeRemaining] = useState(
    getTimeRemaining(getEndOfMonth()),
  )
  const score = useAppSelector((state) => state.user.score)

  const handleLogout = async () => {
    await dispatch(logout())
    router.push("/login")
  }

  const userProfile = {
    username: name,
    joinedDate: new Date(2020, 5, 1),
    spotfindPosts: 50,
    yearsOnApp: 2,
  }

  const maxElo = 3000

  const comments = [
    { user: "User1", comment: "Logged many spots!", sentiment: "positive" },
    {
      user: "User2",
      comment: "Found a great spot, thanks!",
      sentiment: "positive",
    },
    {
      user: "User3",
      comment: "Logged a spot that was on private property",
      sentiment: "negative",
    },
    {
      user: "User4",
      comment: "Helpful and friendly service!",
      sentiment: "positive",
    },
  ]

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-900">
        <p className="text-xl">
          Please{" "}
          <Link href="/login" className="text-blue-500 underline">
            log in
          </Link>{" "}
          to view your profile.
        </p>
      </div>
    )
  }

  const [domLoaded, setDomLoaded] = useState(false)
  useEffect(() => {
    dispatch(get_user_location())
    dispatch(connect_account())
    setDomLoaded(true)
    dispatch(get_points())
    dispatch(get_score())
    dispatch(get_badge_list())
    dispatch(get_raffle_tickets())
    setDomLoaded(true)
  }, [dispatch])

  useEffect(() => {
    setBadges(userBadges)
  }, [userBadges])

  useEffect(() => {
    setDomLoaded(true)
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(getEndOfMonth()))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const badgeDetails: { [key: string]: { colorClass: string; label: string } } =
  {
    "1": { colorClass: "text-yellow-600", label: "Bronze Badge" },
    "2": { colorClass: "text-gray-400", label: "Silver Badge" },
    "3": { colorClass: "text-yellow-300", label: "Gold Badge" },
  }

  return (
    domLoaded && (
      <div className="min-h-screen flex flex-col items-center justify-between bg-gray-50 p-4 md:p-8 text-gray-900">
        <div className="relative w-full max-w-md md:max-w-lg lg:max-w-xl text-center white rounded-lg p-6 md:p-8">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-4 left-4"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Are you sure you want to logout?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action will end your current session.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>
                  Logout
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="absolute top-4 right-4 flex">
            <Link href="/reports" passHref>
              <Button variant="ghost" size="icon" className="p-2">
                <FileWarning
                  className="w-6 h-6 text-gray-400 hover:text-gray-600"
                  aria-label="Reports"
                />
              </Button>
            </Link>
            <Link href="/settings" passHref>
              <Button variant="ghost" size="icon" className="p-2">
                <Settings
                  className="w-6 h-6 text-gray-400 cursor-pointer hover:text-gray-600"
                  aria-label="Settings"
                />
              </Button>
            </Link>
          </div>

          <div className="flex flex-col items-center mb-4">
            <div className="w-24 h-24 rounded-full bg-gray-300 mb-4 drop-shadow-lg" />
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              {userProfile.username}
            </h1>
            <RatingStars rating={score} />
            <div className="h-3"></div>
            <p className="text-lg md:text-xl text-gray-600 mb-4">
              Total Points: {totalPoints}
            </p>
            <p className="text-lg md:text-xl text-gray-600 mb-4">
              Current Points: {currentPoints}
            </p>
            <div className="flex justify-center items-center space-x-8">
              <ProfileStats label="Rating" value={eloRating} />
              <ProfileStats label="Posts" value={userProfile.spotfindPosts} />
              <ProfileStats label="Years" value={userProfile.yearsOnApp} />
            </div>
          </div>

          <div className="text-left mb-6">
            <h2 className="text-lg font-semibold mb-4">Location</h2>
            <p className="text-sm text-gray-700">State: {userState}</p>
            <p className="text-sm text-gray-700">City: {userCity}</p>
          </div>

          <div className="w-full bg-gray-300 rounded-full h-4 mb-6 drop-shadow-lg">
            <div
              className="bg-green-500 h-4 rounded-full"
              style={{ width: `${(eloRating / maxElo) * 100}%` }}
            ></div>
          </div>

          <div className="text-left mb-6">
            <h2 className="text-lg font-semibold mb-4"> Badges </h2>
            <div className="grid grid-cols-3 gap-4">
              {Array.isArray(userBadges) && userBadges.length > 0 ? (
                [...userBadges]
                  .sort((a: number, b: number) => a - b)
                  .map((badge: number) => (
                    <AchievementCard
                      key={badge}
                      colorClass={badgeDetails[badge].colorClass}
                      label={badgeDetails[badge].label}
                    />
                  ))
              ) : (
                <p className="text-sm text-gray-600">No badges yet.</p>
              )}
            </div>
          </div>

          <div className="text-left mb-6">
            <h2 className="text-lg font-semibold mb-4">Raffle Tickets</h2>
            <div className="flex items-center gap-2">
              <Ticket className="h-6 w-6 text-blue-500" />
              <p className="text-lg font-semibold text-gray-800">
                {raffleTickets} Tickets
              </p>
            </div>
            <div className="mt-2 text-left">
              <p className="text-sm text-gray-600">
                Tickets are drawn at the end of each month.
              </p>
              <div className="text-xl font-semibold text-gray-800">
                {timeRemaining.days}d {timeRemaining.hours}h{" "}
                {timeRemaining.minutes}m {timeRemaining.seconds}s
              </div>
            </div>
          </div>

          <div className="text-left mb-6">
            <h2 className="text-lg font-semibold mb-4">Comments</h2>
            <div className="space-y-2">
              {comments.map((commentData, index) => (
                <CommentCard
                  key={index}
                  user={commentData.user}
                  comment={commentData.comment}
                  sentiment={commentData.sentiment}
                />
              ))}
            </div>
          </div>
          <div className="text-left mb-6">
            <h2 className="text-lg font-semibold mb-4">Reports</h2>
            <Link href="/reports" passHref>
              <Button variant="outline">
                <FileWarning className="mr-2" /> View Your Reports
              </Button>
            </Link>
          </div>
          <div className="text-left mb-6">
            <h2 className="text-lg font-semibold mb-4">Cars</h2>
            <Link href="/cars" passHref>
              <Button variant="outline">
                <Car className="mr-2" /> View Your Cars
              </Button>
            </Link>
          </div>
          <div className="text-left mb-6">
            <h2 className="text-lg font-semibold mb-4">Bookmarks</h2>
            <Link href="/bookmarks" passHref>
              <Button variant="outline">
                <Bookmark className="mr-2" /> View Your Bookmarks
              </Button>
            </Link>
          </div>
          <div>
            <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
              <ConnectAccountOnboarding onExit={() => { }} />
            </ConnectComponentsProvider>
          </div>
        </div>
        <div className="flex h-16"></div>
      </div>
    )
  )
}
