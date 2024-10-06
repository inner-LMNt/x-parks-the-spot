'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"

export default function AddSpotPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [spotType, setSpotType] = useState('free')
  const [isAvailable, setIsAvailable] = useState(true)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const spotData = Object.fromEntries(formData.entries())

    try {
      // const response = await fetch('/api/spots', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     ...spotData,
      //     type: spotType,
      //     isAvailable,
      //   }),
      // })

      // For now, assume the spot was added successfully
      
      const response = { ok: true }

      if (response.ok) {
        toast({
          title: "Spot added successfully!",
          description: "Your new parking spot has been added.",
        })
        router.push('/myspots')
      } else {
        throw new Error('Failed to add spot')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add the parking spot. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto pb-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-6">Add a Parking Spot</h1>
        <Card>
          <CardHeader>
            <CardTitle>Spot Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Spot Type</Label>
                <RadioGroup defaultValue="free" onValueChange={setSpotType}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="free" id="free" />
                    <Label htmlFor="free">Free</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rental" id="rental" />
                    <Label htmlFor="rental">For Rent</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Spot Name</Label>
                <Input id="name" name="name" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input id="latitude" name="latitude" type="number" step="any" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input id="longitude" name="longitude" type="number" step="any" required />
                </div>
              </div>

              {spotType === 'rental' && (
                <div className="space-y-2">
                  <Label htmlFor="price">Price per Hour ($)</Label>
                  <Input id="price" name="price" type="number" step="0.01" min="0" required />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="available"
                  checked={isAvailable}
                  onCheckedChange={setIsAvailable}
                />
                <Label htmlFor="available">Available Now</Label>
              </div>

              <Button type="submit">Add Spot</Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}