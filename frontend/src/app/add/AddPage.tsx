'use client';

import React, {useState, useRef, useCallback, useEffect} from 'react';
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
import { Camera, X, Upload, ArrowLeft, MapPin } from 'lucide-react';
import Webcam from 'react-webcam';
import { DaysOfWeek } from '@/types/type'; // Ensure DaysOfWeek enum is imported

// Define days of the week enum

const formatTime = (time: string): string => {
  return time; // Keeping time as "HH:mm" since backend expects time-only strings
};

export default function AddPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { toast } = useToast();
  const { loading, error } = useSelector((state: RootState) => state.add);

  const [spotType, setSpotType] = useState<'free' | 'rental'>('free');
  const [domLoaded, setDomLoaded] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Separate TimeSlot and is24Seven
  const [timeSlot, setTimeSlot] = useState<any>({
    day_of_week: [],
    start_time: '',
    end_time: '',
  });

  const [is24Seven, setIs24Seven] = useState<boolean>(false);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoEnabled, setGeoEnabled] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string>('');

  /**
   * **Handle Image Selection**
   */
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

  /**
   * **Trigger File Input Click**
   */
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * **Remove Selected Image**
   */
  const handleRemoveImage = () => {
    setImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * **Capture Image from Camera**
   */
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
  }, []);

  /**
   * **Handle 24/7 Toggle**
   */
  const handle24SevenToggle = (checked: boolean) => {
    setIs24Seven(checked);
    if (checked) {
      setTimeSlot({
        day_of_week: [],
        start_time: '00:00',
        end_time: '00:00',
      });
    } else {
      setTimeSlot({
        day_of_week: [],
        start_time: '',
        end_time: '',
      });
    }
  };

  /**
   * **Handle Days of the Week Selection**
   */
  const handleDaySelection = (day: DaysOfWeek, checked: boolean) => {
    if (checked) {
      setTimeSlot((prev: any) => ({
        ...prev,
        day_of_week: [...prev.day_of_week, day],
      }));
    } else {
      setTimeSlot((prev: any) => ({
        ...prev,
        day_of_week: prev.day_of_week.filter((d: DaysOfWeek) => d !== day),
      }));
    }
  };

  /**
   * **Get User's Current Location**
   */
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

  /**
   * **Calculate Time Difference in Minutes**
   * Returns the difference between end and start times in minutes.
   */
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

  /**
   * **Validate Availability Slot**
   */
  const validateAvailability = () => {
    let isValid = true;
    let errorMsg = '';

    if (is24Seven) {
      // For 24/7, ensure start_time and end_time are '00:00'
      if (timeSlot.start_time !== '00:00' || timeSlot.end_time !== '00:00') {
        isValid = false;
        errorMsg = '24/7 slots must have start and end times set to 00:00.';
      }
    } else {
      // Check if at least one day is selected
      if (timeSlot.day_of_week.length === 0) {
        isValid = false;
        errorMsg = 'Please select at least one day of the week.';
      }

      // Validate time durations
      if (timeSlot.start_time && timeSlot.end_time) {
        const diffMinutes = calculateTimeDifference(timeSlot.start_time, timeSlot.end_time);

        if (diffMinutes !== 0 && diffMinutes < 60) {
          isValid = false;
          errorMsg = 'Each time slot must allow for at least one hour of parking.';
        }
      } else {
        isValid = false;
        errorMsg = 'Please provide both start and end times.';
      }
    }

    if (isValid) {
      setAvailabilityError('');
    } else {
      setAvailabilityError(errorMsg);
    }

    return isValid;
  };

  /**
   * **Handle Form Submission**
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    // Validate availability before proceeding
    if (!validateAvailability()) {
      toast({
        title: 'Validation Error',
        description: availabilityError || 'Please fix the errors in your availability schedule.',
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

      const priceValue = formData.get('price');
      if (priceValue) {
        price = parseFloat(priceValue as string);
        if (isNaN(price) || price < 0) {
          toast({
            title: 'Invalid Price',
            description: 'Please enter a valid price.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
      }
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

    // Build the availability_schedule array based on the single slot
    let availability_schedule: any[] = [];
    if (spotType === 'rental') {
      if (is24Seven) {
        availability_schedule = Object.values(DaysOfWeek).map((day) => ({
          day_of_week: day,
          start_time: formatTime('00:00'),
          end_time: formatTime('00:00'),
        }));
      } else {
        availability_schedule = timeSlot.day_of_week.map((day: DaysOfWeek) => ({
          day_of_week: day,
          start_time: formatTime(timeSlot.start_time),
          end_time: formatTime(timeSlot.end_time),
        }));
      }
    }

    const data: any = {
      is_paid: spotType === 'rental',
      location: {
        latitude,
        longitude,
        address,
      },
      features: [], // Assuming features are handled elsewhere
      photos: [], // Assuming photos are handled via 'image' upload
    };

    if (spotType === 'rental') {
      data.name = name;
      data.availability_schedule = availability_schedule;
      data.pricing_info = {
        base_price: price,
        dynamic_pricing: false, // Modify if dynamic pricing is needed
      };
    }

    const formSubmitData = new FormData();
    formSubmitData.append('data', JSON.stringify(data));

    if (image) {
      formSubmitData.append('image', image);
    } else {
      // If spot type is 'free' and image is not provided, show an error
      if (spotType === 'free') {
        toast({
          title: 'Image Required',
          description: 'Please capture an image of the free parking spot.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await dispatch(addParkingSpot(formSubmitData)).unwrap();
      toast({
        title: 'Spot Added Successfully!',
        description: 'Your new parking spot has been added.',
      });
      dispatch(resetState());
      router.push('/myspots');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to add parking spot.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setDomLoaded(true);
  }, []);
  return (
      domLoaded && (
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
                    {/* Spot Type Selection */}
                    <div className="space-y-2">
                      <Label>Spot Type</Label>
                      <RadioGroup
                          defaultValue="free"
                          onValueChange={(value) => {
                            setSpotType(value as 'free' | 'rental');
                            setUserLocation(null);
                            setImage(null); // Reset image when spot type changes
                            setPreviewUrl(null); // Reset preview
                            setAvailabilityError(''); // Reset local availability error
                            dispatch(resetState()); // Reset Redux error state
                            if (value !== 'rental') {
                              setTimeSlot({
                                day_of_week: [],
                                start_time: '',
                                end_time: '',
                              });
                              setIs24Seven(false);
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

                    {/* Spot Name (Only for Rental) */}
                    {spotType === 'rental' && (
                        <div className="space-y-2">
                          <Label htmlFor="name">Spot Name</Label>
                          <Input
                              id="name"
                              name="name"
                              required
                              placeholder="e.g. Downtown Parking"
                          />
                        </div>
                    )}

                    {/* Address (Only for Rental) */}
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

                    {/* Availability Schedule (Only for Rental) */}
                    {spotType === 'rental' && (
                        <>
                          <div className="space-y-4">
                            <Label>Availability Schedule</Label>
                            <div className="space-y-2 border p-4 rounded-md">
                              {/* Slot Header */}
                              <div className="flex justify-between items-center">
                                <Label>Time Slot</Label>
                              </div>

                              {/* 24/7 Checkbox */}
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={`24seven`}
                                    checked={is24Seven}
                                    onCheckedChange={(checked) => {
                                      handle24SevenToggle(checked as boolean);
                                    }}
                                />
                                <Label htmlFor={`24seven`}>24/7</Label>
                              </div>

                              {/* Time Inputs (Only if Not 24/7) */}
                              {!is24Seven && (
                                  <>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor={`start_time`}>Start Time</Label>
                                        <Input
                                            id={`start_time`}
                                            type="time"
                                            value={timeSlot.start_time}
                                            onChange={(e) =>
                                                setTimeSlot((prev: any) => ({
                                                  ...prev,
                                                  start_time: e.target.value,
                                                }))
                                            }
                                            required
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor={`end_time`}>End Time</Label>
                                        <Input
                                            id={`end_time`}
                                            type="time"
                                            value={timeSlot.end_time}
                                            onChange={(e) =>
                                                setTimeSlot((prev: any) => ({
                                                  ...prev,
                                                  end_time: e.target.value,
                                                }))
                                            }
                                            required
                                        />
                                      </div>
                                    </div>

                                    {/* Days of the Week */}
                                    <div className="space-y-2">
                                      <Label>Days of the Week</Label>
                                      <div className="grid grid-cols-2 gap-2">
                                        {Object.values(DaysOfWeek).map((day) => (
                                            <div key={day} className="flex items-center space-x-2">
                                              <Checkbox
                                                  id={`${day}`}
                                                  checked={timeSlot.day_of_week.includes(day)}
                                                  onCheckedChange={(checked) => {
                                                    handleDaySelection(day as DaysOfWeek, checked as boolean);
                                                  }}
                                              />
                                              <Label htmlFor={`${day}`}>{day}</Label>
                                            </div>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                              )}

                              {/* Display error message if any */}
                              {availabilityError && (
                                  <p className="text-red-500 text-sm">{availabilityError}</p>
                              )}
                            </div>
                          </div>

                          {/* Price Input (Only for Rental) */}
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

                    {/* Spot Image Upload Section */}
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
                              className={`border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors ${
                                  spotType === 'free' ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              onClick={spotType === 'free' ? undefined : handleImageClick}
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
                                  <Upload size={48} className={`text-gray-400 mb-2 ${spotType === 'free' ? 'opacity-50' : ''}`} />
                                  <p className="text-sm text-gray-500">
                                    {spotType === 'free'
                                        ? 'Image upload is disabled for free spots.'
                                        : 'Click to upload an image or use camera'}
                                  </p>
                                </div>
                            )}
                          </div>
                      )}
                      {/* Disable the file input if spotType is 'free' */}
                      {spotType !== 'free' && (
                          <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              ref={fileInputRef}
                              className="hidden"
                              required
                          />
                      )}
                      <div className="flex justify-center mt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (spotType === 'free') {
                                toast({
                                  title: 'Image Upload Disabled',
                                  description: 'Image uploading is disabled for free spots. Please capture an image using the camera.',
                                  variant: 'destructive',
                                });
                              }
                              setShowCamera(!showCamera);
                            }}
                            disabled={spotType === 'free' ? false : false} // Allow toggling camera for both types
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {showCamera ? 'Hide Camera' : 'Use Camera'}
                        </Button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting || loading || (spotType === 'free' && !image)}
                    >
                      {isSubmitting || loading ? 'Adding Spot...' : 'Add Parking Spot'}
                    </Button>

                    {/* Display Error Message if Any */}
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
      ));
}