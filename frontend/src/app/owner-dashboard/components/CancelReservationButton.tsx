'use client';

import React from "react";
import { AlertTriangle } from "lucide-react";
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { forceCancelReservation, resetCancellationState } from "@/features/owner-reservations/reservationCancellationSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useToast } from "@/hooks/use-toast";

interface CancelReservationButtonProps {
    reservationId: string;
    onCancelSuccess?: () => void;
}

export const CancelReservationButton = ({
                                            reservationId,
                                            onCancelSuccess,
                                        }: CancelReservationButtonProps) => {
    const dispatch = useAppDispatch();
    const { loading, error, success } = useAppSelector(
        (state) => state.reservationCancellations
    );
    const { toast } = useToast();

    const handleCancel = async () => {
        await dispatch(forceCancelReservation(reservationId));
        if (!error) {
            onCancelSuccess?.();
        } else {
            toast({
                title: 'Error cancelling reservation',
                description: error,
                variant: 'destructive',
            });
        }
    };

    React.useEffect(() => {
        if (success) {
            dispatch(resetCancellationState());
        }
    }, [success, dispatch]);

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="ml-2">
                    Force Cancel
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="w-96 bg-white text-slate-950 rounded-lg">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-slate-950">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        Confirm Force Cancellation
                    </AlertDialogTitle>
                    <AlertDialogDescription className="mt-4 text-sm text-slate-700">
                        Are you sure you want to forcefully cancel this reservation? This action cannot be undone.
                        The renter will be alerted of this cancellation and refunded.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel asChild>
                        <Button
                            variant="outline"
                            disabled={loading}
                            className="text-slate-700 border-slate-300 hover:bg-slate-100"
                        >
                            Abort
                        </Button>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Button
                            variant="destructive"
                            onClick={handleCancel}
                            disabled={loading}
                            className="text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400"
                        >
                            {loading ? "Canceling..." : "Force Cancel Reservation"}
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
