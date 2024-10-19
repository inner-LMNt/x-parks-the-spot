// src/components/custom/ImageWrapper.tsx

import Image, { ImageProps } from 'next/image';
import React from 'react';

interface ImageWrapperProps extends ImageProps {}

const ImageWrapper: React.FC<ImageWrapperProps> = ({ src, alt, ...props }) => {
    const baseUrl = 'http://localhost:5000'
    const absSrc = `${baseUrl}${src}`
    return (
        <Image
            src={absSrc}
            alt={alt}
            {...props}
            unoptimized // Disable optimization
        />
    );
};

export default ImageWrapper;
