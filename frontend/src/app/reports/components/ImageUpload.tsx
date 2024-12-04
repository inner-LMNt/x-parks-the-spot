"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X } from "lucide-react"

interface ImageUploadProps {
  onFileSelect: (file: File | undefined) => void
}

export const ImageUpload = ({ onFileSelect }: ImageUploadProps) => {
  const [savedImage, setSavedImage] = useState<string | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const imageUrl = URL.createObjectURL(file)
      setSavedImage(imageUrl)
      onFileSelect(file)
    }
  }

  const handleRemoveImage = () => {
    setSavedImage(null)
    onFileSelect(undefined)
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="file"
          accept="image/*, .heic, .HEIC"
          onChange={handleFileUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          id="file-upload"
        />
        <Button type="button" variant="default" className="w-full">
          <Upload className="w-4 h-4 mr-2" />
          Upload Image
        </Button>
      </div>

      {savedImage && (
        <div className="relative rounded-lg overflow-hidden shadow-md">
          <img
            src={savedImage}
            alt="Uploaded"
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
    </div>
  )
}
