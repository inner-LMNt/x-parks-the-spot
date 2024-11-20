"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
  AlertCircle,
  ShieldX,
  Settings,
  User,
  DollarSign,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  getAllConflicts,
  getCancelled,
  updateConflictResponse,
  acknowledgeCancelled,
} from "@/features/admin/adminSlice";
import { fetchParkingSpace } from "@/features/parking-space/parkingSpaceSlice";
import { toast } from "@/hooks/use-toast";
import ImageWrapper from "@/components/custom/ImageWrapper";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Report } from "@/types/type";
import { format, isValid } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import DeleteListingDialog from "@/app/conflict/components/DeleteListingDialog";
import UserInfo from "./components/[user-id]/UserInfo";

const MAX_ITEMS = 4;

const safeFormatDate = (
  dateString: string | undefined,
  dateFormat: string,
): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return isValid(date) ? format(date, dateFormat) : "Invalid date";
};

const ReportSkeleton = () => (
  <Card className="shadow-lg">
    <CardHeader>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-7 w-48" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
    </CardHeader>
  </Card>
);

const ReportCard = ({
  report,
  expandedReportId,
  toggleReport,
  handleResponseSubmit,
  responseText,
  setResponseText,
  handleImageClick,
  parkingSpaceData,
  handleUserClick, // Add this prop
}: any) => {
  const getReportIcon = (type: Report["type"]) => {
    switch (type) {
      case "Reservation Issue":
        return <AlertCircle className="w-4 h-4 text-green-500" />;
      case "Renter Overstay":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "Damage Report":
        return <ShieldX className="w-4 h-4 text-red-500" />;
      default:
        return <Settings className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <Card key={report.id} className="shadow-lg">
      <CardHeader
        className="cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => toggleReport(report.id, report.parking_space_id)}
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {getReportIcon(report.type)}
              <CardTitle className="text-xl text-slate-950">
                {report.type}
              </CardTitle>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Calendar className="w-4 h-4" />
              <span>
                {safeFormatDate(report.created_at, "MMM dd, yyyy, hh:mm a")}
              </span>
              <Tag className="w-4 h-4" />
              <span>
                {report.parking_space_address || "Location not available"}
              </span>
            </div>
          </div>
          {expandedReportId === report.id ? (
            <ChevronUp className="w-5 h-5 text-slate-700" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-700" />
          )}
        </div>
      </CardHeader>
      <AnimatePresence>
        {expandedReportId === report.id && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <CardContent className="bg-slate-50 space-y-6 py-2">
              {/* Report Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="space-y-2 text-slate-950">
                    {report.owner_name && (
                      <div className="flex items-center gap-2">
                        <strong>Owner:</strong>
                        <button
                          className="text-blue-500 underline hover:text-blue-700 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log("Owner ID:", report.owner_id); // Debug log
                            handleUserClick(report.owner_id);
                          }}
                        >
                          {report.owner_name}
                        </button>
                      </div>
                    )}

                    {report.renter_name && (
                      <div className="flex items-center gap-2">
                        <strong>Renter:</strong>
                        <button
                          className="text-blue-500 underline hover:text-blue-700 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log("Renter ID:", report); // Debug log
                            handleUserClick(report.user_id);
                          }}
                        >
                          {report.renter_name}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Reservation Period */}
                  {report.start_time && report.end_time && (
                    <div className="flex items-center gap-2 text-slate-950">
                      <Calendar className="w-4 h-4 text-slate-600" />
                      <span>
                        <strong>Reservation:</strong>{" "}
                        {safeFormatDate(
                          report.start_time,
                          "MMM dd, yyyy, hh:mm a",
                        )}{" "}
                        -{" "}
                        {safeFormatDate(
                          report.end_time,
                          "MMM dd, yyyy, hh:mm a",
                        )}
                      </span>
                    </div>
                  )}
                  {/* Parking Space */}
                  {report.parking_space_name && (
                    <div className="flex items-center gap-2 text-slate-950">
                      <MapPin className="w-4 h-4 text-slate-600" />
                      <span>
                        <strong>Rented Parking Space:</strong>{" "}
                        {report.parking_space_name}
                      </span>
                      <DeleteListingDialog
                        parkingSpaceId={report.parking_space_id}
                        parkingSpaceName={report.parking_space_name}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {/* Type-specific Information */}
                  {report.type === "Renter Overstay" && (
                    <>
                      <div className="flex items-center gap-2 text-slate-950">
                        <Clock className="w-4 h-4 text-slate-600" />
                        <span>
                          <strong>Departure:</strong>{" "}
                          {safeFormatDate(
                            report.departure_time,
                            "MMM dd, yyyy, hh:mm a",
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-950">
                        <Clock className="w-4 h-4 text-slate-600" />
                        <span>
                          <strong>Overstay:</strong> {report.overstay_duration}{" "}
                          mins
                        </span>
                        <DollarSign className="w-4 h-4 text-slate-600 ml-4" />
                        <span>
                          <strong>Charge:</strong> ${report.overstay_charge}
                        </span>
                      </div>
                    </>
                  )}
                  {report.type === "Damage Report" && (
                    <div className="flex items-center gap-2 text-slate-950">
                      <Tag className="w-4 h-4 text-slate-600" />
                      <span>
                        <strong>Damage:</strong> {report.damage_type}
                        <span className="ml-2">({report.damage_severity})</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <p className="text-slate-950">
                  <strong>Description:</strong> {report.description}
                </p>
              </div>

              {/* Report Image */}
              {report.image_url && (
                <div
                  className="relative w-full h-64 cursor-pointer"
                  onClick={() => handleImageClick(report.image_url)}
                >
                  <ImageWrapper
                    src={report.image_url}
                    alt="Report Image"
                    layout="fill"
                    objectFit="cover"
                    className="rounded-lg"
                  />
                </div>
              )}

              {/* Response input and submit button */}
              <div className="space-y-2">
                <textarea
                  value={responseText[report.id] || ""}
                  onChange={(e) =>
                    setResponseText((prev: any) => ({
                      ...prev,
                      [report.id]: e.target.value,
                    }))
                  }
                  placeholder="Enter your response..."
                  className="w-full p-2 border border-gray-300 rounded-md text-black"
                />
                <Button onClick={() => handleResponseSubmit(report.id)}>
                  Submit Response
                </Button>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

const CancellationCard = ({
  cancellation,
  handleAcknowledgeCancellation,
}: any) => (
  <Card key={cancellation.id} className="shadow-lg">
    <CardHeader>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-xl text-slate-950">
              Cancelled Spot
            </CardTitle>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>
              {safeFormatDate(cancellation.created_at, "MMM dd, yyyy")}
            </span>
            <Tag className="w-4 h-4" />
            <span>
              {cancellation.parking_space_address || "Location not available"}
            </span>
          </div>
        </div>
      </div>
    </CardHeader>
    <CardContent className="bg-slate-50 space-y-2 py-2">
      <Button onClick={() => handleAcknowledgeCancellation(cancellation.id)}>
        Acknowledge Cancellation
      </Button>
    </CardContent>
  </Card>
);

const AdminReportsPage = () => {
  const dispatch = useAppDispatch();
  const {
    conflicts: reports = [],
    cancellations = [],
    loading,
    error,
  } = useAppSelector((state) => state.admin);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<{ [key: string]: string }>(
    {},
  );
  const [parkingSpaceData, setParkingSpaceData] = useState<{
    [key: string]: any;
  }>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleUserClick = (userId: string) => {
    console.log("User ID clicked:", userId); // Debug log
    setSelectedUserId(userId);
  };

  const closeModal = () => {
    setSelectedUserId(null); // Close the modal
  };

  useEffect(() => {
    dispatch(getAllConflicts());
    dispatch(getCancelled());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error]);

  const toggleReport = (id: string, parkingSpaceId: string) => {
    setExpandedReportId(expandedReportId === id ? null : id);

    if (parkingSpaceId && !parkingSpaceData[parkingSpaceId]) {
      dispatch(fetchParkingSpace(parkingSpaceId))
        .unwrap()
        .then((data: any) =>
          setParkingSpaceData((prev) => ({ ...prev, [parkingSpaceId]: data })),
        )
        .catch(() => {
          toast({
            title: "Error",
            description: "Failed to fetch parking space details.",
            variant: "destructive",
          });
        });
    }
  };

  const handleImageClick = (imageSrc: string) => {
    setSelectedImage(imageSrc);
  };

  const handleResponseSubmit = async (id: string) => {
    const response = responseText[id];
    if (response?.trim()) {
      try {
        await dispatch(updateConflictResponse({ id, response })).unwrap();
        toast({
          title: "Response Sent",
          description: "The report response has been updated.",
          variant: "success",
        });
        dispatch(getAllConflicts());
        setResponseText((prev) => ({ ...prev, [id]: "" }));
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleAcknowledgeCancellation = async (id: string) => {
    try {
      await dispatch(acknowledgeCancelled(id)).unwrap();
      toast({
        title: "Cancellation Acknowledged",
        description: "The cancellation has been removed.",
        variant: "success",
      });
      dispatch(getCancelled());
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Limit items based on MAX_ITEMS with priority for reports
  const visibleReports = reports.slice(0, MAX_ITEMS);
  const remainingItems = MAX_ITEMS - visibleReports.length;
  const visibleCancellations = cancellations.slice(0, remainingItems);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <h1 className="text-3xl font-bold mb-4 text-black">
            Report Management
          </h1>
          <div className="space-y-4">
            {[...visibleReports, ...visibleCancellations]
              .slice(0, MAX_ITEMS)
              .map((report, i) => (
                <ReportSkeleton key={i} />
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <h1 className="text-3xl font-bold mb-4 text-black">
          Report Management
        </h1>
        {reports.length === 0 && cancellations.length === 0 ? (
          <p className="text-center text-gray-800">
            No reports or cancellations available.
          </p>
        ) : (
          <div className="space-y-4">
            {visibleReports.map((report: Report) => (
              <ReportCard
                key={report.id}
                report={report}
                expandedReportId={expandedReportId}
                toggleReport={toggleReport}
                handleResponseSubmit={handleResponseSubmit}
                responseText={responseText}
                setResponseText={setResponseText}
                handleImageClick={handleImageClick}
                parkingSpaceData={parkingSpaceData}
                handleUserClick={handleUserClick} // Pass the function here
              />
            ))}

            {visibleCancellations.map((cancellation: any) => (
              <CancellationCard
                key={cancellation.id}
                cancellation={cancellation}
                handleAcknowledgeCancellation={handleAcknowledgeCancellation}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={!!selectedUserId} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Information</DialogTitle>
          </DialogHeader>
          {selectedUserId ? (
            <UserInfo userId={selectedUserId} />
          ) : (
            <p>No user selected.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Modal */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expanded Image</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-96">
            <ImageWrapper
              src={selectedImage || ""}
              alt="Expanded Image"
              layout="fill"
              objectFit="contain"
              className="rounded-lg"
            />
          </div>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => setSelectedImage(null)}
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReportsPage;
