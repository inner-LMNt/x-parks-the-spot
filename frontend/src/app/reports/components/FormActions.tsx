"use client"

import { Button } from "@/components/ui/button"

interface FormActionsProps {
  onClose: () => void
  isSubmitting: boolean
}

export const FormActions = ({ onClose, isSubmitting }: FormActionsProps) => (
  <div className="flex justify-end space-x-2 mt-6">
    <Button type="button" variant="secondary" onClick={onClose}>
      Cancel
    </Button>
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting ? "Submitting..." : "Submit"}
    </Button>
  </div>
)
