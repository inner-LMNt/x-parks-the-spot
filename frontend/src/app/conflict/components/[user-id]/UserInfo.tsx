import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAppDispatch } from "@/store/hooks"
import { banUser } from "@/features/admin/adminSlice"
import { toast } from "@/hooks/use-toast"

interface UserDetails {
  id: string
  name: string
  email: string
  pastBookings?: any[]
  parkingSpaces?: any[]
  reports?: any[]
}

const UserInfo: React.FC<{ userId: string; userDetails?: UserDetails }> = ({
  userId,
  userDetails,
}) => {
  const dispatch = useAppDispatch()
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false)
  const [banRationale, setBanRationale] = useState("")

  const handleBanUser = () => {
    if (banRationale.trim() === "") {
      toast({
        title: "Error",
        description: "Please enter a rationale for banning the user.",
        variant: "destructive",
      })
      return
    }

    dispatch(banUser({ userId, rationale: banRationale }))
      .unwrap()
      .then(() => {
        toast({
          title: "Success",
          description: "User banned successfully.",
          variant: "success",
        })
        setIsBanDialogOpen(false) // Close the modal
      })
      //@ts-ignore
      .catch((error) => {
        toast({
          title: "Error",
          description: `Failed to ban user: ${error}`,
          variant: "destructive",
        })
      })
  }

  return (
    <>
      <div className="w-full overflow-hidden">
        {/* Header Section */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800">
            {userDetails?.name || "User Name"}
          </h2>
          <p className="text-gray-600">{userDetails?.email || "User Email"}</p>
          <button
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            onClick={() => setIsBanDialogOpen(true)}
          >
            Ban User
          </button>
        </div>

        {/* Content Section */}
        <div className="p-6">
          <Tabs defaultValue="pastBookings">
            <TabsList
                className="flex space-x-4 border-b border-gray-200 flex-1 mb-4 py-4 w-full bg-gray-100 rounded-lg"
                style={{ minHeight: '3 rem' }}
            >
              <TabsTrigger
                  value="pastBookings"
                  className="w-32 text-gray-700 hover:text-gray-900 focus:outline-none text-center whitespace-normal py-2 px-3 leading-6"
              >
                Past Bookings
              </TabsTrigger>
              <TabsTrigger
                  value="parkingSpaces"
                  className="w-32 text-gray-700 hover:text-gray-900 focus:outline-none text-center whitespace-normal py-2 px-3 leading-6"
              >
                Parking Spaces
              </TabsTrigger>
              <TabsTrigger
                  value="reports"
                  className="w-32 text-gray-700 hover:text-gray-900 focus:outline-none text-center whitespace-normal py-2 px-3 leading-6"
              >
                Reports
              </TabsTrigger>
            </TabsList>


            {/* Past Bookings Tab */}
            <TabsContent value="pastBookings">
              <ScrollArea className="h-48 overflow-y-auto">
                {userDetails?.pastBookings &&
                userDetails.pastBookings.length > 0 ? (
                  userDetails.pastBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-blue-600 font-medium">
                        {booking.parking_space_name || "Unnamed Parking Space"}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        <span>
                          <strong>Start:</strong>{" "}
                          {new Date(booking.start_time).toLocaleString()}
                        </span>
                        <br />
                        <span>
                          <strong>End:</strong>{" "}
                          {new Date(booking.end_time).toLocaleString()}
                        </span>
                        <br />
                        <span>
                          <strong>Cost:</strong> ${booking.cost || "N/A"}
                        </span>
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No past bookings available.</p>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Parking Spaces Tab */}
            <TabsContent value="parkingSpaces">
              <ScrollArea className="h-48 overflow-y-auto">
                {userDetails?.parkingSpaces &&
                userDetails.parkingSpaces.length > 0 ? (
                  userDetails.parkingSpaces.map((space) => (
                    <div
                      key={space.id}
                      className="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-blue-600 font-medium">
                        {space.name || "Unnamed Space"}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        <span>
                          <strong>Address:</strong> {space.address || "N/A"}
                        </span>
                        <br />
                        <span>
                          <strong>Verification:</strong>{" "}
                          {space.verification_status || "Unknown"}
                        </span>
                        <br />
                        <span>
                          <strong>Created At:</strong>{" "}
                          {new Date(space.created_at).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No parking spaces available.</p>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports">
              <ScrollArea className="h-48 overflow-y-auto">
                {userDetails?.reports && userDetails.reports.length > 0 ? (
                  userDetails.reports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-blue-600 font-medium">
                        {report.type || "Unknown Report"}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        <span>
                          <strong>Status:</strong> {report.status || "Pending"}
                        </span>
                        <br />
                        <span>
                          <strong>Description:</strong>{" "}
                          {report.description || "No details provided"}
                        </span>
                        <br />
                        <span>
                          <strong>Created At:</strong>{" "}
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                        <br />
                        <span>
                          <strong>Updated At:</strong>{" "}
                          {new Date(report.updated_at).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No reports available.</p>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Ban User Dialog */}
      <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
        <DialogContent className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-700">
              Ban User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <textarea
              value={banRationale}
              onChange={(e) => setBanRationale(e.target.value)}
              placeholder="Enter a rationale for banning the user..."
              className="w-full p-3 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={4}
            />
            <button
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              onClick={handleBanUser}
            >
              Submit Ban
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default UserInfo
