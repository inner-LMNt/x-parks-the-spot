import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch } from "@/store/hooks";
import { banUser } from "@/features/admin/adminSlice";

interface UserDetails {
  id: string;
  name: string;
  email: string;
  pastBookings?: any[];
  parkingSpaces?: any[];
  reports?: any[];
}

const UserInfo: React.FC<{ userId: string; userDetails?: UserDetails }> = ({
                                                                             userId,
                                                                             userDetails,
                                                                           }) => {
  const dispatch = useAppDispatch();
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [banRationale, setBanRationale] = useState("");

  const handleBanUser = () => {
    if (banRationale.trim() === "") {
      alert("Please enter a rationale for banning the user.");
      return;
    }

    // Dispatch ban user action
    dispatch(banUser({ userId, rationale: banRationale }))
        .unwrap()
        .then(() => {
          alert("User banned successfully.");
          setIsBanDialogOpen(false); // Close the modal
        })
        .catch((error) => {
          alert(`Failed to ban user: ${error}`);
        });
  };

  return (
      <div className="flex items-center justify-center">
        <Card className="shadow-md border border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              {userDetails?.name || "User Name"}
            </CardTitle>
            <p className="text-gray-600">{userDetails?.email || "User Email"}</p>
            {/* Ban User Button */}
            <Button
                className="mt-4 bg-red-500 text-white hover:bg-red-600"
                onClick={() => setIsBanDialogOpen(true)}
            >
              Ban User
            </Button>
          </CardHeader>
          <CardContent className="mt-4">
            {/* Tabs */}
            <Tabs defaultValue="pastBookings">
              <TabsList>
                <TabsTrigger value="pastBookings">Past Bookings</TabsTrigger>
                <TabsTrigger value="parkingSpaces">Parking Spaces</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>

              <TabsContent value="pastBookings">
                <ScrollArea className="h-48">
                  {userDetails?.pastBookings && userDetails.pastBookings.length > 0 ? (
                      userDetails.pastBookings.map((booking) => (
                          <div
                              key={booking.id}
                              className="p-3 border-b border-gray-200 hover:bg-gray-50"
                          >
                            <p className="text-gray-800 font-medium">{booking.name}</p>
                            <p className="text-sm text-gray-500">Booking ID: {booking.id}</p>
                          </div>
                      ))
                  ) : (
                      <p className="text-gray-500">No past bookings available.</p>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="parkingSpaces">
                <ScrollArea className="h-48">
                  {userDetails?.parkingSpaces && userDetails.parkingSpaces.length > 0 ? (
                      userDetails.parkingSpaces.map((space) => (
                          <div
                              key={space.id}
                              className="p-3 border-b border-gray-200 hover:bg-gray-50"
                          >
                            <p className="text-gray-800 font-medium">{space.name}</p>
                            <p className="text-sm text-gray-500">Space ID: {space.id}</p>
                          </div>
                      ))
                  ) : (
                      <p className="text-gray-500">No parking spaces available.</p>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="reports">
                <ScrollArea className="h-48">
                  {userDetails?.reports && userDetails.reports.length > 0 ? (
                      userDetails.reports.map((report) => (
                          <div
                              key={report.id}
                              className="p-3 border-b border-gray-200 hover:bg-gray-50"
                          >
                            <p className="text-gray-800 font-medium">
                              {report.description || "Report"}
                            </p>
                            <p className="text-sm text-gray-500">Report ID: {report.id}</p>
                          </div>
                      ))
                  ) : (
                      <p className="text-gray-500">No reports available.</p>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Ban User Modal */}
        <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ban User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
            <textarea
                value={banRationale}
                onChange={(e) => setBanRationale(e.target.value)}
                placeholder="Enter a rationale for banning the user..."
                className="w-full p-3 border border-gray-300 rounded-md"
            />
              <Button
                  className="w-full bg-red-500 text-white hover:bg-red-600"
                  onClick={handleBanUser}
              >
                Submit Ban
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default UserInfo;
