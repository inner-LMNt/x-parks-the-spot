// src/components/custom/ImageWrapper.tsx

import Image, { ImageProps } from "next/image"
import React from "react"

interface ImageWrapperProps extends ImageProps {}

const ImageWrapper: React.FC<ImageWrapperProps> = ({ src, alt, ...props }) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const absSrc = `${baseUrl}${src}`
  return (
    <Image
      src={absSrc}
      alt={alt}
      {...props}
      unoptimized // Disable optimization
    />
  )
}

export default ImageWrapper
