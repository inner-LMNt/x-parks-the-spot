// src/pages/add.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { resetState } from '@/features/add/addSlice';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft } from 'lucide-react';
import SpotFinderSubmissionForm from './SpotFinderSubmissionForm'; // Adjust the path as necessary
import RentalForm from './RentalForm'; // Adjust the path as necessary

export default function AddPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { error } = useSelector((state: RootState) => state.add);

  const [spotType, setSpotType] = useState<'free' | 'rental'>('free');
  const [domLoaded, setDomLoaded] = useState(false);

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
                      <form className="space-y-6">
                        {/* Spot Type Selection */}
                        <div className="space-y-2">
                          <Label>Spot Type</Label>
                          <RadioGroup
                              defaultValue="free"
                              onValueChange={(value) => {
                                setSpotType(value as 'free' | 'rental');
                                dispatch(resetState()); // Reset Redux error state
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

                        {/* Conditionally Render Forms Based on Spot Type */}
                        {spotType === 'rental' ? (
                            <RentalForm />
                        ) : (
                            <SpotFinderSubmissionForm />
                        )}

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
      )
  );
}
