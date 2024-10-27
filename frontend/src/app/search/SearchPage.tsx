"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from '@/components/ui/slider';
import { MapPin, Navigation, ChevronUp, ChevronDown, ChevronRight, ChevronLeft, ArrowDown, ArrowUp, DollarSign } from 'lucide-react';
import {
  Autocomplete,
  GoogleMap,
  LoadScriptNext,
  Marker,
  DirectionsRenderer,
  InfoWindow,
} from '@react-google-maps/api';
import { ParkingSpace } from '@/types/type';
import { searchSpots } from '@/features/search/searchSlice';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';

const default_center = {
  // Purdue University coords
  lat: 40.4137,
  lng: -86.9112,
};

export default function SearchPage() {
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
    { value: 'covered', label: 'Covered Parking' },
    { value: 'electric', label: 'Electric Charging' },
    { value: 'accessible', label: 'Accessible' },
    // Add more options as needed
  ];

  // New States for Filter Selection
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [paidStatus, setPaidStatus] = useState<string[]>([]); // Array to hold 'paid' and/or 'unpaid'

  const mapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const currentUrl = usePathname();
  const isLoggedIn = useAppSelector(state => state.user.isLoggedIn);


  useEffect(() => {
    // @ts-ignore
    dispatch({ type: 'search/resetSpots' })
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

    console.log(parkingSpots);
  }, []);

  useEffect(() => {
    if (useCurrentLocation && userLocation) {
      setMapCenter(userLocation);
    }
  }, [useCurrentLocation]);

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
          transform: scale(1.6);
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
    <circle cx="15" cy="15" r="9" fill="#4285F4" stroke="white" stroke-width="1" />
    <circle cx="15" cy="15" r="9" fill="rgba(66, 133, 244, 0.5)" class="pulsating-circle" stroke="white" stroke-width="1" />
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

  useEffect(() => {
    const handleListScroll = () => {
      if (listRef.current) {
        const scrollTop = listRef.current.scrollTop;
        if (scrollTop > 0) {
          setIsListExpanded(true);
        } else {
          setIsListExpanded(false);
        }
      }
    };

    const listElement = listRef.current;
    if (listElement) {
      listElement.addEventListener('scroll', handleListScroll);
    }

    return () => {
      if (listElement) {
        listElement.removeEventListener('scroll', handleListScroll);
      }
    };
  }, []);

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
    };

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
    if (!isLoggedIn) {
      setShowLoginModal(true); // Show login modal if not logged in
      return;
    }
    if (!parkingSpaceId) {
      return;
    }
    router.push(`/bookings/${parkingSpaceId}/reserve?previousUrl=${encodeURIComponent(currentUrl ?? '/search')}`);
  };

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
    { key: 'minPrice', label: 'Min Price' },
    { key: 'maxPrice', label: 'Max Price' },
    { key: 'startTime', label: 'Start Time' },
    { key: 'endTime', label: 'End Time' },
    // { key: 'features', label: 'Features' },
    { key: 'paidStatus', label: 'Paid Status' }, // New Paid Status Filter
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
      style={{ height: '100vh', overflow: 'hidden' }}
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
        animate={{ opacity: isSearchOpen ? 1 : 0.6 }}
      >
        <Card className={`w-3/4 sm:w-2/3 md:w-1/2 lg:w-2/5 max-h-[50vh] overflow-y-auto`}>
          <CardHeader className={`${isSearchOpen ? 'p-3 border-b' : 'py-0.5 px-4'}`} onClick={toggleSearch}>
            <div className="flex justify-between items-center cursor-pointer">
              <CardTitle className={`text-lg ${isSearchOpen ? 'text-xl' : 'text-base'}`}>Search for
                Parking</CardTitle>
              <Button variant="ghost" className="p-1 focus:outline-none" aria-label="Toggle Search Parameters">
                {isSearchOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </Button>
            </div>
          </CardHeader>

          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: isSearchOpen ? 'auto' : 0, opacity: isSearchOpen ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
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
                              const { value, checked } = e.target;
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
                              const { value, checked } = e.target;
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
                              const { value, checked } = e.target;
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
        className={`transition-all duration-300`}
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
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={mapCenter}
            zoom={14}
            options={{
              mapTypeControl: false,
              fullscreenControl: false,
              gestureHandling: 'greedy',
            }}
          >
            {Array.isArray(parkingSpots) && parkingSpots.map((spot: ParkingSpace) => (
              spot.location && (
                <Marker
                  key={spot.id}
                  position={{
                    lat: spot.location.latitude,
                    lng: spot.location.longitude,
                  }}
                  onClick={() => handleSpotSelect(spot)}
                  icon="https://maps.google.com/mapfiles/ms/icons/red-dot.png"
                />
              )
            ))}
            {userLocation && (
              <Marker
                position={userLocation}
                icon={{
                  url: encodedSVG,
                }}
              />
            )}
            {selectedSpot && selectedSpot.location && (
              <InfoWindow
                position={{
                  lat: selectedSpot.location.latitude,
                  lng: selectedSpot.location.longitude,
                }}
                onCloseClick={() => setSelectedSpot(null)}
              >
                <div className="text-sm">
                  <h2 className="font-semibold">{selectedSpot.name || 'Unnamed Parking Space'}</h2>
                  <p>Address: {selectedSpot.location.address || 'Not specified'}</p>
                  <p>Latitude: {selectedSpot.location.latitude.toFixed(4)}</p>
                  <p>Longitude: {selectedSpot.location.longitude.toFixed(4)}</p>
                  {/*{selectedSpot.features && selectedSpot.features.length > 0 && (*/}
                  {/*    <p>Features: {selectedSpot.features.join(', ')}</p>*/}
                  {/*)}*/}
                  <div className="flex items-center space-x-2">
                    <Button onClick={getDirections} className="mt-2 text-xs px-3 py-1">
                      <Navigation className="mr-1 h-4 w-4" />
                      Directions
                    </Button>
                    <Button onClick={() => { reserveSpot(selectedSpot.id) }} className="mt-2 text-xs px-3 py-1">
                      <DollarSign className="mr-1 h-4 w-4" />
                      Reserve
                    </Button>
                  </div>
                </div>
              </InfoWindow>
            )}
            {directions && <DirectionsRenderer directions={directions} />}
          </GoogleMap>
        </LoadScriptNext>

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <button onClick={handleArrowClick} className="focus:outline-none">
            {isListExpanded ? (
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center drop-shadow-md">
                  <ArrowDown size={24} className="text-gray-500" />
                </div>
              </motion.div>
            ) : (
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center drop-shadow-md">
                  <ArrowUp size={24} className="text-gray-500" />
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
                    <CardTitle className="text-base">{spot.name || 'Unnamed Parking Space'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {spot.location && (
                      <>
                        <p className="text-sm">Address: {spot.location.address || 'Not specified'}</p>
                        <p className="text-sm">Latitude: {spot.location.latitude.toFixed(4)}</p>
                        <p className="text-sm">Longitude: {spot.location.longitude.toFixed(4)}</p>
                      </>
                    )}
                    <p className="text-sm">Average Rating: {'No ratings'}</p>
                    <p className="text-sm">Availability: {'Available'}</p>
                    {/*{spot.features && spot.features.length > 0 && (*/}
                    {/*    <p className="text-sm">Features: {spot.features.join(', ')}</p>*/}
                    {/*)}*/}
                    <Button
                      onClick={() => handleSpotSelect(spot)}
                      className="mt-2 w-full text-sm px-3 py-2"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
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
        style={{ bottom: '64px', height: 'auto' }}
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
                  <div className="mt-0">
                    <h3 className="text-md font-semibold">Step {currentStepIndex + 1}</h3>
                    <div className="w-3"></div>
                    <div className="w-8"></div>
                    {directions && (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: directions.routes[0].legs[0].steps[currentStepIndex].instructions,
                        }}
                      />
                    )}
                    {directions && (
                      <div className="text-sm text-gray-600">
                        <p>Distance: {directions.routes[0].legs[0].steps[currentStepIndex].distance?.text ?? ''}</p>
                        <p>Duration: {directions.routes[0].legs[0].steps[currentStepIndex].duration?.text ?? ''}</p>
                      </div>
                    )}
                    <div className="flex justify-between mt-4">
                      <button
                        onClick={() => setCurrentStepIndex((prev) => Math.max(prev - 1, 0))}
                        className="px-3 py-2 bg-blue-500 text-white text-sm font-semibold rounded hover:bg-blue-700 focus:outline-none"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => {
                          if (directions) {
                            setCurrentStepIndex((prev) => Math.min(prev + 1, directions.routes[0].legs[0].steps.length - 1));
                          }
                        }}
                        className="px-3 py-2 bg-blue-500 text-white text-sm font-semibold rounded hover:bg-blue-700 focus:outline-none"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => setCurrentStepIndex(0)}
                        className="px-3 py-2 bg-green-500 text-white text-sm font-semibold rounded hover:bg-green-700 focus:outline-none"
                      >
                        Current
                      </button>
                    </div>
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
