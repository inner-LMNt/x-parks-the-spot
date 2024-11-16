import { useEffect, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';

export const useReportForm = () => {
    const [imageSource, setImageSource] = useState<'upload' | 'camera'>('upload');
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        if (imageSource === 'camera' && !stream) {
            navigator.mediaDevices
                .getUserMedia({ video: true })
                .then(stream => {
                    setStream(stream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => {
                    console.error('Error accessing camera:', err);
                    toast({
                        title: 'Camera Error',
                        description: 'Unable to access camera. Please try uploading instead.',
                        variant: 'destructive',
                    });
                    setImageSource('upload');
                });
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [imageSource]);

    const handleCapturePhoto = async (): Promise<File | null> => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                return new Promise<File | null>((resolve) => {
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
                            resolve(file);
                        } else {
                            resolve(null);
                        }
                    }, 'image/jpeg');
                });
            }
        }
        return null;
    };

    return {
        imageSource,
        setImageSource,
        videoRef,
        handleCapturePhoto,
    };
};