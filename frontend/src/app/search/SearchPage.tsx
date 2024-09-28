'use client'

import React, { useState, useEffect } from 'react';
import axios from '../../api/axiosInstance';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation } from 'lucide-react';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { ParkingSpace, SearchRequest } from '@/types/type';
import { useRouter } from 'next/navigation';
import { set } from 'react-hook-form';

// Static Mock API since I can't figure MSW out right now
const fetchSpots = async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return [
    { id: 1, name: 'Parking Spot 1', lat: 40.7128, lng: -74.0060 },
    { id: 2, name: 'Parking Spot 2', lat: 40.7129, lng: -74.0061 },
    { id: 3, name: 'Parking Spot 3', lat: 40.7130, lng: -74.0062 },
  ]
}

const mapContainerStyle = {
  width: '100%',
  height: '400px'
}

const center = {
  lat: 40.7128,
  lng: -74.0060
}

export default function ParkingFinder() {
  const history = useRouter();
  const dispatch = useAppDispatch();

  const parkingSpots = useAppSelector((state) => state.search.spots);
  const [selectedSpot, setSelectedSpot] = useState<{ id: number; owner_id: string; lat: number; lng: number; } | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; } | null>(null)
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  // const [searchRadius, setSearchRadius] = useState<number>(5);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          // setUserLocation(location);
          // searchParking(location);
        },
        () => {
          console.error("Error: The Geolocation service failed.");
        }
      )

      dispatch({type: 'search/spots', payload: {latitude: 40.7128, longitude: -74.0060, radius: 5}})

    } else {
      console.error("Error: Your browser doesn't support geolocation.");
    }
  }, []);

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

  const handleSpotSelect = (spot: React.SetStateAction<{ id: number; owner_id: string; lat: number; lng: number; } | null>) => {
    setSelectedSpot(spot);
    setDirections(null);
  }

  const getDirections = () => {
    if (userLocation && selectedSpot) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: userLocation,
          destination: { lat: selectedSpot.lat, lng: selectedSpot.lng },
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
          }} className="ml-4">
            Back to Dashboard
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Parking Spots</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {parkingSpots.map((spot: { id: number; owner_id: string; lat: number; lng: number; }) => (
                  <li key={spot.id} className="flex justify-between items-center border-b pb-2">
                    <span>{spot.owner_id}</span>
                    <Button onClick={() => handleSpotSelect(spot)}>
                      <MapPin className="mr-2 h-4 w-4" />
                      Select
                    </Button>
                  </li>
                ))}
              </ul>
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
                  {parkingSpots.map((spot: { id: number; owner_id: string; lat: number; lng: number; }) => (
                    <Marker
                      key={spot.id}
                      position={{ lat: spot.lat, lng: spot.lng }}
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

        {selectedSpot && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Selected Parking Spot: {selectedSpot.owner_id}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Latitude: {selectedSpot.lat}</p>
              <p>Longitude: {selectedSpot.lng}</p>
              <Button onClick={getDirections} className="mt-4">
                <Navigation className="mr-2 h-4 w-4" />
                Get Directions
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  )
}