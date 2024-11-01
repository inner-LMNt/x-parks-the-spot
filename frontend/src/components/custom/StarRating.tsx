import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { submitRating, fetchParkingSpace } from '@/features/parking-space/parkingSpaceSlice';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const StarRatingInput = ({
                             value,
                             onChange,
                             disabled,
                             originalValue
                         }: {
    value: number;
    onChange: (rating: number) => void;
    disabled?: boolean;
    originalValue: number;
}) => {
    const [hoverValue, setHoverValue] = useState<number | null>(null);

    const handleStarClick = (rating: number) => {
        if (!disabled) {
            // If clicking the same star that's currently selected, revert to original value
            if (value === rating) {
                onChange(originalValue);
            } else {
                onChange(rating);
            }
        }
    };

    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={cn(
                        "w-6 h-6 cursor-pointer transform transition-all duration-200",
                        (hoverValue !== null ? star <= hoverValue : star <= value)
                            ? "text-yellow-400 fill-yellow-400 scale-110"
                            : "text-gray-300 hover:scale-105",
                        disabled && "cursor-not-allowed opacity-50",
                        "hover:rotate-[8deg]"
                    )}
                    onMouseEnter={() => !disabled && setHoverValue(star)}
                    onMouseLeave={() => !disabled && setHoverValue(null)}
                    onClick={() => handleStarClick(star)}
                />
            ))}
        </div>
    );
};

const RatingSection = ({
                           parkingSpaceId
                       }: {
    parkingSpaceId: string;
}) => {
    const dispatch = useDispatch();
    const [availabilityRating, setAvailabilityRating] = useState(0);
    const [cleanlinessRating, setCleanlinessRating] = useState(0);
    const [originalAvailabilityRating, setOriginalAvailabilityRating] = useState(0);
    const [originalCleanlinessRating, setOriginalCleanlinessRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        const fetchRatings = async () => {
            try {
                const result = await dispatch(fetchParkingSpace(parkingSpaceId));
                if (fetchParkingSpace.fulfilled.match(result)) {
                    const parkingSpace = result.payload;
                    // Only set ratings if they exist and are numbers
                    const availRating = typeof parkingSpace.avg_availability_rating === 'number'
                        ? parkingSpace.avg_availability_rating : 0;
                    const cleanRating = typeof parkingSpace.avg_cleanliness_rating === 'number'
                        ? parkingSpace.avg_cleanliness_rating : 0;

                    setAvailabilityRating(availRating);
                    setCleanlinessRating(cleanRating);
                    setOriginalAvailabilityRating(availRating);
                    setOriginalCleanlinessRating(cleanRating);
                }
            } catch (error) {
                console.error('Failed to fetch parking space ratings:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load existing ratings.',
                    variant: 'destructive',
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchRatings();
    }, [dispatch, parkingSpaceId]);

    // Check for changes whenever ratings are updated
    useEffect(() => {
        const hasRatingChanges =
            availabilityRating !== originalAvailabilityRating ||
            cleanlinessRating !== originalCleanlinessRating;
        setHasChanges(hasRatingChanges);
    }, [availabilityRating, cleanlinessRating, originalAvailabilityRating, originalCleanlinessRating]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const result = await dispatch(submitRating({
            parkingSpaceId,
            availabilityRating: availabilityRating || undefined,
            cleanlinessRating: cleanlinessRating || undefined,
        }));

        if (submitRating.fulfilled.match(result)) {
            toast({
                title: 'Rating Submitted',
                description: 'Thank you for your feedback!',
                variant: 'success',
            });
            // Update original ratings to match current
            setOriginalAvailabilityRating(availabilityRating);
            setOriginalCleanlinessRating(cleanlinessRating);
            setHasChanges(false);
            // Refresh parking space data to get updated ratings
            dispatch(fetchParkingSpace(parkingSpaceId));
        } else {
            toast({
                title: 'Error',
                description: 'Failed to submit rating. Please try again.',
                variant: 'destructive',
            });
        }
        setIsSubmitting(false);
    };

    const handleReset = () => {
        setAvailabilityRating(originalAvailabilityRating);
        setCleanlinessRating(originalCleanlinessRating);
    };

    if (isLoading) {
        return <div className="mt-4 text-sm text-gray-600">Loading ratings...</div>;
    }

    return (
        <div className="mt-4 space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium">Rate your experience</h4>

            <div className="space-y-4">
                <div>
                    <label className="text-sm text-gray-600 block mb-1">Availability</label>
                    <StarRatingInput
                        value={availabilityRating}
                        onChange={setAvailabilityRating}
                        disabled={isSubmitting}
                        originalValue={originalAvailabilityRating}
                    />
                </div>

                <div>
                    <label className="text-sm text-gray-600 block mb-1">Cleanliness</label>
                    <StarRatingInput
                        value={cleanlinessRating}
                        onChange={setCleanlinessRating}
                        disabled={isSubmitting}
                        originalValue={originalCleanlinessRating}
                    />
                </div>
            </div>

            <div className="flex gap-2">
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || (!availabilityRating && !cleanlinessRating) || !hasChanges}
                    className="flex-1"
                    variant="default"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                </Button>

                {hasChanges && (
                    <Button
                        onClick={handleReset}
                        disabled={isSubmitting}
                        variant="outline"
                    >
                        Reset
                    </Button>
                )}
            </div>
        </div>
    );
};

export default RatingSection;