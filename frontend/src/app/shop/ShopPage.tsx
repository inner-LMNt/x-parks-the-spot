"use client"

import { useState } from "react"
import { ShoppingCart, Award, Ticket } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast, useToast } from '@/components/ui/use-toast';

// Mock data for shop items
const shopItems = [
  { id: 1, name: "Bronze Parking Badge", type: "badge", icon: Award, color: "bronze", points: 500 },
  { id: 2, name: "Silver Parking Badge", type: "badge", icon: Award, color: "silver", points: 1000 },
  { id: 3, name: "Gold Parking Badge", type: "badge", icon: Award, color: "gold", points: 2000 },
  { id: 4, name: "Raffle Ticket - City Parking Pass", type: "ticket", icon: Ticket, color: "blue", points: 750 },
  { id: 5, name: "Raffle Ticket - Electric Car Charger", type: "ticket", icon: Ticket, color: "green", points: 1500 },
  { id: 6, name: "Raffle Ticket - Luxury Car Weekend", type: "ticket", icon: Ticket, color: "purple", points: 3000 },
]

export default function ShopPage() {
  const [userPoints, setUserPoints] = useState(5000) // Mock user points
  const { toast } = useToast()

  const handlePurchase = (item: typeof shopItems[0]) => {
    if (userPoints >= item.points) {
      setUserPoints(prevPoints => prevPoints - item.points)
      toast({
        title: "Purchase Successful!",
        description: `You've purchased ${item.name} for ${item.points} points.`,
      })
    } else {
      toast({
        title: "Insufficient Points",
        description: "You don't have enough points to purchase this item.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl bg-gradient-to-r from-purple-500 to-black-500 min-h-screen">
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800">Parking Rewards Shop</h1>
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-gray-800" />
          <div className="inline-block p-2 bg-gray-100 rounded-md shadow-sm">
            <span className="text-xl font-semibold text-gray-800">{userPoints} Points</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shopItems.map((item) => (
          <Card key={item.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <item.icon className={`h-6 w-6 text-${item.color}-500`} />
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
                  : "Enter for a chance to win amazing parking-related prizes!"}
              </p>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <Button onClick={() => handlePurchase(item)}>Purchase</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}