"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {MapPin, Navigation, ChevronUp, ChevronDown, ArrowDown, ArrowUp} from 'lucide-react';
import {
  GoogleMap,
  LoadScript,
  Marker,
  DirectionsRenderer,
  InfoWindow,
} from '@react-google-maps/api';
import { ParkingSpace, SearchRequest } from '@/types/type';
import { searchSpots } from '@/features/search/searchSlice';
import { useRouter } from 'next/navigation';

const default_center = {
  // Purdue University coords
  lat: 40.4237,
  lng: -86.9212,
};

export default function SearchPage() {
  const history = useRouter();
  const dispatch = useAppDispatch();

  const parkingSpots = useAppSelector((state) => state.search.spots);

  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpace | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(5);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(default_center);
  const [isMapExpanded, setIsMapExpanded] = useState(true);

  const mapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch user location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setUserLocation(location);
            setMapCenter(location); // Center map on user location
          },
          () => {
            console.error("Error: The Geolocation service failed.");
          }
      );
    } else {
      console.error("Error: Your browser doesn't support geolocation.");
    }
  }, []);

  // Handle search action
  const onSearch = async () => {
    if (!userLocation) {
      console.error("User location is not available yet.");
      return; // if location is unavailable
    }

    console.log("userLocation", userLocation);

    const request: SearchRequest = {
      latitude: userLocation.lat,
      longitude: userLocation.lng,
      radius: searchRadius,
    };

    try {
      dispatch(searchSpots(request));
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

  // Get directions to the selected parking spot
  const getDirections = () => {
    if (userLocation && selectedSpot) {
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
            } else {
              console.error(`error fetching directions ${result}`);
            }
          }
      );
    }
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

  return (
      <div
          className="min-h-screen bg-gray-50 text-gray-900 flex flex-col"
          style={{ height: '100vh', overflow: 'hidden' }}
      >
        {/* Collapsible Search Parameters */}
        <motion.div
            className={`fixed top-2 w-full flex justify-center z-50 transition-all duration-300`}
            animate={{ opacity: isSearchOpen ? 1 : 0.35 }}
        >
          <Card
              className={`w-3/4 sm:w-2/3 md:w-1/2 lg:w-2/5 ${
                  isSearchOpen ? 'py-3' : 'py-0'
              }`}
          >
            <CardHeader
                className={`${isSearchOpen ? 'p-3 border-b' : 'py-0.5 px-4'}`}
            >
              <div className="flex justify-between items-center">
                <CardTitle
                    className={`text-lg ${isSearchOpen ? 'text-xl' : 'text-base'}`}
                >
                  Search for Parking
                </CardTitle>
                <Button
                    variant="ghost"
                    onClick={toggleSearch}
                    className="p-1 focus:outline-none"
                    aria-label="Toggle Search Parameters"
                >
                  {isSearchOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </Button>
              </div>
            </CardHeader>
            {isSearchOpen && (
                <CardContent className="pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center mb-3 sm:mb-0">
                      <Label htmlFor="radius" className="mr-2 text-sm">
                        Radius (km):
                      </Label>
                      <Input
                          id="radius"
                          type="number"
                          value={searchRadius}
                          onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                          className="w-20 text-sm"
                      />
                    </div>
                    <Button onClick={onSearch} className="w-full sm:w-auto text-sm px-4 py-2">
                      Search
                    </Button>
                  </div>
                </CardContent>
            )}
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
          <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
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
              {userLocation && (
                  <Marker
                      position={userLocation}
                      icon="https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                  />
              )}
              {selectedSpot && (
                  <InfoWindow
                      position={{
                        lat: selectedSpot.location.latitude,
                        lng: selectedSpot.location.longitude,
                      }}
                      onCloseClick={() => setSelectedSpot(null)}
                  >
                    <div className="text-sm">
                      <h2 className="font-semibold">Owner ID: {selectedSpot.owner_id}</h2>
                      <p>Latitude: {selectedSpot.location.latitude.toFixed(4)}</p>
                      <p>Longitude: {selectedSpot.location.longitude.toFixed(4)}</p>
                      <Button onClick={getDirections} className="mt-2 text-xs px-3 py-1">
                        <Navigation className="mr-1 h-4 w-4" />
                        Directions
                      </Button>
                    </div>
                  </InfoWindow>
              )}
              {directions && <DirectionsRenderer directions={directions} />}
            </GoogleMap>
          </LoadScript>

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <button onClick={handleArrowClick} className="focus:outline-none">

              {isMapExpanded ? (
                  <motion.div
                      animate={{y: [0, 10, 0]}}
                      transition={{repeat: Infinity, duration: 1}}
                  >
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center drop-shadow-md">
                      <ArrowDown size={24} className="text-gray-500"/>
                    </div>
                  </motion.div>
              ) : (
                  <motion.div
                      animate={{y: [0, 10, 0]}}
                      transition={{repeat: Infinity, duration: 1}}
                  >
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center drop-shadow-md">
                      <ArrowUp size={24} className="text-gray-500"/>
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
      </div>
  );
}
