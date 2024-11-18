import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deleteCar, resetCarError } from "@/features/cars/carSlice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

interface DeleteCarModalProps {
  isOpen: boolean;
  onClose: () => void;
  carId: string;
  carDetails: { make: string; model: string; licensePlate: string };
}

const DeleteCarModal: React.FC<DeleteCarModalProps> = ({
  isOpen,
  onClose,
  carId,
  carDetails,
}) => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.cars);

  useEffect(() => {
    if (error) {
      toast({
        title: "Failed to Delete Car",
        description: error,
        variant: "destructive",
      });
      dispatch(resetCarError());
    }
  }, [error, dispatch]);

  const handleDelete = async () => {
    try {
      await dispatch(deleteCar(carId)).unwrap();
      toast({
        title: "Car Deleted",
        description: "Your car has been deleted successfully.",
        variant: "success",
      });
      onClose(); // Close the modal
    } catch (err) {
      // Error handling is already managed in useEffect
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <Card className="w-full max-w-md p-4">
        <CardHeader>
          <CardTitle>Delete Car</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Are you sure you want to delete the following car?</p>
          <ul className="my-4 space-y-2">
            <li>
              <strong>Make:</strong> {carDetails.make}
            </li>
            <li>
              <strong>Model:</strong> {carDetails.model}
            </li>
            <li>
              <strong>License Plate:</strong> {carDetails.licensePlate}
            </li>
          </ul>
          <Separator />
          <div className="flex justify-end space-x-2 mt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete Car"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeleteCarModal;
