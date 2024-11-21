import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch } from "@/store/hooks";
import { banUser } from "@/features/admin/adminSlice";
import { toast } from "@/hooks/use-toast";

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
      toast({
        title: "Error",
        description: "Please enter a rationale for banning the user.",
        variant: "destructive",
      });
      return;
    }

    dispatch(banUser({ userId, rationale: banRationale }))
        .unwrap()
        .then(() => {
          toast({
            title: "Success",
            description: "User banned successfully.",
            variant: "success",
          });
          setIsBanDialogOpen(false); // Close the modal
        })
        //@ts-ignore
        .catch((error) => {
          toast({
            title: "Error",
            description: `Failed to ban user: ${error}`,
            variant: "destructive",
          });
        });
  };

  return (
      <div className="flex items-center justify-center">
        <Card className="shadow-md border border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-700">
              {userDetails?.name || "User Name"}
            </CardTitle>
            <p className="text-gray-700">{userDetails?.email || "User Email"}</p>
            <Button
                className="mt-4 bg-red-500 text-white hover:bg-red-600"
                onClick={() => setIsBanDialogOpen(true)}
            >
              Ban User
            </Button>
          </CardHeader>
          <CardContent className="mt-4">
            <Tabs defaultValue="pastBookings">
              <TabsList>
                <TabsTrigger value="pastBookings" className="text-gray-700">
                  Past Bookings
                </TabsTrigger>
                <TabsTrigger value="parkingSpaces" className="text-gray-700">
                  Parking Spaces
                </TabsTrigger>
                <TabsTrigger value="reports" className="text-gray-700">
                  Reports
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pastBookings">
                <ScrollArea className="h-48">
                  {userDetails?.pastBookings && userDetails.pastBookings.length > 0 ? (
                      userDetails.pastBookings.map((booking) => (
                          <div
                              key={booking.id}
                              className="p-3 border-b border-gray-200 hover:bg-gray-50"
                          >
                            <p className="text-blue-600 font-medium">
                              {booking.parking_space_name || "Unnamed Parking Space"}
                            </p>
                            <p className="text-sm text-gray-500">
                              <span>Start: {new Date(booking.start_time).toLocaleString()}</span>
                              <br />
                              <span>End: {new Date(booking.end_time).toLocaleString()}</span>
                              <br />
                              <span>Cost: ${booking.cost || "N/A"}</span>
                            </p>
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
                            <p className="text-blue-600 font-medium">{space.name || "Unnamed Space"}</p>
                            <p className="text-sm text-gray-500">
                              <span>Address: {space.address || "N/A"}</span>
                              <br />
                              <span> Verification: {space.verification_status || "Unknown"}</span>
                              <br />
                              <span>Created At: {new Date(space.created_at).toLocaleDateString()}</span>
                            </p>
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
                            <p className="text-blue-600 font-medium">{report.type || "Unknown Report"}</p>
                            <p className="text-sm text-gray-500">
                              <span>Status: {report.status || "Pending"}</span>
                              <br />
                              <span>Description: {report.description || "No details provided"}</span>
                              <br />
                              <span>Created At: {new Date(report.created_at).toLocaleDateString()}</span>
                              <br />
                              <span>Updated At: {new Date(report.updated_at).toLocaleDateString()}</span>
                            </p>
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

        <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-700">Ban User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
            <textarea
                value={banRationale}
                onChange={(e) => setBanRationale(e.target.value)}
                placeholder="Enter a rationale for banning the user..."
                className="w-full p-3 border border-gray-300 rounded-md text-gray-700"
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
