"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogOverlay,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogOverlay,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { useAppDispatch, useAppSelector } from "@/store/hooks" // Use typed hooks
import {
  request_delete_account,
  get_notification_time,
  update_notification_time,
  set_user_location,
} from "@/features/user/userSlice"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface FormData {
  password: string
  confirmPassword: string
}

interface LocationFormData {
  state: string
  city: string
}

export default function SettingsPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const [accountDeleted, setAccountDeleted] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [notificationTime, setNotificationTime] = useState('');
    const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
    const { toast } = useToast();
    const userNotificationTime = useAppSelector((state) => state.user.notificationTime);
    const userLocation = useAppSelector((state) => state.user.userLocation);
    const [domLoaded, setDomLoaded] = useState(false);

  useEffect(() => {
    setDomLoaded(true)
  }, [])

  useEffect(() => {
    dispatch(get_notification_time())
  }, [dispatch])

  // Initialize React Hook Form for delete account
  const {
    watch,
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<FormData>()

  // Initialize React Hook Form for location
  const {
    watch: locationWatch,
    register: locationRegister,
    formState: { errors: locationErrors },
    handleSubmit: locationHandleSubmit,
  } = useForm<LocationFormData>()

  // Handle delete account
  const handleDeleteAccount = async (data: {
    password: string
    confirmPassword: string
  }) => {
    try {
      // Dispatch the deleteAccount thunk with the password from the form
      //@ts-ignore
      const resultAction = await dispatch(
        request_delete_account({ password: data.password }),
      ) // Use `data.password`

      if (request_delete_account.fulfilled.match(resultAction)) {
        // Account successfully deleted
        setAccountDeleted(true) // Show account deleted dialog
      } else if (request_delete_account.rejected.match(resultAction)) {
        // Account deletion failed
        setErrorMessage(resultAction.payload as string) // Show error message
      }
    } catch (error) {
      console.error("Account deletion failed:", error)
      setErrorMessage("An unexpected error occurred.")
    }
  }

  // Handle save notification time
  const handleSaveNotificationTime = (event: React.FormEvent) => {
    event.preventDefault()
    dispatch(update_notification_time({ notificationTime }))
      .then((resultAction: any) => {
        if (update_notification_time.fulfilled.match(resultAction)) {
          toast({
            title: "Notification time updated!",
            description: "Your new notification time has been saved.",
            variant: "success",
          })
        } else if (update_notification_time.rejected.match(resultAction)) {
          toast({
            title: "Failed to update notification time",
            description: resultAction.payload as string,
            variant: "destructive",
          })
        }
      })
      .catch((err: any) => {
        console.error("Reset failed:", err)
      })
      .finally(() => setIsNotificationDialogOpen(false))
  }

  // save state and city
  const handleSaveLocation = (data: { state: string; city: string }) => {
    dispatch(set_user_location({ state: data.state, city: data.city })).then(
      (resultAction: any) => {
        if (set_user_location.fulfilled.match(resultAction)) {
          toast({
            title: "Location updated!",
            description: "Your new location has been saved.",
            variant: "success",
          })
        } else if (set_user_location.rejected.match(resultAction)) {
          toast({
            title: "Failed to update location",
            description: resultAction.payload as string,
            variant: "destructive",
          })
        }
      },
    )
  }

  const states = [
    { value: "AL", label: "Alabama" },
    { value: "AK", label: "Alaska" },
    { value: "AZ", label: "Arizona" },
    { value: "AR", label: "Arkansas" },
    { value: "CA", label: "California" },
    { value: "CO", label: "Colorado" },
    { value: "CT", label: "Connecticut" },
    { value: "DE", label: "Delaware" },
    { value: "FL", label: "Florida" },
    { value: "GA", label: "Georgia" },
    { value: "HI", label: "Hawaii" },
    { value: "ID", label: "Idaho" },
    { value: "IL", label: "Illinois" },
    { value: "IN", label: "Indiana" },
    { value: "IA", label: "Iowa" },
    { value: "KS", label: "Kansas" },
    { value: "KY", label: "Kentucky" },
    { value: "LA", label: "Louisiana" },
    { value: "ME", label: "Maine" },
    { value: "MD", label: "Maryland" },
    { value: "MA", label: "Massachusetts" },
    { value: "MI", label: "Michigan" },
    { value: "MN", label: "Minnesota" },
    { value: "MS", label: "Mississippi" },
    { value: "MO", label: "Missouri" },
    { value: "MT", label: "Montana" },
    { value: "NE", label: "Nebraska" },
    { value: "NV", label: "Nevada" },
    { value: "NH", label: "New Hampshire" },
    { value: "NJ", label: "New Jersey" },
    { value: "NM", label: "New Mexico" },
    { value: "NY", label: "New York" },
    { value: "NC", label: "North Carolina" },
    { value: "ND", label: "North Dakota" },
    { value: "OH", label: "Ohio" },
    { value: "OK", label: "Oklahoma" },
    { value: "OR", label: "Oregon" },
    { value: "PA", label: "Pennsylvania" },
    { value: "RI", label: "Rhode Island" },
    { value: "SC", label: "South Carolina" },
    { value: "SD", label: "South Dakota" },
    { value: "TN", label: "Tennessee" },
    { value: "TX", label: "Texas" },
    { value: "UT", label: "Utah" },
    { value: "VT", label: "Vermont" },
    { value: "VA", label: "Virginia" },
    { value: "WA", label: "Washington" },
    { value: "WV", label: "West Virginia" },
    { value: "WI", label: "Wisconsin" },
    { value: "WY", label: "Wyoming" },
  ]

  return (
    domLoaded && (
      <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 p-4 md:p-8 text-gray-900">
        <Link href="/profile" passHref>
          <Button variant="link" className="absolute top-2 left-0">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Button>
        </Link>
        <div className="w-full max-w-md bg-gray-50 rounded-lg p-6 md:p-8">
          <h2 className="text-2xl font-semibold mb-6">Settings</h2>
          {/* Notification Settings */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Notification Options</h3>
            <div className="flex items-center mb-3">
              <Checkbox id="emailNotifications" className="mr-3 h-4 w-4" />
              <Label htmlFor="emailNotifications" className="text-sm">
                Email Notifications
              </Label>
            </div>
            <div className="flex items-center">
              <Checkbox id="pushNotifications" className="mr-3 h-4 w-4" />
              <Label htmlFor="pushNotifications" className="text-sm">
                Push Notifications
              </Label>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-700">
                Current Notification Time: {userNotificationTime} minutes
              </p>
              <Button
                variant="secondary"
                className="mt-4 bg-gray-800 hover:bg-gray-700 text-white"
                onClick={() => setIsNotificationDialogOpen(true)}
              >
                Set Custom Notification Time
              </Button>
            </div>
          </div>

          {/* Location Settings */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Location Settings</h3>
            <form onSubmit={locationHandleSubmit(handleSaveLocation)}>
              <div className="mb-4">
                <Label
                  htmlFor="state"
                  className="text-sm font-medium text-gray-800"
                >
                  State
                </Label>
                <select
                  id="state"
                  {...locationRegister("state", {
                    required: "State is required",
                  })}
                  className="mt-1 block w-full text-gray-800"
                >
                  <option value="">Select state</option>
                  {states.map((state) => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
                {locationErrors.state && (
                  <p className="text-red-600 text-sm mt-1">
                    {locationErrors.state.message}
                  </p>
                )}
              </div>
              <div className="mb-4">
                <Label
                  htmlFor="city"
                  className="text-sm font-medium text-gray-800"
                >
                  City
                </Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Enter your city"
                  {...locationRegister("city", {
                    required: "City is required",
                  })}
                  className="mt-1 block w-full text-gray-800"
                />
                <p className="text-gray-600 text-sm mt-1">
                  Case insensitive. <br />
                  Type "none" if you don't want to specify a city.
                </p>
                {locationErrors.city && (
                  <p className="text-red-600 text-sm mt-1">
                    {locationErrors.city.message}
                  </p>
                )}
              </div>
              <Button variant="default" type="submit" className="w-full">
                Save Location
              </Button>
            </form>
          </div>

          {/* Delete Account Section */}
          <div className="mt-12">
            <h3 className="text-lg font-medium text-red-600 mb-4">
              Delete Account
            </h3>
            <p className="text-sm text-gray-700 mb-6">
              Deleting your account is permanent and cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full shadow-md">
                  Delete My Account
                </Button>
              </AlertDialogTrigger>
              {/* Semi-transparent overlay */}
              <AlertDialogOverlay className="bg-black bg-opacity-50 fixed inset-0" />
              <AlertDialogContent className="bg-white rounded-md p-6">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-semibold text-gray-900">
                    Confirm Account Deletion
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-base text-gray-700 mt-2">
                    Please confirm your password to permanently delete your
                    account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <form
                  onSubmit={handleSubmit(handleDeleteAccount)}
                  className="mt-6"
                >
                  <div className="mb-4">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-gray-800"
                    >
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      {...register("password", {
                        required: "Password is required",
                      })}
                      className="mt-1 block w-full text-gray-800"
                    />
                    {errors.password && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                  <div className="mb-4">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium text-gray-900" // Updated to text-gray-900
                    >
                      Confirm Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      {...register("confirmPassword", {
                        required: "Confirm your password",
                        validate: (val: string) => {
                          if (watch("password") != val) {
                            return "Your passwords do not match"
                          }
                        },
                      })}
                      className="mt-1 block w-full text-gray-800"
                    />
                    {errors.confirmPassword && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                  {/* Error message for mismatched passwords */}
                  {errorMessage && (
                    <p className="text-red-600 text-sm mb-4">{errorMessage}</p>
                  )}
                  <AlertDialogFooter className="mt-6">
                    <AlertDialogCancel asChild>
                      <Button variant="secondary">Cancel</Button>
                    </AlertDialogCancel>
                    <Button variant="destructive" type="submit">
                      Yes, Delete My Account
                    </Button>
                  </AlertDialogFooter>
                </form>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Account Deleted Dialog */}
        <Dialog
          open={accountDeleted}
          onOpenChange={(open) => {
            if (!open) {
              router.push("/login")
            }
          }}
        >
          {/* Semi-transparent overlay */}
          <DialogOverlay className="bg-black bg-opacity-50 fixed inset-0" />
          <DialogContent className="bg-white rounded-md p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Email Sent
              </DialogTitle>
              <DialogDescription className="text-base text-gray-700 mt-2">
                A deletion email has been sent to you.
              </DialogDescription>
            </DialogHeader>
            <Button
              variant="secondary"
              onClick={() => router.push("/login")}
              className="w-full mt-6 text-gray-900"
            >
              Go to Login
            </Button>
          </DialogContent>
        </Dialog>

        {/* Custom Notification Time Dialog */}
        <Dialog
          open={isNotificationDialogOpen}
          onOpenChange={setIsNotificationDialogOpen}
        >
          {/* Semi-transparent overlay */}
          <DialogOverlay className="bg-black bg-opacity-50 fixed inset-0" />
          <DialogContent className="bg-white rounded-md p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Set Custom Notification Time
              </DialogTitle>
              <DialogDescription className="text-base text-gray-700 mt-2">
                Select a custom notification time from the dropdown below.
              </DialogDescription>
            </DialogHeader>
            <form className="mt-6">
              <div className="mb-4">
                <Label
                  htmlFor="notificationTime"
                  className="text-sm font-medium text-gray-800"
                >
                  Notification Time
                </Label>
                <select
                  id="notificationTime"
                  value={notificationTime}
                  onChange={(e) => setNotificationTime(e.target.value)}
                  className="mt-1 block w-full text-gray-800"
                >
                  <option value="">Select time</option>
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="20">20 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                </select>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setIsNotificationDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="default" onClick={handleSaveNotificationTime}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    )
  )
}
