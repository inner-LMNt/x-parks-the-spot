'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X } from 'lucide-react';

interface ImageUploadProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    handleCapturePhoto: () => void;
    onFileSelect: (file: File | undefined) => void;
}

export const ImageUpload = ({
                                videoRef,
                                handleCapturePhoto,
                                onFileSelect,
                            }: ImageUploadProps) => {
    const [showCamera, setShowCamera] = useState(false);
    const [savedImage, setSavedImage] = useState<string | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);

    useEffect(() => {
        let mounted = true;

        if (showCamera && videoRef.current) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    if (mounted && videoRef.current) {
                        videoRef.current.srcObject = stream;
                        setIsCameraReady(true);
                    }
                })
                .catch(err => {
                    console.error("Error accessing camera:", err);
                    setShowCamera(false);
                });

            return () => {
                mounted = false;
                if (videoRef.current?.srcObject) {
                    const stream = videoRef.current.srcObject as MediaStream;
                    stream.getTracks().forEach(track => track.stop());
                }
                setIsCameraReady(false);
            };
        }
    }, [showCamera, videoRef]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setSavedImage(imageUrl);
            onFileSelect(file);
        }
    };

    const handleCaptureClick = () => {
        handleCapturePhoto();
        setShowCamera(false);
        // Stop the camera stream after capture
        const stream = videoRef.current?.srcObject as MediaStream;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleRemoveImage = () => {
        setSavedImage(null);
        onFileSelect(undefined);
    };

    const handleCameraToggle = () => {
        if (showCamera) {
            const stream = videoRef.current?.srcObject as MediaStream;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            setShowCamera(false);
        } else {
            setShowCamera(true);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        id="file-upload"
                    />
                    <Button
                        type="button"
                        variant="default"
                        className="w-full"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                    </Button>
                </div>
                <Button
                    type="button"
                    variant={showCamera ? "default" : "outline"}
                    onClick={handleCameraToggle}
                    className="flex-1"
                >
                    <Camera className="w-4 h-4 mr-2" />
                    Camera
                </Button>
            </div>

            {savedImage && (
                <div className="relative rounded-lg overflow-hidden shadow-md">
                    <img
                        src={savedImage}
                        alt="Uploaded/Captured"
                        className="w-full h-auto object-cover"
                    />
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 shadow-lg hover:shadow-xl transition-shadow"
                        onClick={handleRemoveImage}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {showCamera && !savedImage && (
                <div className="space-y-4 rounded-lg overflow-hidden shadow-md bg-black">
                    {isCameraReady ? (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-auto"
                            />
                            <div className="p-4 bg-gradient-to-t from-black/50 to-transparent">
                                <Button
                                    type="button"
                                    onClick={handleCaptureClick}
                                    className="w-full bg-white text-black hover:bg-gray-100"
                                >
                                    <Camera className="w-4 h-4 mr-2" />
                                    Capture Photo
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-48 bg-gray-100">
                            <p className="text-gray-500">Initializing camera...</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};