// src/components/custom/ImageWrapper.tsx

import Image, { ImageProps } from 'next/image';
import React, { useState } from 'react';

interface ImageWrapperProps extends ImageProps {}

const ImageWrapper: React.FC<ImageWrapperProps> = ({ src, alt, ...props }) => {
    const [imgSrc, setImgSrc] = useState(src);

    const handleError = () => {
        setImgSrc('https://picsum.photos/200'); // Fallback image in the public directory
    };

    return (
        <Image
            src={imgSrc}
            alt={alt}
            onError={handleError}
            {...props}
        />
    );
};

export default ImageWrapper;
