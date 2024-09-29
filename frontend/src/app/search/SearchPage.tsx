'use client'

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation } from 'lucide-react';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { ParkingSpace, SearchRequest } from '@/types/type';
import {searchSpots} from '@/features/search/searchSlice';
import { useRouter } from 'next/navigation';

const mapContainerStyle = {
  width: '100%',
  height: '400px'
}

// Purdue University
const center = {
  lat: 40.4237,
  lng: -86.9212
}

export default function ParkingFinder() {
  const history = useRouter();
  const dispatch = useAppDispatch();

  const parkingSpots = useAppSelector((state) => state.search.spots);
  
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpace | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [searchRadius, setSearchRadius] = useState<number>(5);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setUserLocation(location);
        },
        () => {
          console.error("Error: The Geolocation service failed.");
        }
      )
    } else {
      console.error("Error: Your browser doesn't support geolocation.");
    }
  }, []);

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
      // @ts-ignore
      dispatch(searchSpots(request));
    } catch (error) {
      console.error('Search failed:', error);
    }
  };  

  // const searchParking = async (location: google.maps.LatLngLiteral) => {
  //   const searchRequest: SearchRequest = {
  //     latitude: location.lat,
  //     longitude: location.lng,
  //     radius: searchRadius
  //   }

  //   const response = await fetch('search/spots', {
  //     method: 'GET',
  //     headers: {
  //       'Content-Type': 'application/json'
  //     },
  //   });

  //   if (response.ok) {
  //     const data = await response.json()
  //     setParkingSpots(data);
  //   } else {
  //     console.error('Error fetching parking spots:', response.statusText);
  //   }
  // }

  const handleSpotSelect = (spot: ParkingSpace) => {
    if (selectedSpot && selectedSpot.id === spot.id) {
        setSelectedSpot(null);
        console.log("Deselected:", spot);
    } else {
        setSelectedSpot(spot);
        console.log("Selected:", spot);
    }
    setDirections(null);
};

  

  const getDirections = () => {
    if (userLocation && selectedSpot) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: userLocation,
          destination: { lat: selectedSpot.location.latitude, lng: selectedSpot.location.longitude },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
          } else {
            console.error(`error fetching directions ${result}`);
          }
        }
      )
    }
  }

  return (
    <div className="container mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold mb-6">Find Parking</h1>
          <Button onClick={() => {
            history.push('/dashboard');
          }} className="ml-6 bg-purple-500 hover:bg-purple-700 text-white">
            Back to Dashboard
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <div className="flex justify-between items-center">
            <CardHeader>
              <CardTitle>Available Parking Spots</CardTitle>
            </CardHeader>
            <div className="flex items-center">
              <Label htmlFor="radius" className="mr-4">Search Radius:</Label>
              <Input
                id="radius"
                type="number"
                value={searchRadius}
                onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                className="w-20"
              />
            </div>
            <Button onClick={onSearch} className="mr-6">
              Search
            </Button>
          </div>

          <CardContent>
            <div className="max-h-[400px] overflow-y-auto"> 
              <ul className="space-y-2">
              {parkingSpots.map((spot: ParkingSpace) => (
                <li key={spot.id} className="flex justify-between items-center border-b pb-2">
                  <span>{spot.owner_id}</span>
                  <Button onClick={() => handleSpotSelect(spot)} data-testid={`select-${spot.id}`}>
                    <MapPin className="mr-2 h-4 w-4" />
                    Select
                  </Button>
                </li>
              ))}
              </ul>
            </div>
          </CardContent>
        </Card>

          <Card>
            <CardHeader>
              <CardTitle>Map</CardTitle>
            </CardHeader>
            <CardContent>
              <LoadScript googleMapsApiKey="GOOGLE_MAPS_API_KEY">
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={center}
                  zoom={12}
                >
                  {parkingSpots.map((spot: ParkingSpace) => (
                    <Marker
                      key={spot.id}
                      position={{ lat: spot.location.latitude, lng: spot.location.longitude }}
                      onClick={() => handleSpotSelect(spot)}
                    />
                  ))}
                  {userLocation && <Marker position={userLocation} icon="https://maps.google.com/mapfiles/ms/icons/blue-dot.png" />}
                  {directions && <DirectionsRenderer directions={directions} />}
                </GoogleMap>
              </LoadScript>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              Selected Parking Spot: {selectedSpot ? selectedSpot.owner_id : 'None'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedSpot ? (
              <>
                <p>Latitude: {selectedSpot.location.latitude}</p>
                <p>Longitude: {selectedSpot.location.longitude}</p>
                <Button onClick={getDirections} className="mt-4">
                  <Navigation className="mr-2 h-4 w-4" />
                  Get Directions
                </Button>
              </>
            ) : (
              <p>No parking spot selected.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}