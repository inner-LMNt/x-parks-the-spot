"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  get_transactions,
  get_points,
  get_badge_list,
  buy_badge,
  buy_raffle_ticket,
  get_raffle_tickets,
} from "@/features/user/userSlice"
import {
  ShoppingCart,
  Award,
  Ticket,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeft,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

const shopItems = [
  {
    id: 1,
    name: "Bronze Parking Badge",
    type: "badge",
    icon: Award,
    color: "bronze",
    points: 500,
  },
  {
    id: 2,
    name: "Silver Parking Badge",
    type: "badge",
    icon: Award,
    color: "silver",
    points: 1000,
  },
  {
    id: 3,
    name: "Gold Parking Badge",
    type: "badge",
    icon: Award,
    color: "gold",
    points: 2000,
  },
  {
    id: 4,
    name: "Raffle Ticket - $10 xPark Gift Card",
    type: "ticket",
    icon: Ticket,
    color: "blue",
    points: 750,
  },
]

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

export default function ShopPage() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const userPoints = useAppSelector((state) => state.user.current_points)
  const transactions = useAppSelector((state) => state.user.transactions)
  const tickets = useAppSelector((state) => state.user.active_raffle_tickets)
  const badgeList = useAppSelector((state) => state.user.badges)
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("shop")
  const [timeRemaining, setTimeRemaining] = useState(
    getTimeRemaining(getEndOfMonth()),
  )

  const handlePurchaseRaffle = (item: (typeof shopItems)[0]) => {
    dispatch(buy_raffle_ticket({ raffleId: item.id }))
      .then((resultAction: any) => {
        if (buy_raffle_ticket.fulfilled.match(resultAction)) {
          dispatch(get_raffle_tickets())
          toast({
            title: "Purchase Successful!",
            description: `You've purchased ${item.name} for ${item.points} points.`,
            variant: "success",
          })
        } else if (buy_raffle_ticket.rejected.match(resultAction)) {
          toast({
            title: "Purchase Failed",
            description: resultAction.payload
              ? resultAction.payload
              : "An unknown error occurred",
            variant: "destructive",
          })
        }
      })
      .catch((error: any) => {
        console.error("Failed to purchase raffle", error)
      })
  }

  const handlePurchaseBadge = (item: (typeof shopItems)[0]) => {
    dispatch(buy_badge({ badgeId: item.id }))
      .then((resultAction: any) => {
        if (buy_badge.fulfilled.match(resultAction)) {
          dispatch(get_points())
          toast({
            title: "Purchase Successful!",
            description: `You've purchased ${item.name} for ${item.points} points.`,
            variant: "success",
          })
        } else if (buy_badge.rejected.match(resultAction)) {
          toast({
            title: "Purchase Failed",
            description: resultAction.payload
              ? resultAction.payload
              : "An unknown error occurred",
            variant: "destructive",
          })
        }
      })
      .catch((error: any) => {
        console.error("Failed to purchase badge", error)
      })
  }

  useEffect(() => {
    dispatch(get_transactions())
    dispatch(get_points())
    dispatch(get_raffle_tickets())
    dispatch(get_badge_list())

    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(getEndOfMonth()))
    }, 1000)

    return () => clearInterval(interval)
  }, [dispatch])

  return (
    <div className="container mx-auto p-4 max-w-6xl bg-gradient-to-r from-purple-500 to-black-500 min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" onClick={() => router.push("/profile")}>
          <ArrowLeft className="mr-2" /> Back to Profile
        </Button>
      </div>
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800">Parking Rewards</h1>
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-gray-800" />
          <div className="inline-block p-2 bg-gray-100 rounded-md shadow-sm">
            <span className="text-xl font-semibold text-gray-800">
              {userPoints} Points
            </span>
          </div>
        </div>
      </div>
      <div className="flex justify-center mb-8">
        <button
          className={`px-4 py-2 mx-2 ${activeTab === "shop" ? "bg-purple-500 text-white" : "bg-gray-200 text-gray-800"} rounded-md outline outline-2 outline-violet-500 outline-offset-2`}
          onClick={() => setActiveTab("shop")}
        >
          Shop
        </button>
        <button
          className={`px-4 py-2 mx-2 ${activeTab === "transactions" ? "bg-purple-500 text-white" : "bg-gray-200 text-gray-800"} rounded-md outline outline-2 outline-violet-500 outline-offset-2`}
          onClick={() => setActiveTab("transactions")}
        >
          Transactions
        </button>
      </div>
      {activeTab === "shop" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shopItems.map((item) => {
            const isDisabled = badgeList.includes(String(item.id))

            return (
              <Card key={item.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <item.icon
                      className={`h-6 w-6 ${item.color === "bronze" ? "text-yellow-600" : item.color === "silver" ? "text-gray-400" : item.color === "gold" ? "text-yellow-300" : "text-blue-500"}`}
                    />
                    {item.name}
                  </CardTitle>
                  <div className="mt-2">
                    <Card className="inline-block p-2 bg-gray-100 rounded-md shadow-sm">
                      <span className="text-lg font-semibold text-gray-800">
                        {item.points} Points
                      </span>
                    </Card>
                  </div>
                  <CardDescription>
                    {item.type === "badge" ? (
                      "Exclusive Badge"
                    ) : (
                      <span>
                        Raffle Entry -{" "}
                        <strong>You currently have {tickets} tickets</strong>
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground">
                    {item.type === "badge"
                      ? "Show off your parking expertise with this exclusive badge!"
                      : "Enter for a chance to win! Buy more tickets to increase your chances."}
                  </p>
                  {item.type === "ticket" && (
                    <div className="mt-4 text-left">
                      <p className="text-sm text-gray-600">
                        Tickets are drawn at the end of each month.
                      </p>
                      <div className="text-xl font-semibold text-gray-800">
                        {timeRemaining.days}d {timeRemaining.hours}h{" "}
                        {timeRemaining.minutes}m {timeRemaining.seconds}s
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <Button
                    onClick={() => {
                      item.id >= 1 && item.id <= 3
                        ? handlePurchaseBadge(item)
                        : handlePurchaseRaffle(item)
                      dispatch(get_points())
                    }}
                    disabled={isDisabled}
                    className={
                      isDisabled ? "opacity-50 cursor-not-allowed" : ""
                    }
                  >
                    {isDisabled ? "Purchased" : "Purchase"}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
      {activeTab === "transactions" && (
        <div className="grid grid-cols-1 gap-6">
          {transactions
            .slice()
            .reverse()
            .map((transaction: any, index: number) => (
              <Card key={index} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {transaction.transaction_type === "spend" ? (
                      <ArrowDownCircle className="h-6 w-6 text-grey-500" />
                    ) : (
                      <ArrowUpCircle className="h-6 w-6 text-grey-500" />
                    )}
                    {transaction.description}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-between items-center">
                  <div className="text-lg font-semibold text-gray-800">
                    {transaction.points_amount} Points
                  </div>
                  <div className="text-sm text-gray-600">
                    Balance After Transaction:{" "}
                    {transaction.balance_after_transaction}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}
