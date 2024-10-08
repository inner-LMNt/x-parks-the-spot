'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { addParkingSpot, resetState } from '@/features/add/addSlice';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Camera, X, Upload, ArrowLeft, PlusCircle, Trash2, MapPin } from 'lucide-react';
import Webcam from 'react-webcam';
import { v4 as uuidv4 } from 'uuid';
import { TimeSlot } from '@/types/type';

export default function AddPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { toast } = useToast();
  const { loading, error } = useSelector((state: RootState) => state.add);

  const [spotType, setSpotType] = useState('free');
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availability, setAvailability] = useState<Array<TimeSlot & { id: string; is24Seven: boolean }>>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoEnabled, setGeoEnabled] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [availabilityErrors, setAvailabilityErrors] = useState<{ [key: string]: string }>({});

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCameraCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setPreviewUrl(imageSrc);
      fetch(imageSrc)
          .then((res) => res.blob())
          .then((blob) => {
            const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
            setImage(file);
          });
      setShowCamera(false);
    }
  }, [webcamRef]);

  const handleAddAvailability = () => {
    setAvailability((prev) => [
      ...prev,
      { id: uuidv4(), day_of_week: [], start_time: '', end_time: '', is24Seven: false },
    ]);
  };

  const handleRemoveAvailability = (id: string) => {
    setAvailability((prev) => prev.filter((slot) => slot.id !== id));
    setAvailabilityErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
  };

  const handleAvailabilityChange = (
      id: string,
      field: keyof TimeSlot | 'is24Seven',
      value: any
  ) => {
    setAvailability((prev) =>
        prev.map((slot) =>
            slot.id === id ? { ...slot, [field]: value } : slot
        )
    );

    // If is24Seven is toggled, reset related fields
    if (field === 'is24Seven' && value) {
      setAvailability((prev) =>
          prev.map((slot) =>
              slot.id === id
                  ? { ...slot, start_time: '00:00', end_time: '00:00', day_of_week: [] }
                  : slot
          )
      );
    }
  };

  // Function to get user's current location
  const getUserLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setUserLocation(location);
            setGeoEnabled(true);
            setLocationLoading(false);
          },
          () => {
            console.error("Error: The Geolocation service failed.");
            setGeoEnabled(false);
            setLocationLoading(false);
          }
      );
    } else {
      console.error("Error: Your browser doesn't support geolocation.");
      setGeoEnabled(false);
      setLocationLoading(false);
    }
  };

  // Helper function to calculate difference in minutes considering day wrap
  const calculateTimeDifference = (start: string, end: string): number => {
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    let diff = endTotalMinutes - startTotalMinutes;
    if (diff < 0) {
      diff += 24 * 60; // Wrap around to next day
    }
    return diff;
  };

  const validateAvailability = () => {
    let isValid = true;
    const errors: { [key: string]: string } = {};

    availability.forEach((slot) => {
      if (slot.is24Seven) {
        // No validation needed for 24/7
        return;
      }

      if (slot.day_of_week.length === 0) {
        isValid = false;
        errors[slot.id] = 'Please select at least one day of the week.';
      }

      if (slot.start_time && slot.end_time) {
        const diffMinutes = calculateTimeDifference(slot.start_time, slot.end_time);

        if (diffMinutes > 0 && diffMinutes < 60) {
          isValid = false;
          errors[slot.id] = 'Each time slot must allow for at least one hour of parking.';
        }
        // If diffMinutes === 0, it's valid (full day)
        // If diffMinutes >= 60, it's valid
      }
    });

    setAvailabilityErrors(errors);
    return isValid;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    // Validate availability before proceeding
    if (!validateAvailability()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in your availability schedule.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData(event.currentTarget);
    let name = '';
    let latitude: number | undefined;
    let longitude: number | undefined;
    let price: number | null = null;

    let address = '';

    if (spotType === 'rental') {
      name = formData.get('name') as string;
      address = formData.get('address') as string;

      if (!userLocation) {
        toast({
          title: 'Error',
          description: 'Please use your location.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      latitude = userLocation.lat;
      longitude = userLocation.lng;

      price = parseFloat(formData.get('price') as string);
    } else {
      if (!userLocation) {
        toast({
          title: 'Error',
          description: 'Location is not available. Please enable location services.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      latitude = userLocation.lat;
      longitude = userLocation.lng;
    }

    // Build the availability_schedule array
    let availability_schedule = [];
    if (spotType === 'rental') {
      availability_schedule = availability
          .filter(
              (slot) =>
                  slot.is24Seven ||
                  (slot.day_of_week.length > 0 &&
                      slot.start_time &&
                      slot.end_time)
          )
          .flatMap((slot) => {
            if (slot.is24Seven) {
              return [
                {
                  day_of_week: "Everyday",
                  start_time: "00:00",
                  end_time: "00:00",
                },
              ];
            } else {
              return slot.day_of_week.map((day) => ({
                day_of_week: day,
                start_time: slot.start_time,
                end_time: slot.end_time,
              }));
            }
          });
    }

    const data: any = {
      is_paid: spotType === 'rental',
      location: {
        latitude,
        longitude,
        address,
      },
      features: [],
      photos: [],
    };

    if (spotType === 'rental') {
      data.name = name;
      data.availability_schedule = availability_schedule;
      data.pricing_info = {
        base_price: price,
        dynamic_pricing: false,
      };
    }

    const formSubmitData = new FormData();
    formSubmitData.append('data', JSON.stringify(data));

    if (image) {
      formSubmitData.append('image', image);
    }

    try {
      await dispatch(addParkingSpot(formSubmitData)).unwrap();
      toast({
        title: 'Spot added successfully!',
        description: 'Your new parking spot has been added.',
      });
      dispatch(resetState());
      router.push('/myspots');
    } catch (error) {
      toast({
        title: 'Error',
        description: error as string,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Days of the week options
  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

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
                    <CardDescription>
                      Fill in the details to list your parking spot
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label>Spot Type</Label>
                      <RadioGroup
                          defaultValue="free"
                          onValueChange={(value) => {
                            setSpotType(value);
                            setUserLocation(null);
                            if (value !== 'rental') {
                              setAvailability([]);
                            }
                          }}
                          className="flex space-x-4"
                      >
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

                    {spotType === 'rental' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="name">Spot Name</Label>
                            <Input
                                id="name"
                                name="name"
                                required
                                placeholder="e.g. Downtown Parking"
                            />
                          </div>
                        </>
                    )}

                    {spotType === 'rental' && (
                        <div className="space-y-2">
                          <Label htmlFor="address">Address</Label>
                          <Input
                              id="address"
                              name="address"
                              required
                              placeholder="Full street address"
                          />
                        </div>
                    )}

                    {/* Location Section */}
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Button
                          type="button"
                          variant="outline"
                          onClick={getUserLocation}
                          disabled={locationLoading}
                          className="flex items-center space-x-2"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>{locationLoading ? 'Locating...' : 'Use My Location'}</span>
                      </Button>
                      {geoEnabled ? (
                          userLocation ? (
                              <div>
                                <p>Latitude: {userLocation.lat}</p>
                                <p>Longitude: {userLocation.lng}</p>
                              </div>
                          ) : (
                              <p>Your current location will be used for the spot.</p>
                          )
                      ) : (
                          <p>Geolocation is not enabled. Please enable location services.</p>
                      )}
                    </div>

                    {spotType === 'rental' && (
                        <>
                          {/* Availability Schedule */}
                          <div className="space-y-4">
                            <Label>Availability Schedule</Label>
                            {availability.map((slot) => (
                                <div key={slot.id} className="space-y-2 border p-4 rounded-md">
                                  <div className="flex justify-between items-center">
                                    <Label>Time Slot</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => handleRemoveAvailability(slot.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`24seven-${slot.id}`}
                                        checked={slot.is24Seven}
                                        onCheckedChange={(checked) => {
                                          handleAvailabilityChange(slot.id, 'is24Seven', checked);
                                          if (checked) {
                                            // Reset related fields when 24/7 is selected
                                            handleAvailabilityChange(slot.id, 'start_time', '00:00');
                                            handleAvailabilityChange(slot.id, 'end_time', '00:00');
                                          }
                                        }}
                                    />
                                    <Label htmlFor={`24seven-${slot.id}`}>24/7</Label>
                                  </div>
                                  {!slot.is24Seven && (
                                      <>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <Label>Start Time</Label>
                                            <Input
                                                type="time"
                                                value={slot.start_time}
                                                onChange={(e) =>
                                                    handleAvailabilityChange(slot.id, 'start_time', e.target.value)
                                                }
                                                required
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label>End Time</Label>
                                            <Input
                                                type="time"
                                                value={slot.end_time}
                                                onChange={(e) =>
                                                    handleAvailabilityChange(slot.id, 'end_time', e.target.value)
                                                }
                                                required
                                            />
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Days of the Week</Label>
                                          <div className="grid grid-cols-2 gap-2">
                                            {daysOfWeek.map((day) => (
                                                <div key={day} className="flex items-center space-x-2">
                                                  <Checkbox
                                                      id={`${slot.id}-${day}`}
                                                      checked={slot.day_of_week.includes(day)}
                                                      onCheckedChange={(checked) => {
                                                        const updatedDays = checked
                                                            ? [...slot.day_of_week, day]
                                                            : slot.day_of_week.filter((d) => d !== day);
                                                        handleAvailabilityChange(slot.id, 'day_of_week', updatedDays);
                                                      }}
                                                  />
                                                  <Label htmlFor={`${slot.id}-${day}`}>{day}</Label>
                                                </div>
                                            ))}
                                          </div>
                                        </div>
                                      </>
                                  )}
                                  {/* Display error message if any */}
                                  {availabilityErrors[slot.id] && (
                                      <p className="text-red-500 text-sm">{availabilityErrors[slot.id]}</p>
                                  )}
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddAvailability}
                                className="flex items-center space-x-2"
                            >
                              <PlusCircle className="w-4 h-4 mr-2" />
                              <span>Add Availability Slot</span>
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="price">Price per Hour ($)</Label>
                            <Input
                                id="price"
                                name="price"
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                placeholder="e.g. 5.00"
                            />
                          </div>
                        </>
                    )}

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
                                  <img
                                      src={previewUrl}
                                      alt="Preview"
                                      className="max-w-full h-auto mx-auto rounded-lg"
                                  />
                                  <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveImage();
                                      }}
                                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-8">
                                  <Upload size={48} className="text-gray-400 mb-2" />
                                  <p className="text-sm text-gray-500">
                                    Click to upload an image or use camera
                                  </p>
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
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowCamera(!showCamera)}
                        >
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
                        disabled={isSubmitting || loading}
                    >
                      {isSubmitting || loading ? 'Adding Spot...' : 'Add Parking Spot'}
                    </Button>

                    {error && (
                        <p className="text-red-500 text-center mt-2">{error}</p>
                    )}
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
  );
}
