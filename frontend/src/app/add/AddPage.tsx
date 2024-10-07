'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { Camera, X, Upload, ArrowLeft } from 'lucide-react'
import Webcam from 'react-webcam'

export default function AddSpotPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [spotType, setSpotType] = useState('free')
  const [isAvailable, setIsAvailable] = useState(true)
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const webcamRef = useRef<Webcam>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveImage = () => {
    setImage(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCameraCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setPreviewUrl(imageSrc)
      fetch(imageSrc)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" })
            setImage(file)
          })
      setShowCamera(false)
    }
  }, [webcamRef])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)

    if (image) {
      formData.append('image', image)
    }

    formData.append('type', spotType)
    formData.append('isAvailable', isAvailable.toString())

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast({
        title: "Spot added successfully!",
        description: "Your new parking spot has been added.",
      })
      router.push('/myspots')
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add the parking spot. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
      <div className="flex flex-col min-h-screen bg-gray-100">
        <div className="flex-grow overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl py-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
              <Card className="shadow-md mb-20">
                <CardHeader className="relative">
                  <Button
                      variant="ghost"
                      onClick={() => router.back()}
                      className="absolute left-4 top-4 p-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="text-center">
                    <CardTitle className="text-2xl">Add a Parking Spot</CardTitle>
                    <CardDescription>Fill in the details to list your parking spot</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label>Spot Type</Label>
                      <RadioGroup defaultValue="free" onValueChange={setSpotType} className="flex space-x-4">
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
                      <Input id="name" name="name" required placeholder="e.g. Downtown Parking" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input id="address" name="address" required placeholder="Full street address" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="latitude">Latitude</Label>
                        <Input id="latitude" name="latitude" type="number" step="any" required placeholder="e.g. 40.7128" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="longitude">Longitude</Label>
                        <Input id="longitude" name="longitude" type="number" step="any" required placeholder="e.g. -74.0060" />
                      </div>
                    </div>

                    {spotType === 'rental' && (
                        <div className="space-y-2">
                          <Label htmlFor="price">Price per Hour ($)</Label>
                          <Input id="price" name="price" type="number" step="0.01" min="0" required placeholder="e.g. 5.00" />
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

                    <div className="space-y-2">
                      <Label>Spot Image</Label>
                      {showCamera ? (
                          <div className="relative">
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                className="w-full rounded-lg"
                            />
                            <Button
                                type="button"
                                onClick={handleCameraCapture}
                                className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              Capture Photo
                            </Button>
                          </div>
                      ) : (
                          <div
                              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
                              onClick={handleImageClick}
                          >
                            {previewUrl ? (
                                <div className="relative">
                                  <img src={previewUrl} alt="Preview" className="max-w-full h-auto mx-auto rounded-lg" />
                                  <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoveImage()
                                      }}
                                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-8">
                                  <Upload size={48} className="text-gray-400 mb-2" />
                                  <p className="text-sm text-gray-500">Click to upload an image or use camera</p>
                                </div>
                            )}
                          </div>
                      )}
                      <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          ref={fileInputRef}
                          className="hidden"
                      />
                      <div className="flex justify-center mt-2">
                        <Button type="button" variant="outline" onClick={() => setShowCamera(!showCamera)}>
                          {showCamera ? (
                              <>
                                <X className="w-4 h-4 mr-2" />
                                Hide Camera
                              </>
                          ) : (
                              <>
                                <Camera className="w-4 h-4 mr-2" />
                                Use Camera
                              </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Adding Spot...' : 'Add Parking Spot'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
  )
}