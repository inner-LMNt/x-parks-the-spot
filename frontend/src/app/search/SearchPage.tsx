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
import { ParkingSpace, SearchRequest } from '@/types/type';
import { searchSpots } from '@/features/search/searchSlice';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';

const default_center = {
  // Purdue University coords
  lat: 40.4237,
  lng: -86.9212,
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
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navigationMode, setNavigationMode] = useState(false);
  const [reachedDestination, setReachedDestination] = useState(false);

  const onLoadAutocomplete = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const mapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const currentUrl = usePathname();

  // Fetch user location on component mount
  useEffect(() => {
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

          fetchAddressFromLocation(location); // Runtime error with this line, need to fix
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

  // Handle search action
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
          setMapCenter(location ?? default_center); // Center map on the geocoded location or default center
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
      return; // if location is unavailable
    }

    console.log("location", location);

    const request: SearchRequest = {
      latitude: location.lat,
      longitude: location.lng,
      radius: searchRadius,
    };

    try {
      // @ts-ignore
      await dispatch(searchSpots(request));
      // Close the search bar after search
      setIsSearchOpen(false);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  // Handle parking spot selection
  const handleSpotSelect = (spot: ParkingSpace) => {
    if (selectedSpot && selectedSpot.id === spot.id) {
      setSelectedSpot(null);
      console.log("Deselected:", spot);
    } else {
      setSelectedSpot(spot);
      setMapCenter({
        lat: spot.location.latitude,
        lng: spot.location.longitude,
      });
      console.log("Selected:", spot);
    }
    setDirections(null);
  };

  // for autocomplete
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

  // Get directions to the selected parking spot
  const getDirections = () => {
    if (useCurrentLocation && selectedSpot && userLocation) {
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
          } else {
            console.error(`error fetching directions ${result}`);
          }
        }
      );
    }

    console.log("Directions:", directions);
  };

  // Toggle search bar visibility
  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
  };
  const handleArrowClick = () => {
    setIsMapExpanded(!isMapExpanded);
  };

  // Scroll handler for the parking spots list
  useEffect(() => {
    const handleListScroll = () => {
      if (listRef.current) {
        const scrollTop = listRef.current.scrollTop;
        if (scrollTop > 0) {
          setIsMapExpanded(false);
        } else {
          setIsMapExpanded(true);
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

  // for navigation mode
  useEffect(() => {
    if (directions) {
      setNavigationMode(true);
      setSidebarOpen(true);
    } else {
      setNavigationMode(false);
      setSidebarOpen(false);
    }
  }, [directions]);

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
          setUserLocation(location);

          const distance = calculateDistance(location, {
            lat: selectedSpot.location.latitude,
            lng: selectedSpot.location.longitude,
          });

          if (distance <= 50) {
            setReachedDestination(true);
          } else {
            setReachedDestination(false);
          }
        },
        (error) => {
          console.error("Error watching position:", error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000,
        }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [navigationMode, selectedSpot]);

  const calculateDistance = (location1: google.maps.LatLngLiteral, location2: google.maps.LatLngLiteral) => {
    const R = 6371e3; // metres
    const φ1 = location1.lat * Math.PI / 180; // φ, λ in radians
    const φ2 = location2.lat * Math.PI / 180;
    const Δφ = (location2.lat - location1.lat) * Math.PI / 180;
    const Δλ = (location2.lng - location1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // in metres
    return distance * 3.28084; // convert to feet
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

  const reserveSpot = (parkingSpaceId: string | undefined) => {
    if (!parkingSpaceId) {
      return;
    }
    router.push(`/bookings/${parkingSpaceId}/reserve?previousUrl=${encodeURIComponent(currentUrl ?? '/search')}`);
  }

  return (domLoaded &&
    <div
      className="min-h-screen bg-gray-50 text-gray-900 flex flex-col"
      style={{ height: '100vh', overflow: 'hidden' }}
    >
      <motion.div
        className={`fixed top-2 w-full flex justify-center z-50 transition-all duration-300`}
        animate={{ opacity: isSearchOpen ? 1 : 0.6 }}
      >
        <Card className={`w-3/4 sm:w-2/3 md:w-1/2 lg:w-2/5`}>
          <CardHeader
            className={`${isSearchOpen ? 'p-3 border-b' : 'py-0.5 px-4'}`}
            onClick={toggleSearch} // Make the entire header clickable
          >
            <div className="flex justify-between items-center cursor-pointer">
              <CardTitle className={`text-lg ${isSearchOpen ? 'text-xl' : 'text-base'}`}>
                Search for Parking
              </CardTitle>
              <Button
                variant="ghost"
                className="p-1 focus:outline-none"
                aria-label="Toggle Search Parameters"
              >
                {isSearchOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </Button>
            </div>
          </CardHeader>

          <motion.div
            // card animation
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

                  <div className="flex flex-col mb-4">
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

                  {!useCurrentLocation && (
                    <div className="flex flex-col mb-4">
                      <Label htmlFor="address" className="text-sm mb-1">Near (Address):</Label>
                      <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={handlePlaceSelect} className="w-full">
                        <Input
                          id="address"
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full text-sm"
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
                {enableGeolocation}
              </CardContent>
            )}
          </motion.div>
        </Card>
      </motion.div>

      {/* Map */}
      <div
        ref={mapRef}
        className={`transition-all duration-300`}
        style={{
          height: isMapExpanded ? `calc(100vh - 64px)` : '50vh',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <LoadScriptNext googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
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
            {parkingSpots.map((spot: ParkingSpace) => (
              <Marker
                key={spot.id}
                position={{
                  lat: spot.location.latitude,
                  lng: spot.location.longitude,
                }}
                onClick={() => handleSpotSelect(spot)}
              />
            ))}
            {userLocation && useCurrentLocation && (
              <Marker
                position={userLocation}
                icon={{
                  url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                  // scaledSize: new google.maps.Size(40, 40),
                }}
              />
            )}
            {selectedLocation && !useCurrentLocation && (
              <Marker
                position={selectedLocation}
                icon={{
                  url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                  // scaledSize: new google.maps.Size(40, 40),
                }}
              />
            )}

            {selectedSpot && !directions && (
              <InfoWindow
                position={{
                  lat: selectedSpot.location.latitude,
                  lng: selectedSpot.location.longitude,
                }}
                onCloseClick={() => setSelectedSpot(null)}
              >
                <div className="text-sm">
                  <h2 className="font-semibold">Address: {selectedSpot.location.address}</h2>
                  <p>Latitude: {selectedSpot.location.latitude.toFixed(4)}</p>
                  <p>Longitude: {selectedSpot.location.longitude.toFixed(4)}</p>
                  <div className="flex items-center space-x-2">
                    <Button onClick={getDirections} className="mt-2 text-xs px-3 py-1">
                      <Navigation className="mr-1 h-4 w-4" />
                      Directions
                    </Button>
                    {selectedSpot.is_paid && (
                      <Button onClick={() => { reserveSpot(selectedSpot.id) }} className="mt-2 text-xs px-3 py-1">
                        <DollarSign className="mr-1 h-4 w-4" />
                        Reserve
                      </Button>
                    )}
                  </div>
                </div>
              </InfoWindow>
            )}
            {directions && <DirectionsRenderer directions={directions} />}
          </GoogleMap>
        </LoadScriptNext>

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <button onClick={handleArrowClick} className="focus:outline-none">
            {isMapExpanded ? (
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

      {/* Parking Spots List */}
      <div className="flex-grow overflow-y-auto" ref={listRef}>
        <div className="mx-auto max-w-xl p-4">
          {parkingSpots.length === 0 ? (
            <p className="text-center text-gray-500">No parking spots found. Try searching.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {parkingSpots.map((spot: ParkingSpace) => (
                <Card key={spot.id} className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Parking Spot {spot.id}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Owner ID: {spot.owner_id}</p>
                    <p className="text-sm">Latitude: {spot.location.latitude.toFixed(4)}</p>
                    <p className="text-sm">Longitude: {spot.location.longitude.toFixed(4)}</p>
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
      </div>

      {/* Sidebar on the right */}
      <div
        className={
          'fixed top-0 right-0 h-full w-2/5 bg-gray-100 p-4 transition-transform duration-300 transform overflow-y-auto ' +
          (sidebarOpen ? 'translate-x-0' : 'translate-x-full')
        }
        style={{ height: 'calc(100vh - 64px)' }}
      >
        <Card className="shadow-sm">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-lg">Directions</CardTitle>
            {navigationMode && (
              <button
                onClick={() => {
                  setNavigationMode(false);
                  setDirections(null);
                }}
                className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded hover:bg-red-700 focus:outline-none"
              >
                Exit Navigation
              </button>
            )}
          </CardHeader>
          <CardContent>
            {navigationMode && directions ? (
              reachedDestination ? (
                <div className="text-center">
                  <h3 className="text-md font-semibold mb-4">You've reached your destination</h3>
                  <button
                    onClick={() => {
                      setNavigationMode(false);
                      setDirections(null);
                    }}
                    className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded hover:bg-red-700 focus:outline-none"
                  >
                    Exit Navigation
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="text-md font-semibold">From: {userLocation?.lat}, {userLocation?.lng}</h3>
                  <h3 className="text-md font-semibold">To: {selectedSpot?.location.latitude}, {selectedSpot?.location.longitude}</h3>
                  <ol className="list-decimal list-inside mt-4">
                    {directions.routes[0].legs[0].steps.map((step, index) => (
                      <li key={index} className="mb-2">
                        <div>
                          <span dangerouslySetInnerHTML={{ __html: step.instructions }} />
                          <div className="text-sm text-gray-600">
                            <p>Distance: {step.distance ? step.distance.text : ''}</p>
                            <p>Duration: {step.duration ? step.duration.text : ''}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )
            ) : (
              <p className="text-sm text-gray-500">No directions available.</p>
            )}
          </CardContent>
        </Card>

        {/* Button for opening/closing the sidebar */}
        <div className="absolute top-1/2 right-full transform -translate-y-1/2 -translate-x-1/2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="focus:outline-none">
            {sidebarOpen ? (
              <motion.div
                animate={{ x: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center drop-shadow-md">
                  <ChevronRight size={24} className="text-gray-500" />
                </div>
              </motion.div>
            ) : (
              <motion.div
                animate={{ x: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center drop-shadow-md">
                  <ChevronLeft size={24} className="text-gray-500" />
                </div>
              </motion.div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
