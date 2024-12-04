"use client"

import React, { useState, useRef, useCallback } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { Fragment } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X, Camera } from "lucide-react"
import { useDispatch } from "react-redux"
import { submitVerification } from "@/features/owner/ownerSlice"
import { useToast } from "@/hooks/use-toast"
import Webcam from "react-webcam"

interface VerificationModalProps {
  isOpen: boolean
  onClose: () => void
  spotId: string
}

const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  spotId,
}) => {
  const dispatch = useDispatch()
  const { toast } = useToast()
  const [verificationFile, setVerificationFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const webcamRef = useRef<Webcam>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Handle image upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setVerificationFile(file)
    }
  }

  // Capture image from webcam
  const handleCameraCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], "camera_capture.jpg", {
            type: "image/jpeg",
          })
          setVerificationFile(file)
          setPreviewUrl(imageSrc)
          setShowCamera(false)
        })
    }
  }, [])

  // Submit verification
  const handleSubmit = async () => {
    if (verificationFile) {
      const formData = new FormData()
      formData.append("image", verificationFile)
      try {
        // @ts-ignore
        const resultAction = await dispatch(
          // @ts-ignore
          submitVerification({ spotId, formData }),
        ).unwrap()

        if (resultAction) {
          toast({
            title: "Verification Submitted",
            description: "Your verification is now pending approval.",
            variant: "success",
          })

          window.location.reload() // Reload the page
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to submit verification. Please try again later.",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Close Button */}
                <button
                  type="button"
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                  onClick={onClose}
                >
                  <X className="w-6 h-6" />
                </button>

                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  Submit Verification
                </Dialog.Title>

                <div className="mt-4">
                  {showCamera ? (
                    <div className="relative">
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        className="w-full rounded-lg"
                      />
                      <Button
                        type="button"
                        onClick={handleCameraCapture}
                        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-500 hover:text-gray-700"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Capture Photo
                      </Button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept="image/*, .heic, .HEIC"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full mt-2"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Image
                      </Button>
                    </>
                  )}

                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-auto mt-4 rounded-lg"
                    />
                  )}

                  {verificationFile && !previewUrl && (
                    <p className="mt-2 text-sm text-gray-500">
                      {verificationFile.name} selected. Ready to submit.
                    </p>
                  )}

                  <Button
                    onClick={() => setShowCamera(!showCamera)}
                    className="w-full mt-4 border-gray-500 text-gray-700 hover:bg-gray-100"
                    variant="outline"
                  >
                    {showCamera ? (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Cancel Camera
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        Use Camera
                      </>
                    )}
                  </Button>
                </div>

                <div className="mt-6">
                  <Button
                    onClick={handleSubmit}
                    className="w-full"
                    disabled={!File}
                  >
                    Submit Verification
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default VerificationModal
