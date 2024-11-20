// src/components/custom/ImageWrapper.tsx

import Image, { ImageProps } from "next/image"
import React from "react"

interface ImageWrapperProps extends ImageProps {}

const ImageWrapper: React.FC<ImageWrapperProps> = ({ src, alt, ...props }) => {
  return (
    <Image
      src={src}
      alt={alt}
      {...props}
      unoptimized // Disable optimization
    />
  )
}

export default ImageWrapper
