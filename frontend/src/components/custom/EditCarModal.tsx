// src/components/EditCarModal.tsx

import React, { useState, useEffect } from "react";
import { Trash } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  updateCar,
  deleteCar,
  resetCarError,
  fetchUserCars,
} from "@/features/cars/carSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { CarInfo } from "@/types/type";

interface EditCarModalProps {
  isOpen: boolean;
  onClose: () => void;
  car: CarInfo;
}

const EditCarModal: React.FC<EditCarModalProps> = ({
  isOpen,
  onClose,
  car,
}) => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.cars);

  const [make, setMake] = useState<string>(car.make);
  const [model, setModel] = useState<string>(car.model);
  const [licensePlate, setLicensePlate] = useState(car.license_plate);
  const [licensePlateState, setLicensePlateState] = useState(
    car.license_plate_state,
  );
  const [color, setColor] = useState(car.color);

  useEffect(() => {
    if (error) {
      toast({
        title: "Failed to Add Car",
        description: error,
        variant: "destructive",
      });
      dispatch(resetCarError());
    }
  }, [error, dispatch]);

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this car?",
    );
    if (confirmDelete) {
      onClose();
      // Await the deletion and then re-fetch the cars
      // @ts-ignore
      await dispatch(deleteCar(id));
      // @ts-ignore
      dispatch(fetchUserCars()); // Re-fetch the cars
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!make || !model || !licensePlate || !licensePlateState) {
      toast({
        title: "Missing Information",
        description: "Please fill out all required fields.",
        variant: "destructive",
      });
      return;
    }

    const updateData = {
      make,
      model,
      license_plate: licensePlate,
      license_plate_state: licensePlateState,
      color, // Optional
    };

    try {
      await dispatch(updateCar({ id: car.id, updateData })).unwrap();
      toast({
        title: "Car Updated",
        description: "Your car has been updated successfully.",
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
          <CardTitle>Update a Car</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Input
                id="make"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                required
                placeholder="e.g., Toyota"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                placeholder="e.g., Corolla"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licensePlate">License Plate</Label>
              <Input
                id="licensePlate"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                required
                placeholder="e.g., ABC-1234"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licensePlateState">License Plate State</Label>
              <Input
                id="licensePlateState"
                value={licensePlateState}
                onChange={(e) => setLicensePlateState(e.target.value)}
                required
                placeholder="e.g., PA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color (Optional)</Label>
              <Input
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g., Red"
              />
            </div>
            <Separator />
            <div className="flex justify-end space-x-2">
              <Button
                variant="destructive"
                size="icon"
                disabled={loading}
                onClick={() => handleDelete(car.id as string)}
              >
                <Trash className="w-4 h-4" />
              </Button>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Car"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditCarModal;
