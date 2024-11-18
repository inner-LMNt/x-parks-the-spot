// src/pages/add.tsx

"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { addParkingSpot, resetState } from "@/features/add/addSlice";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Camera,
  X,
  Upload,
  ArrowLeft,
  MapPin,
  CameraOff,
  MapPinOff,
} from "lucide-react";
import Webcam from "react-webcam";
import { DaysOfWeek } from "@/types/type"; // Ensure DaysOfWeek enum is imported
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"; // ShadCN Dialog components
import { LoadScriptNext, Autocomplete } from "@react-google-maps/api";

const formatTime = (time: string): string => {
  return time; // Keeping time as "HH:mm" since backend expects time-only strings
};

// Utility function to check permission status
const checkPermissionStatus = async (
  permissionName: PermissionName,
): Promise<PermissionState> => {
  if (!navigator.permissions) {
    return "prompt"; // Fallback if Permissions API is not supported
  }
  try {
    //@ts-ignore
    const result = await navigator.permissions.query({ name: permissionName });
    return result.state;
  } catch (error) {
    console.error(`Error checking ${permissionName} permission:`, error);
    return "prompt";
  }
};

// Define types for permissions
type PermissionName = "camera" | "geolocation";

export default function AddPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { toast } = useToast();
  const { loading, error } = useSelector((state: RootState) => state.add);

  const [spotType, setSpotType] = useState<"free" | "rental">("free");
  const [domLoaded, setDomLoaded] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoTimestamp, setPhotoTimestamp] = useState<Date | null>(null); // **State for Timestamp**
  const [locationTimestamp, setLocationTimestamp] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const [photoTaken, setPhotoTaken] = useState<boolean>(false);
  const [showCamera, setShowCamera] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [autoComplete, setAutoComplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const onLoadAutocomplete = (
    autocompleteInstance: google.maps.places.Autocomplete,
  ) => {
    setAutoComplete(autocompleteInstance);
  };

  // Separate TimeSlot and is24Seven
  const [timeSlot, setTimeSlot] = useState<any>({
    day_of_week: [],
    start_time: "",
    end_time: "",
  });

  const [is24Seven, setIs24Seven] = useState<boolean>(false);

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [geoEnabled, setGeoEnabled] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string>("");

  // States for Modals
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showReRequestModal, setShowReRequestModal] = useState<{
    camera: boolean;
    location: boolean;
  }>({
    camera: false,
    location: false,
  });

  // **New States for Permission Denial**
  const [cameraDenied, setCameraDenied] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [cameraLoaded, setCameraLoaded] = useState(false);

  // Initialize permission states
  const [cameraPermission, setCameraPermission] =
    useState<PermissionState>("prompt");
  const [locationPermission, setLocationPermission] =
    useState<PermissionState>("prompt");

  // Track if errors have been handled to prevent repetitive actions
  const [hasLocationError, setHasLocationError] = useState<boolean>(false);
  const [hasCameraError, setHasCameraError] = useState<boolean>(false); // If handling camera errors similarly

  // Check permissions on component mount
  useEffect(() => {
    const fetchPermissions = async () => {
      const camStatus = await checkPermissionStatus("camera");
      const locStatus = await checkPermissionStatus("geolocation");
      setCameraPermission(camStatus);
      setLocationPermission(locStatus);
      // If permissions are denied initially
      if (camStatus === "denied") {
        setCameraDenied(true);
        setHasCameraError(true); // Prevent repetitive handling
      }
      if (locStatus === "denied") {
        setLocationDenied(true);
        setHasLocationError(true); // Prevent repetitive handling
      }
    };
    fetchPermissions();
  }, []);

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
        setPhotoTimestamp(new Date());
        setPhotoTaken(true);
        if (spotType === "free") {
          captureLocation();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * **Trigger File Input Click**
   */
  const handleImageClick = () => {
    console.log("Image upload area clicked.");
    fileInputRef.current?.click();
  };

  /**
   * **Remove Selected Image**
   */
  const handleRemoveImage = () => {
    setImage(null);
    setPreviewUrl(null);
    setPhotoTimestamp(null);
    setPhotoTaken(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (spotType === "free") {
      setUserLocation(null);
    }
  };

  /**
   * **Handle Camera Capture**
   */
  const handleCameraCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setPreviewUrl(imageSrc);
      setPhotoTimestamp(new Date());
      setPhotoTaken(true);
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], "camera_capture.jpg", {
            type: "image/jpeg",
          });
          setImage(file);
          if (spotType === "free") {
            captureLocation();
          }
        })
        .catch((err) => {
          console.error("Error processing captured image:", err);
          toast({
            title: "Image Capture Error",
            description:
              "There was an error processing your captured image. Please try again.",
            variant: "destructive",
          });
        });
      setShowCamera(false);
    }
  }, [
    spotType,
    setImage,
    setPreviewUrl,
    setPhotoTimestamp,
    setPhotoTaken,
    setShowCamera,
    toast,
  ]);

  const captureLocation = useCallback(() => {
    setLocationLoading(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          console.log("Location captured:", location);

          setUserLocation(location);
          setLocationTimestamp(new Date()); // Store location timestamp
          setGeoEnabled(true);
          setLocationLoading(false);
          setLocationDenied(false); // Reset denial state on success
          setHasLocationError(false); // Reset error state on successful capture
        },
        (error) => {
          console.error("Error: The Geolocation service failed.", error);
          setGeoEnabled(false);
          setLocationLoading(false);
          setLocationDenied(true); // Set denial state

          // Only handle the error once
          if (!hasLocationError) {
            toast({
              title: "Location Access Denied",
              description: "Please allow location access to proceed.",
              variant: "destructive",
            });

            if (spotType === "free") {
              handleRemoveImage();
              toast({
                title: "Image Removed",
                description:
                  "Image was removed because location access was denied.",
                variant: "destructive",
              });
            }

            setHasLocationError(true); // Mark that the error has been handled
          }
        },
      );
    } else {
      console.error("Error: Your browser doesn't support geolocation.");
      setGeoEnabled(false);
      setLocationLoading(false);
      setLocationDenied(true); // Set denial state

      // Only handle the error once
      if (!hasLocationError) {
        toast({
          title: "Geolocation Not Supported",
          description: "Your browser doesn't support geolocation.",
          variant: "destructive",
        });

        if (spotType === "free") {
          handleRemoveImage();
          toast({
            title: "Image Removed",
            description:
              "Image was removed because geolocation is not supported.",
            variant: "destructive",
          });
        }

        setHasLocationError(true); // Mark that the error has been handled
      }
    }
  }, [
    spotType,
    setLocationLoading,
    setUserLocation,
    setGeoEnabled,
    setLocationTimestamp,
    toast,
    handleRemoveImage,
    hasLocationError,
  ]);

  /**
   * **Handle 24/7 Toggle**
   */
  const handle24SevenToggle = (checked: boolean) => {
    setIs24Seven(checked);
    if (checked) {
      setTimeSlot({
        day_of_week: [],
        start_time: "00:00",
        end_time: "23:59",
      });
    } else {
      setTimeSlot({
        day_of_week: [],
        start_time: "",
        end_time: "",
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
   * **Calculate Time Difference in Seconds**
   * Returns the difference between current time and photoTimestamp in seconds.
   */
  const calculateTimeDifferenceSeconds = (): number => {
    if (!photoTimestamp) return Infinity;
    if (!locationTimestamp) return Infinity;

    return (
      Math.abs(locationTimestamp.getTime() - photoTimestamp.getTime()) / 1000
    );
  };

  /**
   * **Calculate Time Difference in Minutes**
   * Returns the difference between end and start times in minutes.
   */
  const calculateTimeDifference = (start: string, end: string): number => {
    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);

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
  const validateAvailability = (): boolean => {
    let isValid = true;
    let errorMsg = "";

    if (is24Seven) {
      // For 24/7, ensure start_time and end_time are '00:00' and '23:59'
      if (timeSlot.start_time !== "00:00" || timeSlot.end_time !== "23:59") {
        isValid = false;
        errorMsg = "24/7 slots must start at 00:00 and end at 23:59.";
      }
    } else {
      // Check if at least one day is selected
      if (timeSlot.day_of_week.length === 0) {
        isValid = false;
        errorMsg = "Please select at least one day of the week.";
      }

      // Validate time durations
      if (timeSlot.start_time && timeSlot.end_time) {
        const diffMinutes = calculateTimeDifference(
          timeSlot.start_time,
          timeSlot.end_time,
        );

        if (diffMinutes !== 0 && diffMinutes < 60) {
          isValid = false;
          errorMsg =
            "Each time slot must allow for at least one hour of parking.";
        }
      } else {
        isValid = false;
        errorMsg = "Please provide both start and end times.";
      }
    }

    if (isValid) {
      setAvailabilityError("");
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

    console.log("Form submitted. Showing confirmation modal.");
    // Show confirmation modal before submission
    setShowConfirmationModal(true);
  };

  /**
   * **Confirm Submission After Modal**
   */
  const confirmSubmission = async () => {
    console.log("Confirm submission clicked.");
    setShowConfirmationModal(false);
    setIsSubmitting(true);

    try {
      // Validate availability only for rental spots
      if (spotType === "rental") {
        if (!validateAvailability()) {
          console.log("Availability validation failed:", availabilityError);
          toast({
            title: "Validation Error",
            description:
              availabilityError ||
              "Please fix the errors in your availability schedule.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Ensure image and location are present for free spots
      if (spotType === "free") {
        if (cameraPermission === "denied" || cameraDenied) {
          console.log("Camera access denied for free spot.");
          toast({
            title: "Camera Access Required",
            description: "Please allow camera access to upload a photo.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        if (!image || !userLocation || !photoTimestamp) {
          console.log("Missing required fields for free spot.");
          toast({
            title: "Missing Information",
            description:
              "Please ensure you have uploaded a photo, captured your location, and the timestamp.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        const timeDiffSeconds = calculateTimeDifferenceSeconds();
        console.log("Time difference (seconds):", timeDiffSeconds);
        if (timeDiffSeconds > 30) {
          // **Increased from 15 to 30**
          console.log(
            "Timestamp is beyond the allowed time frame:",
            timeDiffSeconds,
            "seconds.",
          );
          toast({
            title: "Timestamp Error",
            description:
              "Your photo and location must be captured less than 30 seconds apart. Please try again.",
            variant: "destructive",
          });
          handleRemoveImage(); // Remove image if timestamp is invalid
          setIsSubmitting(false);
          return;
        }
      }

      // Ensure image and location are present for rental spots
      if (spotType === "rental") {
        if (!image) {
          console.log("Image not uploaded for rental spot.");
          toast({
            title: "Image Required",
            description:
              "Please capture or upload an image of the rental parking spot.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        if (!userLocation) {
          console.log("Location not captured for rental spot.");
          toast({
            title: "Location Required",
            description: "Please capture your location.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        if (!photoTimestamp) {
          console.log("Timestamp missing for rental spot.");
          toast({
            title: "Timestamp Missing",
            description: "Please ensure the photo timestamp is captured.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Prepare FormData
      const formData = new FormData();

      let name =
        spotType === "free"
          ? "Free Spot"
          : (document.getElementById("name") as HTMLInputElement)?.value || "";
      let latitude: number | undefined;
      let longitude: number | undefined;
      let price: number | null = null;
      let address = "";

      if (spotType === "rental") {
        name = (document.getElementById("name") as HTMLInputElement).value;
        address = (document.getElementById("address") as HTMLInputElement)
          .value;

        latitude = userLocation?.lat;
        longitude = userLocation?.lng;

        const priceValue = (
          document.getElementById("price") as HTMLInputElement
        ).value;
        if (priceValue) {
          price = parseFloat(priceValue);
          if (isNaN(price) || price < 0) {
            console.log("Invalid price entered:", priceValue);
            toast({
              title: "Invalid Price",
              description: "Please enter a valid price.",
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
        }
      } else {
        latitude = userLocation?.lat;
        longitude = userLocation?.lng;
      }

      // Build the availability_schedule array based on the single slot
      let availability_schedule: any[] = [];
      if (spotType === "rental") {
        if (is24Seven) {
          availability_schedule = Object.values(DaysOfWeek).map((day) => ({
            day_of_week: day,
            start_time: formatTime("00:00"),
            end_time: formatTime("23:59"),
          }));
        } else {
          availability_schedule = timeSlot.day_of_week.map(
            (day: DaysOfWeek) => ({
              day_of_week: day,
              start_time: formatTime(timeSlot.start_time),
              end_time: formatTime(timeSlot.end_time),
            }),
          );
        }
      }

      const data: any = {
        is_paid: spotType === "rental",
        location: {
          latitude,
          longitude,
          address: spotType === "rental" ? address : undefined,
        },
        features: [], // Assuming features are handled elsewhere
        photos: [], // Will be handled via 'image' upload
        photo_timestamp: photoTimestamp ? photoTimestamp.toISOString() : null, // **Attach Timestamp**
      };

      if (spotType === "rental") {
        data.name = name;
        data.availability_schedule = availability_schedule;
        data.pricing_info = {
          base_price: price,
          dynamic_pricing: false, // Modify if dynamic pricing is needed
        };
      }

      formData.append("data", JSON.stringify(data));

      if (image) {
        formData.append("image", image);
      }

      console.log("Dispatching addParkingSpot with FormData:", data);

      const result = await dispatch(addParkingSpot(formData));
      if (addParkingSpot.fulfilled.match(result)) {
        console.log("Parking spot added successfully.");
        toast({
          title: "Spot Added Successfully!",
          description: "Your parking spot has been added.",
          variant: "success",
        });
        dispatch(resetState());
        setShowSuccessModal(true);
      } else {
        console.error("Error adding parking spot:", error);
        toast({
          title: "Error",
          description: error?.message || "Failed to add parking spot.",
          variant: "destructive",
        });
      }
      setIsSubmitting(false);
    } catch (outerError) {
      console.error("Unexpected error during submission:", outerError);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const onPlaceChanged = () => {
    if (autoComplete) {
      const place = autoComplete.getPlace();
      if (place.geometry) {
        const location = {
          lat: place.geometry.location?.lat() || 0,
          lng: place.geometry.location?.lng() || 0,
        };
        setUserLocation(location);
      }
    }
  };

  useEffect(() => {
    dispatch({ type: "add/errorReset" });
  }, [spotType, dispatch]);

  useEffect(() => {
    setDomLoaded(true);
  }, []);

  /**
   * **Re-request Camera Access**
   */
  const reRequestCameraAccess = () => {
    setCameraLoaded(false);
    setShowReRequestModal((prev) => ({ ...prev, camera: true }));
  };

  /**
   * **Re-request Location Access**
   */
  const reRequestLocationAccess = () => {
    setShowReRequestModal((prev) => ({ ...prev, location: true }));
  };

  /**
   * **Handle Re-request Confirmation**
   */
  const handleReRequestConfirm = () => {
    if (showReRequestModal.camera) {
      // Attempt to access the camera again
      setCameraLoaded(false);
      setCameraDenied(false);
      setHasCameraError(false); // Reset error state
      setShowCamera(true); // This will trigger Webcam to attempt access
    }
    if (showReRequestModal.location) {
      // Attempt to capture location again
      setLocationDenied(false);
      setHasLocationError(false); // Reset error state
      captureLocation();
    }
    setShowReRequestModal({ camera: false, location: false });
  };

  /**
   * **Handle Re-request Cancellation**
   */
  const handleReRequestCancel = () => {
    setShowReRequestModal({ camera: false, location: false });
  };

  /**
   * **Open Browser Settings Instructions**
   */
  const openBrowserSettings = () => {
    toast({
      title: "Permission Required",
      description:
        "Please enable camera or location access in your browser settings.",
      variant: "destructive",
    });
    // Optionally, provide more detailed instructions or links based on the browser
  };

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
                    <CardTitle className="text-2xl">
                      Add a Parking Spot
                    </CardTitle>
                    <CardDescription>
                      Fill in the details to list your parking spot
                    </CardDescription>
                  </div>
                  {/* **Permission Denial Buttons with Guidance** */}
                  <div className="absolute right-4 top-4 flex space-x-2">
                    {cameraPermission === "denied" && (
                      <Button
                        variant="ghost"
                        onClick={reRequestCameraAccess}
                        aria-label="Enable Camera Access"
                        className="p-0"
                      >
                        <CameraOff className="w-5 h-5 text-red-500" />
                      </Button>
                    )}
                    {locationPermission === "denied" && (
                      <Button
                        variant="ghost"
                        onClick={reRequestLocationAccess}
                        aria-label="Enable Location Access"
                        className="p-0"
                      >
                        <MapPinOff className="w-5 h-5 text-red-500" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={handleSubmit}
                    className="space-y-6"
                    noValidate
                  >
                    {/* Spot Type Selection */}
                    <div className="space-y-2">
                      <Label>Spot Type</Label>
                      <RadioGroup
                        defaultValue="free"
                        onValueChange={(value) => {
                          console.log("Spot type changed to:", value);
                          setSpotType(value as "free" | "rental");
                          setShowCamera(value === "free");
                          setUserLocation(null);
                          setImage(null); // Reset image when spot type changes
                          setPreviewUrl(null); // Reset preview
                          setAvailabilityError(""); // Reset local availability error
                          setPhotoTimestamp(null); // Reset timestamp
                          dispatch(resetState()); // Reset Redux error state
                          if (value !== "rental") {
                            setTimeSlot({
                              day_of_week: [],
                              start_time: "",
                              end_time: "",
                            });
                            setIs24Seven(false);
                          }
                          // Reset error handling states
                          setHasLocationError(false);
                          setHasCameraError(false);
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
                    {spotType === "rental" && (
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
                    {spotType === "rental" && (
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <LoadScriptNext
                          googleMapsApiKey={
                            process.env
                              .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string
                          }
                          libraries={["places"]}
                        >
                          <Autocomplete
                            onLoad={onLoadAutocomplete}
                            onPlaceChanged={onPlaceChanged}
                          >
                            <Input
                              id="address"
                              name="address"
                              required
                              placeholder="Full street address"
                            />
                          </Autocomplete>
                        </LoadScriptNext>
                      </div>
                    )}

                    {/* Location Section (Only for Rental) */}
                    {spotType === "rental" && photoTimestamp && (
                      <div className="space-y-2">
                        <Label>Location</Label>
                        {!userLocation && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={captureLocation}
                            disabled={locationLoading}
                            className="flex items-center space-x-2"
                          >
                            <MapPin className="w-4 h-4" />
                            <span>
                              {locationLoading
                                ? "Locating..."
                                : "Use My Location"}
                            </span>
                          </Button>
                        )}
                        {locationLoading && <p>Capturing location...</p>}
                        {!locationLoading && (
                          <>
                            {userLocation ? (
                              <div className="mt-2">
                                <p>
                                  <strong>Latitude:</strong> {userLocation.lat}
                                </p>
                                <p>
                                  <strong>Longitude:</strong> {userLocation.lng}
                                </p>
                              </div>
                            ) : geoEnabled ? (
                              <p>
                                Click 'Use My Location' to capture your current
                                location for the spot.
                              </p>
                            ) : (
                              <p>
                                Geolocation is not enabled. Please enable
                                location services.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Availability Schedule (Only for Rental) */}
                    {spotType === "rental" && (
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
                                    <Label htmlFor={`start_time`}>
                                      Start Time
                                    </Label>
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
                                      <div
                                        key={day}
                                        className="flex items-center space-x-2"
                                      >
                                        <Checkbox
                                          id={`${day}`}
                                          checked={timeSlot.day_of_week.includes(
                                            day,
                                          )}
                                          onCheckedChange={(checked) => {
                                            handleDaySelection(
                                              day as DaysOfWeek,
                                              checked as boolean,
                                            );
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
                              <p className="text-red-500 text-sm">
                                {availabilityError}
                              </p>
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
                            onUserMedia={() => setCameraLoaded(true)}
                            onUserMediaError={() => {
                              console.error("Camera access denied.");
                              setCameraDenied(true);
                              setHasCameraError(true); // Prevent repetitive handling
                              toast({
                                title: "Camera Access Denied",
                                description:
                                  "Please allow camera access to capture photos.",
                                variant: "destructive",
                              });
                            }}
                          />
                          {cameraLoaded && (
                            <Button
                              type="button"
                              onClick={handleCameraCapture}
                              className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                              disabled={cameraDenied}
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              Capture Photo
                            </Button>
                          )}
                        </div>
                      ) : (
                        <>
                          {spotType === "rental" && (
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
                                  <Upload
                                    size={48}
                                    className="text-gray-400 mb-2"
                                  />
                                  <p className="text-sm text-gray-500">
                                    Click to upload an image or use camera
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                          {spotType === "free" && previewUrl && (
                            <div className="relative">
                              <img
                                src={previewUrl}
                                alt="Preview"
                                className="max-w-full h-auto mx-auto rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                      {/* File Input */}
                      {spotType === "rental" && (
                        <input
                          type="file"
                          name="image"
                          accept="image/*"
                          onChange={handleImageChange}
                          ref={fileInputRef}
                          className="hidden"
                        />
                      )}
                      <div className="flex justify-center mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowCamera(!showCamera);
                            setCameraLoaded(false);
                          }}
                          disabled={false} // Allow toggling camera for both types
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {showCamera ? "Hide Camera" : "Use Camera"}
                        </Button>
                      </div>

                      {/* Display Location and Timestamp for Free Spots */}
                      {spotType === "free" && photoTaken && photoTimestamp && (
                        <div className="mt-4 p-4 border rounded-md bg-white">
                          {userLocation ? (
                            <>
                              <p>
                                <strong>Latitude:</strong> {userLocation.lat}
                              </p>
                              <p>
                                <strong>Longitude:</strong> {userLocation.lng}
                              </p>
                            </>
                          ) : (
                            <p>Capturing location...</p>
                          )}
                          {photoTimestamp && (
                            <p>
                              <strong>Timestamp:</strong>{" "}
                              {photoTimestamp.toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={
                        isSubmitting ||
                        loading ||
                        (spotType === "free" &&
                          (!image || !userLocation || cameraDenied)) ||
                        (spotType === "rental" && !image)
                      }
                    >
                      {isSubmitting || loading
                        ? "Adding Spot..."
                        : "Add Parking Spot"}
                    </Button>

                    {/* Display Error Message if Any */}
                    {error && (
                      <p className="text-red-500 text-center mt-2">{error}</p>
                    )}
                  </form>

                  {/* Confirmation Modal */}
                  <Dialog
                    open={showConfirmationModal}
                    onOpenChange={setShowConfirmationModal}
                  >
                    <DialogContent className="w-96">
                      {" "}
                      {/* Added w-96 class here */}
                      <DialogHeader>
                        <DialogTitle>Confirm Submission</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to submit this parking spot?
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowConfirmationModal(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="default"
                          className="border border-white"
                          onClick={confirmSubmission}
                        >
                          Confirm
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Success Modal */}
                  <Dialog
                    open={showSuccessModal}
                    onOpenChange={setShowSuccessModal}
                  >
                    <DialogContent className="w-96">
                      {" "}
                      {/* Added w-96 class here */}
                      <DialogHeader>
                        <DialogTitle>Success!</DialogTitle>
                        <DialogDescription>
                          Your parking spot has been successfully added.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          onClick={() => {
                            setShowSuccessModal(false);
                            router.push("/myspots");
                          }}
                        >
                          Close
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Re-request Permission Modal with Instructions */}
                  <Dialog
                    open={
                      showReRequestModal.camera || showReRequestModal.location
                    }
                    onOpenChange={() => {}}
                  >
                    <DialogContent className="w-96">
                      <DialogHeader>
                        <DialogTitle>Enable Permissions</DialogTitle>
                        <DialogDescription>
                          {showReRequestModal.camera && (
                            <div>
                              <p>
                                To capture photos, please allow camera access:
                              </p>
                              <ol className="list-decimal list-inside mt-2">
                                <li>Go to your browser's settings.</li>
                                <li>
                                  Navigate to the 'Privacy and Security'
                                  section.
                                </li>
                                <li>
                                  Find 'Site Settings' and locate your site's
                                  permissions.
                                </li>
                                <li>Enable camera access for this site.</li>
                              </ol>
                            </div>
                          )}
                          {showReRequestModal.location && (
                            <div>
                              <p>
                                To capture your location, please allow location
                                access:
                              </p>
                              <ol className="list-decimal list-inside mt-2">
                                <li>Go to your browser's settings.</li>
                                <li>
                                  Navigate to the 'Privacy and Security'
                                  section.
                                </li>
                                <li>
                                  Find 'Site Settings' and locate your site's
                                  permissions.
                                </li>
                                <li>Enable location access for this site.</li>
                              </ol>
                            </div>
                          )}
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={handleReRequestCancel}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="default"
                          onClick={handleReRequestConfirm}
                        >
                          Proceed
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    )
  );
}
