'use client';

import React, { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { getAllConflicts } from '@/features/admin/adminSlice';
import { deleteParkingSpace } from '@/features/admin/adminSlice';

const DeleteListingDialog = ({ parkingSpaceId, parkingSpaceName }) => {
    const dispatch = useAppDispatch();
    const [isOpen, setIsOpen] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!deleteReason.trim()) {
            toast({
                title: "Error",
                description: "Please provide a reason for deletion",
                variant: "destructive",
            });
            return;
        }

        setIsDeleting(true);

        const resultAction = await dispatch(deleteParkingSpace({
            parkingSpaceId,
            reason: deleteReason
        }));

        if (deleteParkingSpace.fulfilled.match(resultAction)) {
            // Deletion successful
            toast({
                title: "Success",
                description: "Parking space has been deleted successfully",
                variant: "success",
            });

            // Refresh the reports list after successful deletion
            dispatch(getAllConflicts());
            setIsOpen(false);
        }
        else {
            // Deletion failed
            toast({
                title: "Error",
                description: resultAction.payload?.error || "Failed to delete parking space",
                variant: "destructive",
            });
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Button
                variant="destructive"
                size="sm"
                className="ml-2"
                onClick={() => setIsOpen(true)}
            >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete Listing
            </Button>

            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogContent className="w-96">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Parking Space</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{parkingSpaceName}&quot;? This action cannot be undone.
                            All future reservations will be cancelled and users will be notified.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="py-4">
                        <Label htmlFor="delete-reason" className="text-right">
                            Reason for Deletion (Required)
                        </Label>
                        <Input
                            id="delete-reason"
                            value={deleteReason}
                            onChange={(e) => setDeleteReason(e.target.value)}
                            placeholder="Enter reason for deletion..."
                            className="mt-2"
                        />
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-500 hover:bg-red-600"
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default DeleteListingDialog;