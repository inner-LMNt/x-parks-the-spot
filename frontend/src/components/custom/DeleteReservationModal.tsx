import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { cancelReservation } from '@/features/reservations/reservationsSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Reservation } from '@/types/type';

interface DeleteReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: Reservation;
    onConfirm: () => void; // Add this line
}

const DeleteReservationModal: React.FC<DeleteReservationModalProps> = ({ isOpen, onClose, reservation, onConfirm }) => {
    const dispatch = useAppDispatch();
    const { loading, error } = useAppSelector((state) => state.reservations);

    useEffect(() => {
        if (error) {
            toast({
                title: 'Failed to Cancel Reservation',
                description: error,
                variant: 'destructive',
            });
            // dispatch(resetReservationError()); // Uncomment if reset action
        }
    }, [error, dispatch]);

    const handleDelete = async () => {
        try {
            if (reservation.id) {
                await dispatch(cancelReservation(reservation.id)).unwrap();
                toast({
                    title: 'Reservation Cancelled',
                    description: 'Your reservation has been canceled successfully.',
                    variant: 'success',
                });
                onConfirm(); // Call the onConfirm prop
                onClose();
            } else {
                console.error('Reservation ID is undefined');
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <Card className="w-full max-w-md p-4">
                <CardHeader>
                    <CardTitle>Cancel Reservation</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Are you sure you want to cancel the following reservation?</p>
                    <ul className="my-4 space-y-2">
                        <li><strong>Parking Space ID:</strong> {reservation.parking_space_id}</li>
                        <li><strong>Start Time:</strong> {reservation.start_time ? new Date(reservation.start_time).toLocaleString() : 'N/A'}</li>
                        <li><strong>End Time:</strong> {reservation.end_time ? new Date(reservation.end_time).toLocaleString() : 'N/A'}</li>
                    </ul>
                    <Separator />
                    <div className="flex justify-center space-x-2 mt-4">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                            {loading ? 'Cancelling...' : 'Cancel Reservation'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DeleteReservationModal;