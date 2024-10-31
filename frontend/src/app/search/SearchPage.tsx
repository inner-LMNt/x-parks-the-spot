"use client";

import React, {useEffect, useRef, useState, useCallback} from 'react';
import {motion} from 'framer-motion';
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Slider} from '@/components/ui/slider';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import {
  Autocomplete,
  GoogleMap,
  LoadScriptNext,
  Marker,
  DirectionsRenderer,
  InfoWindow,
} from '@react-google-maps/api';
import { markSpotTaken } from '@/features/parking-space/parkingSpaceSlice';
import { searchSpots } from '@/features/search/searchSlice';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  DollarSign,
  MapPin,
  Navigation,
  ParkingSquare,
  ShieldCheck,
  ShieldEllipsis,
  ShieldX
} from 'lucide-react';
import {DaysOfWeek, ParkingSpace, TimeSlot} from '@/types/type';
import axios from 'axios';
import Webcam from "react-webcam";
import {useToast} from '@/hooks/use-toast';

import ImageWrapper from "@/components/custom/ImageWrapper";
import {Badge} from "@/components/ui/badge";
import {components} from "@/types/generated";

const default_center = {
  // Purdue University coords
  lat: 40.4137,
  lng: -86.9112,
};

export default function SearchPage() {
  const {toast} = useToast();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const parkingSpots = useAppSelector((state) => state.search.spots);

  const [domLoaded, setDomLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpace | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(5);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(default_center);
  const [isListExpanded, setIsListExpanded] = useState(true);
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [navigationMode, setNavigationMode] = useState(false);
  const [reachedDestination, setReachedDestination] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [iconScale, setIconScale] = useState<google.maps.Size | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const navigationCardRef = useRef<HTMLDivElement>(null);
  const onLoadAutocomplete = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };
  const [showLoginModal, setShowLoginModal] = useState(false); // Track login modal state
  // Filter States
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [startTime, setStartTime] = useState<string | undefined>(undefined);
  const [endTime, setEndTime] = useState<string | undefined>(undefined);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const featuresOptions = [
    {value: 'covered', label: 'Covered Parking'},
    {value: 'electric', label: 'Electric Charging'},
    {value: 'accessible', label: 'Accessible'},
    // Add more options as needed
  ];

  // New States for Filter Selection
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [paidStatus, setPaidStatus] = useState<string[]>([]); // Array to hold 'paid' and/or 'unpaid'
  const [isCameraActive, setIsCameraActive] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const currentUrl = usePathname();
  const isLoggedIn = useAppSelector(state => state.user.isLoggedIn);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentSpotId, setCurrentSpotId] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const DISTANCE_THRESHOLD = 200; // Maximum distance in meters
  const [includeTakenSpots, setIncludeTakenSpots] = useState(false); // Default to showing only available spots

  const openUpdateStatusDialog = (spotId: string) => {
    setCurrentSpotId(spotId);
    setIsDialogOpen(true);
  };

  const closeUpdateStatusDialog = () => {
    setIsDialogOpen(false);
    setCurrentSpotId(null);
    setPhoto(null);
    setPreviewUrl(null); // Clear the preview
    setIsCameraActive(true); // Reset camera to active
  };

  const isWithinDistance = () => {
    if (!userLocation || !selectedSpot || !selectedSpot.location) {
      return false;
    }

    const spotLocation = {
      lat: selectedSpot.location.latitude,
      lng: selectedSpot.location.longitude,
    };

    const distance = calculateDistance(userLocation, spotLocation);
    console.log("Distance: ", distance)
    return distance <= DISTANCE_THRESHOLD;
  };
  /**
   * **Submit Spot Status Update**
   */
  const handleSubmit = async () => {
    if (!currentSpotId || !userLocation) {
      console.error("No spot selected or user location unavailable.");
      return;
    }

    // Prepare form data for API submission
    const formData = new FormData();
    formData.append('latitude', userLocation.lat.toString());
    formData.append('longitude', userLocation.lng.toString());
    if (photo) formData.append('photo', photo);

    // Wrap formData and currentSpotId in an object that matches markSpotTaken's expected parameter type
    const submissionData = {
      parkingSpaceId: currentSpotId,
      formData: formData,
    };

    try {
      await dispatch(markSpotTaken(submissionData)).unwrap();
      console.log("Spot status updated successfully.");
      toast({
        title: 'Spot Update Successful',
        description: 'The parking spot status was updated successfully.',
        variant: 'success', // Assuming 'success' variant exists in your toast setup
      });
      //closeUpdateStatusDialog();
    } catch (error) {
      console.error("Failed to update spot status:", error);
      toast({
        title: 'Spot Update Failed',
        description: 'Failed to update the parking spot status. Please try again.',
        variant: 'destructive', // Assuming 'destructive' variant exists for error messages
      });
    }
  }

  const handleCameraCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setPreviewUrl(imageSrc);
      fetch(imageSrc)
          .then((res) => res.blob())
          .then((blob) => {
            const file = new File([blob], 'camera_capture.jpg', {type: 'image/jpeg'});
            setPhoto(file);
            setIsCameraActive(false); // Switch to preview mode
          });
    }
  }, []);

  const handleRetake = () => {
    setPreviewUrl(null);
    setPhoto(null);
    setIsCameraActive(true); // Reactivate the camera
  };

  useEffect(() => {
    // @ts-ignore
    dispatch({type: 'search/resetSpots'})
    setDomLoaded(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setUserLocation(location);
            setMapCenter(location);
            setGeoEnabled(true);

            fetchAddressFromLocation(location);
          },
          () => {
            console.error("Error: The Geolocation service failed.");
            setGeoEnabled(false);
          }
      );
    } else {
      console.error("Error: Your browser doesn't support geolocation.");
      setGeoEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (useCurrentLocation && userLocation) {
      setMapCenter(userLocation);
    }
  }, [useCurrentLocation, userLocation]);

  const fetchAddressFromLocation = async (location: google.maps.LatLngLiteral) => {
    try {
      const geocodeResult = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
        params: {
          latlng: `${location.lat},${location.lng}`,
          key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      });

      if (geocodeResult.data.results.length > 0) {
        setAddress(geocodeResult.data.results[0].formatted_address);
      }
    } catch (error) {
      console.error('Error fetching address:', error);
    }
  };

  const enableGeolocation = (
      <div className="p-4 bg-gray-100 rounded-md">
        <p className="text-lg font-semibold mb-2">Please enable geolocation to search for parking spots near you.</p>
        <p className="mb-2">To enable geolocation:</p>
        <ol className="list-decimal list-inside ml-4">
          <li className="mb-1">Go to your browser settings.</li>
          <li className="mb-1">Allow location access for this site.</li>
          <li className="mb-1">Reload the page after enabling it.</li>
        </ol>
      </div>
  );

  const pulsatingCircleSVG = `
  <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
    <style>
      @keyframes pulsate {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.7);
          opacity: 0.5;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      .pulsating-circle {
        animation: pulsate 1.7s infinite;
        transform-origin: center;
      }
    </style>
    <circle cx="15" cy="15" r="9" fill="#4285F4" />
    <circle cx="15" cy="15" r="9" fill="rgba(66, 133, 244, 0.5)" class="pulsating-circle" />
  </svg>
  `;
  const encodedSVG = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(pulsatingCircleSVG);
  const onSearch = async () => {
    let location = userLocation;

    if (address && !useCurrentLocation) {
      try {
        const geocodeResult = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
          params: {
            address,
            key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
          },
        });

        if (geocodeResult.data.results.length > 0) {
          location = geocodeResult.data.results[0].geometry.location;
          setMapCenter(location ?? default_center);
        } else {
          console.error('No results found for the given address.');
          return;
        }
      } catch (error) {
        console.error('Error fetching geocode data:', error);
        return;
      }
    }

    if (!location) {
      console.error("User location is not available yet.");
      return;
    }

    const request: any = {
      latitude: location.lat,
      longitude: location.lng,
      radius: searchRadius,
      paid_status: 'ALL',
    };
    if (includeTakenSpots) {
      request.is_taken = true;
    } else {
      request.is_taken = false;
    }
    if (selectedFilters.includes('minPrice') && minPrice !== undefined) {
      request.min_price = minPrice;
    }

    if (selectedFilters.includes('maxPrice') && maxPrice !== undefined) {
      request.max_price = maxPrice;
    }

    if (selectedFilters.includes('startTime') && startTime) {
      request.start_time = startTime;
    }

    if (selectedFilters.includes('endTime') && endTime) {
      request.end_time = endTime;
    }

    if (selectedFilters.includes('features') && selectedFeatures.length > 0) {
      request.features = selectedFeatures;
    }

    if (selectedFilters.includes('paidStatus')) {
      if (paidStatus.length === 1) {
        if (paidStatus.includes('paid')) {
          request.paid_status = 'PAID';
        } else if (paidStatus.includes('unpaid')) {
          request.paid_status = 'UNPAID';
        }
      }
      // If both are selected or none are selected, do not set paid_status (i.e., 'ALL')
    }

    try {
      await dispatch(searchSpots(request));
      setIsSearchOpen(false);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleSpotSelect = (spot: ParkingSpace) => {
    console.log("Spot clicked:", spot)
    if (selectedSpot && selectedSpot.id === spot.id) {
      setSelectedSpot(null);
    } else {
      setSelectedSpot(spot);
      if (spot.location) {
        setMapCenter({
          lat: spot.location.latitude,
          lng: spot.location.longitude,
        });
      }
    }
    setDirections(null);
  };

  const handlePlaceSelect = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        setMapCenter(location);
        setSelectedLocation(location);
        setAddress(place.formatted_address || ''); // Update the address state
      }
    }
  };

  const getDirections = () => {
    if (selectedSpot && userLocation) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
          {
            origin: userLocation,
            destination: {
              lat: selectedSpot.location.latitude,
              lng: selectedSpot.location.longitude,
            },
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK) {
              setDirections(result);
              setNavigationMode(true);
              setIsListExpanded(false);
            } else {
              console.error(`error fetching directions ${result}`);
            }
          }
      );
    }
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  const handleArrowClick = () => {
    setIsListExpanded(!isListExpanded);
  };

  // Watch user location and check if within 50 feet of destination
  useEffect(() => {
    let watchId: number;

    if (navigationMode && selectedSpot) {
      watchId = navigator.geolocation.watchPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            // add random int to differentiate console logs
            console.log("User location updated:", location, Math.random());

            setUserLocation(location);
            updateCurrentStep(location);

            const distance = calculateDistance(location, {
              lat: selectedSpot.location.latitude,
              lng: selectedSpot.location.longitude,
            });

            console.log("Distance to destination:", distance);

            if (distance < 50) {
              setReachedDestination(true);
              setDirections(null);
            } else {
              setReachedDestination(false);
            }
          },
          (error) => {
            console.error("Error getting position:", error);
          },
          {
            enableHighAccuracy: false,
            maximumAge: 5000,
          }
      );
    }
    ;

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [navigationMode, selectedSpot]);

  useEffect(() => {
    let watchId: number;

    if (!navigationMode) {
      watchId = navigator.geolocation.watchPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            console.log("User location updated (non-navigation mode):", location, Math.random());

            setUserLocation(location);

            // You can add any additional logic here if needed
          },
          (error) => {
            console.error("Error getting position:", error);
          },
          {
            enableHighAccuracy: false,
            maximumAge: 5000,
          }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [navigationMode]);

  const calculateDistance = (location1: google.maps.LatLngLiteral, location2: google.maps.LatLngLiteral) => {
    const R = 6371e3; // meters
    const a1 = location1.lat * Math.PI / 180; // a, b in radians
    const a2 = location2.lat * Math.PI / 180;
    const da = (location2.lat - location1.lat) * Math.PI / 180;
    const db = (location2.lng - location1.lng) * Math.PI / 180;

    const a = Math.sin(da / 2) * Math.sin(da / 2) +
        Math.cos(a1) * Math.cos(a2) *
        Math.sin(db / 2) * Math.sin(db / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // in meters
    return distance; // convert to feet by multiplying 3.28084
  };

  const updateCurrentStep = (userLocation: google.maps.LatLngLiteral) => {
    if (directions) {
      const steps = directions.routes[0].legs[0].steps;
      let closestStepIndex = currentStepIndex;  // Start with the current step
      let closestDistance = calculateDistance(userLocation, {
        lat: steps[currentStepIndex].start_location.lat(),
        lng: steps[currentStepIndex].start_location.lng(),
      });

      // Iterate through steps to find the closest one
      for (let i = currentStepIndex; i < steps.length; i++) {
        const stepLocation = {
          lat: steps[i].start_location.lat(),
          lng: steps[i].start_location.lng(),
        };
        const distance = calculateDistance(userLocation, stepLocation);

        // Only consider steps ahead or the current step
        if (distance < closestDistance && i >= currentStepIndex) {
          closestStepIndex = i;
          closestDistance = distance;
          console.log("New closest step:", i, distance);
        }
      }

      // Update the step index only if a closer step is found
      if (closestStepIndex > currentStepIndex) {
        setCurrentStepIndex(closestStepIndex);
      }
    }
  };


  const handleSliderChange = (value: number[]) => {
    setSearchRadius(value[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseInt(e.target.value, 10);

    if (isNaN(value)) {
      value = 0;
    } else if (value > 5) {
      value = 5;
    } else if (value < 0) {
      value = 0;
    }

    setSearchRadius(value);
  };

  // Handle restricted actions and show modal if not logged in
  const reserveSpot = (parkingSpaceId: string | undefined) => {
    if (!parkingSpaceId) {
      return;
    }
    if (!isLoggedIn) {
      setShowLoginModal(true); // Show login modal if not logged in
      return;
    }
    if (!parkingSpaceId) {
      return;
    }
    router.push(`/bookings/${parkingSpaceId}/reserve?previousUrl=${encodeURIComponent(currentUrl ?? '/search')}`);
  };

  const renderSpots = (spots: ParkingSpace[]) => (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {spots.map((spot) => (
            <motion.div
                key={spot.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <CardContent className="pt-4">
                  {/* Display 'Taken' indicator if the spot is taken */}
                  {spot.is_taken && (
                      <Badge className="bg-red-500 text-white mb-2">Taken</Badge>
                  )}


                </CardContent>
              </Card>
            </motion.div>
        ))}
      </div>
  );


  useEffect(() => {
    const adjustMapHeight = () => {
      if (navigationCardRef.current) {
        const navigationCardHeight = navigationCardRef.current.offsetHeight;
        if (mapRef.current) {
          mapRef.current.style.height = `calc(100vh - 64px - ${navigationCardHeight}px)`;
        }
      }
    };

    adjustMapHeight();
    window.addEventListener('resize', adjustMapHeight);

    return () => {
      window.removeEventListener('resize', adjustMapHeight);
    };
  }, []);

  // Define available filters
  const availableFilters = [
    {key: 'minPrice', label: 'Min Price'},
    {key: 'maxPrice', label: 'Max Price'},
    {key: 'startTime', label: 'Start Time'},
    {key: 'endTime', label: 'End Time'},
    // { key: 'features', label: 'Features' },
    {key: 'paidStatus', label: 'Paid Status'}, // New Paid Status Filter
    //{key: 'allowTaken', label: 'Include Taken Spots'},
  ];

  // Handle Deselect All
  const handleDeselectAll = () => {
    setSelectedFilters([]);
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setStartTime(undefined);
    setEndTime(undefined);
    //setSelectedFeatures([]);
    setPaidStatus([]);
  };

  const getAvailableDays = (availabilitySchedule: components["schemas"]["TimeSlot"][] | undefined) => {
    if (!availabilitySchedule || availabilitySchedule.length === 0) {
      return [];
    }
    const daysOfWeekOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const days = availabilitySchedule.map(({day_of_week}) => day_of_week);
    return days.sort(
        (a, b) => daysOfWeekOrder.indexOf(a) - daysOfWeekOrder.indexOf(b)
    );
  };

// Helper function to determine the time range
  const getTimeRange = (availabilitySchedule: any) => {
    if (!availabilitySchedule || availabilitySchedule.length === 0) {
      return '';
    }

    // Get all unique time ranges
    const timeRanges = new Set(
        // @ts-ignore
        availabilitySchedule.map(({start_time, end_time}) => `${start_time} - ${end_time}`)
    );

    // If only one time range exists
    if (timeRanges.size === 1) {
      const timeRange = timeRanges.values().next().value;
      // Check if time range is 00:00 - 23:59
      if (timeRange === '00:00 - 23:59') {
        return '24 hours';
      } else {
        return `${timeRange}`;
      }
    } else {
      // Multiple time ranges
      return 'Various times';
    }
  };

// Helper function to check if the spot is available 24/7
  const isAvailable247 = (availabilitySchedule: any) => {
    if (!availabilitySchedule || availabilitySchedule.length === 0) {
      return false;
    }
    //@ts-ignore
    const days = availabilitySchedule.map(({day_of_week}) => day_of_week);
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Check if all days are included
    const hasAllDays = daysOfWeek.every((day: any) => days.includes(day));

    // Check if time is 00:00 - 23:59 for all entries
    const isAllTime247 = availabilitySchedule.every(
        //@ts-ignore
        ({start_time, end_time}) => start_time === '00:00' && end_time === '23:59'
    );

    return hasAllDays && isAllTime247;
  };

  // Function to close the modal
  const closeLoginModal = () => {
    setShowLoginModal(false);
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setStartTime(undefined);
    setEndTime(undefined);
    //setSelectedFeatures([]);
    setPaidStatus([]);
  };

  return (domLoaded &&

      <div
          className="min-h-screen bg-gray-50 text-gray-900 flex flex-col"
          style={{height: '100vh', overflow: 'hidden'}}
      >
        <script src="https://maps.googleapis.com/maps/api/js?sensor=false"></script>

        {/* Show login button next to search if the user is not logged in */}
        {!isLoggedIn && (
            <div className="fixed top-2 right-4 z-10">
              <Button
                  onClick={() => router.push('/login')}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-md"
              >
                Log In
              </Button>
            </div>
        )}

        {/* Show login modal when not logged in and trying to perform restricted actions */}
        {showLoginModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-lg font-bold mb-4">You need to log in to perform this action</h2>
                <p className="mb-4">Please log in to continue reserving a parking spot.</p>
                <div className="flex justify-end">
                  <Button
                      onClick={() => router.push('/login')}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md"
                  >
                    Log In
                  </Button>
                  <Button
                      onClick={closeLoginModal}
                      className="ml-2 bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
        )}

        <motion.div
            className={`fixed ${!isLoggedIn ? 'top-12' : 'top-2'} w-full flex justify-center z-50 transition-all duration-300`}
            animate={{opacity: isSearchOpen ? 1 : 0.6}}
        >
          <Card className={`w-3/4 sm:w-2/3 md:w-1/2 lg:w-2/5 max-h-[50vh] overflow-y-auto`}>
            <CardHeader className={`${isSearchOpen ? 'p-3 border-b' : 'py-0.5 px-4'}`} onClick={toggleSearch}>
              <div className="flex justify-between items-center cursor-pointer">
                <CardTitle className={`text-lg ${isSearchOpen ? 'text-xl' : 'text-base'}`}>Search for
                  Parking</CardTitle>
                <Button variant="ghost" className="p-1 focus:outline-none" aria-label="Toggle Search Parameters">
                  {isSearchOpen ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                </Button>
              </div>
            </CardHeader>

            <motion.div
                initial={{height: 0, opacity: 0}}
                animate={{height: isSearchOpen ? 'auto' : 0, opacity: isSearchOpen ? 1 : 0}}
                transition={{duration: 0.3}}
                style={{overflow: 'hidden'}}
            >
              {geoEnabled ? (
                  <CardContent className="pt-2 pb-3">
                    <div className="flex flex-col">
                      <div className="flex items-center mb-4">
                        <input
                            type="checkbox"
                            id="use-current-location"
                            checked={useCurrentLocation}
                            onChange={(e) => setUseCurrentLocation(e.target.checked)}
                            className="mr-2"
                        />
                        <Label htmlFor="use-current-location" className="text-sm">Use Current Location</Label>
                      </div>

                      <div className="flex flex-col mb-4 max-h-[80vh]">
                        <Label htmlFor="radius" className="text-sm mb-1">
                          Radius (km):
                        </Label>
                        <div className="flex items-center space-x-4">
                          <div className="flex-grow">
                            <Slider
                                id="radius-slider"
                                value={[searchRadius]}
                                onValueChange={handleSliderChange}
                                min={0.1}
                                max={5}
                                step={0.1}
                                className="w-full opacity-100"
                                aria-label="Radius Slider"
                            />
                          </div>

                          <Input
                              id="radius-input"
                              type="number"
                              value={searchRadius}
                              onChange={handleInputChange}
                              className="w-20 text-sm"
                              min={0.1}
                              max={5}
                              aria-label="Radius Input"
                          />
                        </div>
                      </div>

                      {/* Filter Selection Field */}
                      <div className="flex flex-col mb-4">
                        <Label className="text-sm mb-1">Select Filters:</Label>
                        <div className="flex flex-wrap">
                          {availableFilters.map((filter) => (
                              <label key={filter.key} className="mr-4 mb-2 flex items-center">
                                <input
                                    type="checkbox"
                                    value={filter.key}
                                    checked={selectedFilters.includes(filter.key)}
                                    onChange={(e) => {
                                      const {value, checked} = e.target;
                                      if (checked) {
                                        setSelectedFilters([...selectedFilters, value]);
                                      } else {
                                        setSelectedFilters(selectedFilters.filter((f) => f !== value));
                                        // Reset the filter values when unselected
                                        switch (value) {
                                          case 'minPrice':
                                            setMinPrice(undefined);
                                            break;
                                          case 'maxPrice':
                                            setMaxPrice(undefined);
                                            break;
                                          case 'startTime':
                                            setStartTime(undefined);
                                            break;
                                          case 'endTime':
                                            setEndTime(undefined);
                                            break;
                                          case 'features':
                                            //setSelectedFeatures([]);
                                            break;
                                          case 'paidStatus':
                                            setPaidStatus([]); // Reset to default (no selection)
                                            break;
                                          default:
                                            break;
                                        }
                                      }
                                    }}
                                    className="mr-2"
                                />
                                <span className="text-sm">{filter.label}</span>
                              </label>
                          ))}
                        </div>
                        {/* Deselect All Button */}
                        {selectedFilters.length > 0 && (
                            <Button
                                onClick={handleDeselectAll}
                                className="mt-2 text-sm px-4 py-2 self-start"
                                variant="secondary"
                            >
                              Deselect All
                            </Button>
                        )}
                      </div>

                      {/* Dynamically Rendered Filters */}
                      {selectedFilters.includes('minPrice') && (
                          <div className="flex flex-col mb-4">
                            <Label htmlFor="min_price" className="text-sm mb-1">Min Price:</Label>
                            <Input
                                id="min_price"
                                type="number"
                                value={minPrice}
                                onChange={(e) => setMinPrice(parseFloat(e.target.value))}
                                className="w-full text-sm"
                                min={0}
                                placeholder="Enter minimum price"
                            />
                          </div>
                      )}

                      {selectedFilters.includes('maxPrice') && (
                          <div className="flex flex-col mb-4">
                            <Label htmlFor="max_price" className="text-sm mb-1">Max Price:</Label>
                            <Input
                                id="max_price"
                                type="number"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(parseFloat(e.target.value))}
                                className="w-full text-sm"
                                min={0}
                                placeholder="Enter maximum price"
                            />
                          </div>
                      )}

                      {selectedFilters.includes('startTime') && (
                          <div className="flex flex-col mb-4">
                            <Label htmlFor="start_time" className="text-sm mb-1">Start Time:</Label>
                            <Input
                                id="start_time"
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full text-sm"
                            />
                          </div>
                      )}

                      {selectedFilters.includes('endTime') && (
                          <div className="flex flex-col mb-4">
                            <Label htmlFor="end_time" className="text-sm mb-1">End Time:</Label>
                            <Input
                                id="end_time"
                                type="datetime-local"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full text-sm"
                            />
                          </div>
                      )}



                      {/*{selectedFilters.includes('features') && (*/}
                      {/*    <div className="flex flex-col mb-4">*/}
                      {/*      <Label htmlFor="features" className="text-sm mb-1">Features:</Label>*/}
                      {/*      <div className="bg-white shadow-lg rounded-lg mt-2 p-4">*/}
                      {/*        {featuresOptions.map(({ value, label }) => (*/}
                      {/*            <label key={value} className="flex items-center mb-2">*/}
                      {/*              <input*/}
                      {/*                  type="checkbox"*/}
                      {/*                  value={value}*/}
                      {/*                  checked={selectedFeatures.includes(value)}*/}
                      {/*                  onChange={(e) => {*/}
                      {/*                    setSelectedFeatures(*/}
                      {/*                        e.target.checked*/}
                      {/*                            ? [...selectedFeatures, value]*/}
                      {/*                            : selectedFeatures.filter((feature) => feature !== value)*/}
                      {/*                    );*/}
                      {/*                  }}*/}
                      {/*                  className="mr-2"*/}
                      {/*              />*/}
                      {/*              <span className="text-sm">{label}</span>*/}
                      {/*            </label>*/}
                      {/*        ))}*/}
                      {/*      </div>*/}
                      {/*    </div>*/}
                      {/*)}*/}

                      {selectedFilters.includes('paidStatus') && (
                          <div className="flex flex-col mb-4">
                            <Label className="text-sm mb-1">Paid Status:</Label>
                            <div className="flex items-center bg-white shadow-lg rounded-lg mt-2 p-4">
                              <label className="mr-4 flex items-center">
                                <input
                                    type="checkbox"
                                    value="paid"
                                    checked={paidStatus.includes('paid')}
                                    onChange={(e) => {
                                      const {value, checked} = e.target;
                                      if (checked) {
                                        setPaidStatus([...paidStatus, value]);
                                      } else {
                                        setPaidStatus(paidStatus.filter((status) => status !== value));
                                      }
                                    }}
                                    className="mr-2"
                                />
                                <span className="text-sm">Paid</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    value="unpaid"
                                    checked={paidStatus.includes('unpaid')}
                                    onChange={(e) => {
                                      const {value, checked} = e.target;
                                      if (checked) {
                                        setPaidStatus([...paidStatus, value]);
                                      } else {
                                        setPaidStatus(paidStatus.filter((status) => status !== value));
                                      }
                                    }}
                                    className="mr-2"
                                />
                                <span className="text-sm">Unpaid</span>
                              </label>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Select both or none for no restriction.</p>
                          </div>
                      )}

                      {/* Address Field (if not using current location) */}
                      {!useCurrentLocation && (
                          <div className="flex flex-col mb-4">
                            <Label htmlFor="address" className="text-sm mb-1">Near (Address):</Label>
                            <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={handlePlaceSelect}
                                          className="w-full">
                              <Input
                                  id="address"
                                  type="text"
                                  value={address}
                                  onChange={(e) => setAddress(e.target.value)}
                                  className="w-full text-sm"
                                  placeholder="Enter an address"
                              />
                            </Autocomplete>
                          </div>
                      )}
                      {/* Add Include Taken Spots as a standalone option */}
                      <div className="flex flex-col mb-4">
                        <div className="flex items-center">
                          <input
                              type="checkbox"
                              id="include_taken"
                              checked={includeTakenSpots}
                              onChange={(e) => setIncludeTakenSpots(e.target.checked)}
                              className="mr-2"
                          />
                          <Label htmlFor="include_taken" className="text-sm">Include Taken Spots</Label>
                        </div>
                      </div>

                      <Button onClick={onSearch} className="w-auto text-sm px-4 py-2">
                        Search
                      </Button>
                    </div>
                  </CardContent>
              ) : (
                  <CardContent className="pt-2">
                    <div className="p-4 bg-gray-100 rounded-md">
                      <p className="text-lg font-semibold mb-2">Please enable geolocation to search for parking spots
                        near you.</p>
                      <p className="mb-2">To enable geolocation:</p>
                      <ol className="list-decimal list-inside ml-4">
                        <li className="mb-1">Go to your browser settings.</li>
                        <li className="mb-1">Allow location access for this site.</li>
                        <li className="mb-1">Reload the page after enabling it.</li>
                      </ol>
                    </div>
                  </CardContent>
              )}
            </motion.div>
          </Card>
        </motion.div>

        <div
            ref={mapRef}
            className="transition-all duration-300"
            style={{
              height: isLoggedIn ? (isListExpanded ? `calc(100vh - 64px)` : '50vh') : (isListExpanded ? '100vh' : '50vh'),
              flexShrink: 0,
              position: 'relative',
            }}
        >
          <LoadScriptNext
              googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string}
              libraries={['places']}
          >
            <GoogleMap
                mapContainerStyle={{width: '100%', height: '100%'}}
                center={mapCenter}
                zoom={14}
                options={{
                  mapTypeControl: false,
                  fullscreenControl: false,
                  gestureHandling: 'greedy',
                }}
            >
              {(parkingSpots || []).map((spot: ParkingSpace) => (
                  spot.location && (
                      <Marker
                          key={spot.id}
                          position={{
                            lat: spot.location.latitude,
                            lng: spot.location.longitude,
                          }}
                          onClick={() => handleSpotSelect(spot)}
                      />
                  )
              ))}

              {mapCenter && (
                  <Marker
                      position={mapCenter}
                      icon="https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                  />
              )}

              {selectedSpot && selectedSpot.location && (
                  <>
                    {/* Dialog for Image Modal */}
                    <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
                      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90">
                        <div className="relative w-96 h-[80vh]">
                          <ImageWrapper
                              src={selectedSpot.photos?.[0] || ''}
                              alt={selectedSpot.name || 'Parking Spot'}
                              layout="fill"
                              objectFit="contain"
                              className="object-contain"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Info Window */}
                    <InfoWindow
                        position={{
                          lat: selectedSpot.location.latitude,
                          lng: selectedSpot.location.longitude,
                        }}
                        onCloseClick={() => setSelectedSpot(null)}
                    >
                      <div className="w-56 p-1 text-xs">
                        <div className="flex items-center gap-1 mb-1">
                          <h2 className="font-bold text-sm truncate">
                            {selectedSpot.name || 'Unnamed Parking Space'}
                          </h2>
                          {selectedSpot.verification_status === 'verified' && (
                              <ShieldCheck className="w-4 h-4 text-green-500"/>
                          )}
                          {selectedSpot.verification_status === 'pending' && (
                              <ShieldEllipsis className="w-4 h-4 text-yellow-500"/>
                          )}
                          {(!selectedSpot.verification_status || selectedSpot.verification_status === 'rejected') && (
                              <ShieldX className="w-4 h-4 text-red-500"/>
                          )}
                        </div>

                        {selectedSpot.photos?.[0] && (
                            <div
                                onClick={() => setShowImageModal(true)}
                                className="relative w-full h-20 mb-1 overflow-hidden rounded cursor-pointer group"
                            >
                              <div
                                  className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10"/>
                              <ImageWrapper
                                  src={selectedSpot.photos[0]}
                                  alt={selectedSpot.name || 'Parking Spot'}
                                  layout="fill"
                                  objectFit="cover"
                                  className="object-cover"
                              />
                            </div>
                        )}

                        <p className="truncate text-gray-600 text-[10px] mb-1">📍 {selectedSpot.location.address || 'No Address Found'}</p>
                        <p className="text-gray-500 text-[10px] mb-1">
                          {selectedSpot.location.latitude.toFixed(4)}, {selectedSpot.location.longitude.toFixed(4)}
                        </p>

                        <div className="flex gap-1">
                          <Button onClick={getDirections} className="flex-1 h-6 text-[10px]" variant="outline">
                            <Navigation className="mr-1 h-3 w-3"/>
                            Navigate
                          </Button>
                          {selectedSpot.is_paid ? (
                              <Button onClick={() => reserveSpot(selectedSpot.id)} className="flex-1 h-6 text-[10px]"
                                      variant="default">
                                <DollarSign className="mr-1 h-3 w-3"/>
                                Reserve
                              </Button>
                          ) : (
                              <div>
                              </div>

                          )}

                        </div>

                        {/* ShadCN Dialog */}
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            {!selectedSpot.is_paid && !selectedSpot.is_taken && (
                            <Button onClick={() => selectedSpot.id && openUpdateStatusDialog(selectedSpot.id)}>
                              Update Spot Status
                            </Button>
                            )}
                          </DialogTrigger>

                          <DialogPortal>
                            <DialogOverlay/>
                            <DialogContent className="bg-white p-6 rounded-lg shadow-lg w-full">
                              <DialogHeader>
                                <DialogTitle className="text-lg text-gray-800 font-bold">Submit Verification
                                  Photo</DialogTitle>
                                <DialogDescription className="text-sm text-gray-500">
                                  Use your camera to take a photo for verification.
                                </DialogDescription>
                              </DialogHeader>

                              {isWithinDistance() ? (
                                  previewUrl ? (
                                      <>
                                        <img src={previewUrl || undefined} alt="Preview"
                                             className="w-full mt-4 rounded-lg"/>
                                        <div className="flex mt-4 space-x-2">
                                          <Button onClick={handleRetake}
                                                  className="bg-yellow-500 text-white py-2 rounded-lg">
                                            Retake
                                          </Button>
                                          <DialogClose asChild>
                                            <Button onClick={handleSubmit}
                                                    className="bg-green-500 text-white py-2 rounded-lg">
                                              Submit Photo
                                            </Button>
                                          </DialogClose>
                                          <Button onClick={closeUpdateStatusDialog}
                                                  className="bg-gray-300 text-gray-800 py-2 rounded-lg">
                                            Cancel
                                          </Button>
                                        </div>
                                      </>
                                  ) : (
                                      <>
                                        <div className="mt-4 w-full flex justify-center">
                                          <Webcam
                                              audio={false}
                                              ref={webcamRef}
                                              screenshotFormat="image/jpeg"
                                              className="w-full rounded-lg"
                                          />
                                        </div>
                                        <Button
                                            onClick={handleCameraCapture}
                                            className="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
                                        >
                                          Capture Photo
                                        </Button>
                                        <Button onClick={closeUpdateStatusDialog}
                                                className="mt-2 w-full bg-gray-300 text-gray-800 py-2 rounded-lg">
                                          Cancel
                                        </Button>
                                      </>
                                  )
                              ) : (
                                  <div className="mt-4 text-center text-red-500 font-semibold">
                                    You are too far away from the parking spot to upload a verification photo.
                                    <p className="text-sm mt-2">Move closer to the spot and try again.</p>
                                  </div>
                              )}
                            </DialogContent>
                          </DialogPortal>
                        </Dialog>
                      </div>
                    </InfoWindow>
                  </>
              )}

              {directions && <DirectionsRenderer directions={directions}/>}
            </GoogleMap>
          </LoadScriptNext>

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <button onClick={handleArrowClick} className="focus:outline-none">
              {isListExpanded ? (
                  <motion.div animate={{y: [0, 10, 0]}} transition={{repeat: Infinity, duration: 1}}>
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center drop-shadow-md">
                      <ArrowDown size={24} className="text-gray-500"/>
                    </div>
                  </motion.div>
              ) : (
                  <motion.div animate={{y: [0, 10, 0]}} transition={{repeat: Infinity, duration: 1}}>
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center drop-shadow-md">
                      <ArrowUp size={24} className="text-gray-500"/>
                    </div>
                  </motion.div>
              )}
            </button>
          </div>
        </div>


        <div className="flex-grow overflow-y-auto" ref={listRef}>
          <div className="mx-auto max-w-xl p-4">
            {!Array.isArray(parkingSpots) || parkingSpots?.length === 0 ? (
                <p className="text-center text-gray-500">No parking spots found. Try searching.</p>
            ) : (
                <div className="grid grid-cols-1 gap-4">

                  {(parkingSpots).map((spot: ParkingSpace) => (
                      <Card key={spot.id} className="shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center justify-between">
                            {spot.name || 'Unnamed Parking Space'}
                            {spot.is_taken ? (
                                    <span className="ml-2 text-orange-600 flex items-center">
            <ShieldX className="h-4 w-4 mr-1"/>
            Taken: Free
        </span>

                            ) : (
                                spot.is_paid ? (
                                    <span className="ml-2 text-green-600 flex items-center">
            <DollarSign className="h-4 w-4 mr-1"/>
            Paid
        </span>
                                ) : (
                                    <span className="ml-2 text-blue-600 flex items-center">
            <ParkingSquare className="h-4 w-4 mr-1"/>
            Free
        </span>
                                )
                            )}

                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {spot.is_paid && (
                              <>
                                <p className="text-md">
                                  Price: ${spot?.pricing_info?.base_price || 'N/A'}
                                </p>
                                {isAvailable247(spot.availability_schedule) ? (
                                    <p className="text-md mt-2">Available 24/7</p>
                                ) : (
                                    <div className="flex items-center flex-wrap mt-2">
                                      <p className="text-md mr-2">Available:</p>
                                      {getAvailableDays(spot.availability_schedule).map((day) => (
                                          <Badge key={day} className="mr-1 mb-1" variant="secondary">
                                            {day.slice(0, 3)}
                                          </Badge>
                                      ))}
                                      <div className="flex">
                                        Hours:
                                        <p className="text-md ml-2">{getTimeRange(spot.availability_schedule)}</p>
                                      </div>

                                    </div>
                                )}
                                <p className="text-md">Address: {spot.location.address || 'Not specified'}</p>
                                <p className="text-md">Average Rating: {'No ratings'}</p>
                              </>
                          )}
                          {!spot.is_paid && spot.location && (
                              <p className="text-md">Location: {spot.location.longitude}, {spot.location.longitude}</p>
                          )}
                          <Button
                              onClick={() => handleSpotSelect(spot)}
                              className="mt-2 w-full text-sm px-3 py-2 flex items-center justify-center"
                          >
                            <MapPin className="mr-2 h-4 w-4"/>
                            Select
                          </Button>
                        </CardContent>
                      </Card>
                  ))}
                </div>
            )}
          </div>
          <div className="flex h-16">
          </div>
        </div>
        {/* navigation stuff */}
        <div
            ref={navigationCardRef}
            className={`fixed bottom-0 left-0 w-full bg-gray-100 p-4 transition-transform duration-300 transform ${navigationMode ? 'translate-y-0' : 'translate-y-full'
            }`}
            style={{bottom: '64px', height: 'auto'}}
        >
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row justify-between items-center w-full">

              <CardTitle className="text-lg">Directions</CardTitle>
              {navigationMode && (
                  <button
                      onClick={() => {
                        setNavigationMode(false);
                        setCurrentStepIndex(0);
                        setDirections(null);
                      }}
                      className="mt-2 px-3 py-2 bg-red-500 text-white text-sm font-semibold rounded hover:bg-red-700 focus:outline-none"
                  >
                    Exit Navigation
                  </button>
              )}
            </CardHeader>
            <CardContent>
              {navigationMode ? (
                  reachedDestination ? (
                      <div className="text-center">
                        <h3 className="text-md font-semibold mb-4">You've reached your destination</h3>
                      </div>
                  ) : (
                      <div>
                        {/* <h3 className="text-md font-semibold">From: {userLocation?.lat}, {userLocation?.lng}</h3>
                  <h3 className="text-md font-semibold">To: {selectedSpot?.location.latitude}, {selectedSpot?.location.longitude}</h3> */}
                        {/* <div className="border-b border-gray-300 my-4"></div> */}
                        <div className="mt-0">
                          <h3 className="text-md font-semibold">Step {currentStepIndex + 1}</h3>
                          <div className="w-3"></div>

                          {/* <div className="flex items-center justify-between"> // Do we want this feature?
                      <button
                        onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                        disabled={currentStepIndex === 0}
                        className="px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded focus:outline-none"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <h3 className="text-md font-semibold">Step {currentStepIndex + 1}</h3>
                      <button
                        onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                        disabled={currentStepIndex === directions.routes[0].legs[0].steps.length - 1}
                        className="px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded focus:outline-none"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div> */}
                          <div className="w-8"></div>
                          {directions && (
                              <span
                                  dangerouslySetInnerHTML={{__html: directions.routes[0].legs[0].steps[currentStepIndex].instructions}}/>
                          )}
                          {directions && (
                              <div className="text-sm text-gray-600">
                                <p>Distance: {directions.routes[0].legs[0].steps[currentStepIndex].distance?.text ?? ''}</p>
                                <p>Duration: {directions.routes[0].legs[0].steps[currentStepIndex].duration?.text ?? ''}</p>
                              </div>
                          )}
                        </div>
                      </div>
                  )
              ) : (
                  <p className="text-sm text-gray-500">No directions available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
