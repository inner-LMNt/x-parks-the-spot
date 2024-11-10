import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { awardPoints } from '@/features/parking-space/parkingSpaceSlice';
import { RootState } from '@/store';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Webcam from "react-webcam";

const DriverArrive = ({ currentSpotId, userLocation, closeDriverArriveDialog }) => {
    const dispatch = useDispatch();
    const { toast } = useToast();
    const [photo, setPhoto] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [photoTimestamp, setPhotoTimestamp] = useState<string | null>(null);
    const [photoLocation, setPhotoLocation] = useState<string | null>(null);
    const webcamRef = useRef<Webcam>(null);
    const [isCameraActive, setIsCameraActive] = useState(true);
    const [statusSelection, setStatusSelection] = useState('taken');
    const user = useSelector((state: RootState) => state.user);

    useEffect(() => {
        setIsCameraActive(true); // Ensure camera is active on mount
    }, []);

    // Capture photo using the webcam and store as file
    const handleCapture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            fetch(imageSrc)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
                    setPhoto(file);
                    setPreviewUrl(imageSrc);
                    setIsCameraActive(false);
                    setPhotoTimestamp(new Date().toLocaleString());
                    setPhotoLocation(`${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`);
                })
                .catch(error => {
                    console.error("Error converting image to file:", error);
                });
        } else {
            console.error("Failed to capture image from webcam.");
        }
    }, [userLocation]);

    const handleStatusSubmit = async () => {
        if (!currentSpotId || !userLocation || !photo) {
            toast({
                title: 'Missing Information',
                description: 'Please upload a photo and ensure location is available.',
                variant: 'destructive',
            });
            console.warn("Submission aborted: Missing currentSpotId, userLocation, or photo.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append('latitude', userLocation.lat.toString());
            formData.append('longitude', userLocation.lng.toString());
            formData.append('photo', photo);
            formData.append('status', statusSelection);

            console.log("Submitting form data:", formData);

            await dispatch(awardPoints({ parkingSpaceId: currentSpotId, formData })).unwrap();
            toast({
                title: 'Thank you for updating the spot',
                description: '',
                variant: 'success',
            });

            closeDriverArriveDialog();
        } catch (error) {
            console.error("Failed to update spot status:", error);
            toast({
                title: 'Spot Update Failed',
                description: 'Failed to update the parking spot status. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const handleRetake = () => {
        setPhoto(null);
        setPreviewUrl(null);
        setIsCameraActive(true);
        setPhotoTimestamp(null);
        setPhotoLocation(null);
        console.log("Photo reset for retake.");
    };

    return (
        <Dialog open={true} onOpenChange={(isOpen) => !isOpen && closeDriverArriveDialog()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Spot Verification</DialogTitle>
                </DialogHeader>
                <div className="text-center">
                    <p>Is this spot taken, or are you parked here?</p>

                    {photoTimestamp && (
                        <p className="text-gray-600 text-sm mb-2">Captured at: {photoTimestamp}</p>
                    )}
                    {photoLocation && (
                        <p className="text-gray-600 text-sm mb-2">Location: {photoLocation}</p>
                    )}

                    {/* Photo preview or webcam capture */}
                    {previewUrl ? (
                        <div>
                            <img src={previewUrl} alt="Preview" className="w-full mt-4 rounded-lg" />
                            <Button onClick={handleRetake} className="mt-4 bg-yellow-500 text-white">
                                Retake Photo
                            </Button>
                        </div>
                    ) : (
                        <div className="mt-4">
                            {isCameraActive && (
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    className="w-full rounded-lg"
                                />
                            )}
                            <Button onClick={handleCapture} className="bg-green-500 text-white mt-2">
                                Capture Photo
                            </Button>
                        </div>
                    )}

                    {/* Radio buttons for "This Spot was Already Taken" and "I Am Parked Here" */}
                    <div className="flex flex-col mt-4 space-y-2">
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                value="taken"
                                checked={statusSelection === 'taken'}
                                onChange={() => setStatusSelection('taken')}
                                className="form-radio h-5 w-5 text-green-500"
                            />
                            <span>This Spot was Already Taken</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                value="parked"
                                checked={statusSelection === 'parked'}
                                onChange={() => setStatusSelection('parked')}
                                className="form-radio h-5 w-5 text-blue-500"
                            />
                            <span>I Am Parked Here</span>
                        </label>
                    </div>

                    {/* Submit button */}
                    <div className="flex justify-center mt-4 space-x-2">
                        <Button onClick={handleStatusSubmit} disabled={!photo} className="bg-blue-500 text-white">
                            Submit
                        </Button>
                        <Button onClick={closeDriverArriveDialog} variant="outline">Close</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default DriverArrive;
