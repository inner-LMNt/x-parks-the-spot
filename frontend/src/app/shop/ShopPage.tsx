"use client"

import { useState, useEffect } from "react"
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { get_transactions, get_points, buy_badge } from "@/features/user/userSlice";
import { ShoppingCart, Award, Ticket, ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from '@/hooks/use-toast';

const shopItems = [
  { id: 1, name: "Bronze Parking Badge", type: "badge", icon: Award, color: "bronze", points: 500 },
  { id: 2, name: "Silver Parking Badge", type: "badge", icon: Award, color: "silver", points: 1000 },
  { id: 3, name: "Gold Parking Badge", type: "badge", icon: Award, color: "gold", points: 2000 },
  { id: 4, name: "Raffle Ticket - $10 xPark Gift Card", type: "ticket", icon: Ticket, color: "blue", points: 750 },
]

export default function ShopPage() {
  const dispatch = useAppDispatch();
  const userPoints = useAppSelector((state) => state.user.current_points);
  const transactions = useAppSelector((state) => state.user.transactions);
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('shop');

  const handlePurchase = (item: typeof shopItems[0]) => {
    if (userPoints >= item.points) {
      toast({
        title: "Purchase Successful!",
        description: `You've purchased ${item.name} for ${item.points} points.`,
        variant: "success",
      })
    } else {
      toast({
        title: "Insufficient Points",
        description: "You don't have enough points to purchase this item.",
        variant: "destructive",
      })
    }
  }

  const handlePurchaseBadge = (item: typeof shopItems[0]) => {
    dispatch(buy_badge({ badgeId: item.id, price: item.points }))
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
            description: resultAction.payload ? resultAction.payload : "An unknown error occurred",
            variant: "destructive",
          });
        }
      })
      .catch((error: any) => {
        console.error("Failed to purchase badge", error)
      })
  }

  useEffect(() => {
    dispatch(get_transactions())
  }, [dispatch])

  return (
    <div className="container mx-auto p-4 max-w-6xl bg-gradient-to-r from-purple-500 to-black-500 min-h-screen">
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800">Parking Rewards</h1>
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-gray-800" />
          <div className="inline-block p-2 bg-gray-100 rounded-md shadow-sm">
            <span className="text-xl font-semibold text-gray-800">{userPoints} Points</span>
          </div>
        </div>
      </div>
      <div className="flex justify-center mb-8">
        <button
          className={`px-4 py-2 mx-2 ${activeTab === 'shop' ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-800'} rounded-md outline outline-2 outline-violet-500 outline-offset-2`}
          onClick={() => setActiveTab('shop')}
        >
          Shop
        </button>
        <button
          className={`px-4 py-2 mx-2 ${activeTab === 'transactions' ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-800'} rounded-md outline outline-2 outline-violet-500 outline-offset-2`}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions
        </button>
      </div>
      {activeTab === 'shop' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shopItems.map((item) => (
            <Card key={item.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <item.icon className={`h-6 w-6 ${item.color === 'bronze' ? 'text-yellow-600' : item.color === 'silver' ? 'text-gray-400' : item.color === 'gold' ? 'text-yellow-300' : 'text-blue-500'}`} />
                  {item.name}
                </CardTitle>
                <div className="mt-2">
                  <Card className="inline-block p-2 bg-gray-100 rounded-md shadow-sm">
                    <span className="text-lg font-semibold text-gray-800">{item.points} Points</span>
                  </Card>
                </div>
                <CardDescription>{item.type === "badge" ? "Exclusive Badge" : "Raffle Entry"}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  {item.type === "badge"
                    ? "Show off your parking expertise with this exclusive badge!"
                    : "Enter for a chance to win!"}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <Button onClick={() => (item.id >= 1 && item.id <= 3 ? handlePurchaseBadge(item) : handlePurchase(item))}>
                  Purchase
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      {activeTab === 'transactions' && (
        <div className="grid grid-cols-1 gap-6">
          {transactions.map((transaction: any, index: number) => (
            <Card key={index} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {transaction.transaction_type === 'spend' ? (
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
                  Balance After Transaction: {transaction.balance_after_transaction}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}