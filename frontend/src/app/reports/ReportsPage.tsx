"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  fetchUserReports,
  resetReportsError,
} from "@/features/reports/reportSlice"
import { fetchUserReservations } from "@/features/reservations/reservationsSlice"
import { fetchOwnerReservations } from "@/features/owner-reservations/ownerReservationsSlice"
import {
  ArrowLeft,
  Layers,
  AlertCircle,
  Clock,
  ShieldX,
  Settings,
  CheckCircle2,
  Circle,
  CircleDot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { AnimatePresence } from "framer-motion"
import { ReportDialog } from "./components/ReportDialog"
import { BookingsReports } from "./components/BookingsReports"
import { Report } from "@/types/type"

// page for reports
export default function ReportsPage() {
  const dispatch = useAppDispatch()
  const router = useRouter()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>("Active")
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [selectedReportType, setSelectedReportType] = useState<string | null>(
    null,
  )

  const {
    reports,
    loading: reportsLoading,
    error: reportsError,
  } = useAppSelector((state) => state.reports)
  const { loading: reservationsLoading, error: reservationsError } =
    useAppSelector((state) => state.reservations)
  const { loading: ownerReservationsLoading, error: ownerReservationsError } =
    useAppSelector((state) => state.ownerReservations)

  const handleClearFilters = () => {
    setTypeFilter(null)
    setStatusFilter(null)
  }

  const handleCreateReport = () => {
    handleReportClick()
  }

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        dispatch(fetchUserReports()),
        dispatch(fetchUserReservations()),
        dispatch(fetchOwnerReservations()),
      ])
    }
    fetchData()

    return () => {
      dispatch(resetReportsError())
    }
  }, [dispatch])

  useEffect(() => {
    const errors = [
      reportsError,
      reservationsError,
      ownerReservationsError,
    ].filter(Boolean)
    errors.forEach((error) => {
      if (error) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        })
      }
    })
  }, [reportsError, reservationsError, ownerReservationsError])

  const handleReportClick = (reservation = null, type = null) => {
    setSelectedReservation(reservation)
    setSelectedReportType(type)
    setIsDialogOpen(true)
  }

  const filteredReports = reports.filter((report: Report) => {
    const matchesType = !typeFilter || report.type === typeFilter
    const matchesStatus =
      !statusFilter ||
      (statusFilter === "Active" &&
        ["open", "in_progress"].includes(report.status)) ||
      (statusFilter === "Resolved" && report.status === "Resolved")
    return matchesType && matchesStatus
  })

  const isLoading =
    reportsLoading || reservationsLoading || ownerReservationsLoading

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <header className="relative flex items-center justify-center mb-6">
          <Button
            variant="ghost"
            className="absolute left-0 flex items-center text-gray-800"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-slate-950">Your Reports</h1>
        </header>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Select
              onValueChange={(value) =>
                value === "all" ? setTypeFilter(null) : setTypeFilter(value)
              }
              value={typeFilter || "all"}
            >
              <SelectTrigger className="w-full sm:w-48 border border-gray-300 rounded-lg shadow-sm text-slate-950">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {typeFilter === "Reservation Issue" && (
                      <AlertCircle className="w-4 h-4 text-green-600" />
                    )}
                    {typeFilter === "Renter Overstay" && (
                      <Clock className="w-4 h-4 text-yellow-600" />
                    )}
                    {typeFilter === "Damage Report" && (
                      <ShieldX className="w-4 h-4 text-red-600" />
                    )}
                    {typeFilter === "Other Issues" && (
                      <Settings className="w-4 h-4 text-gray-600" />
                    )}
                    {(typeFilter === null || typeFilter === "all") && (
                      <Layers className="w-4 h-4 text-slate-700" />
                    )}
                    <span>{typeFilter || "All Reports"}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-slate-950">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-700" />
                    <span>All Reports</span>
                  </div>
                </SelectItem>
                <SelectItem
                  value="Reservation Issue"
                  className="text-slate-950"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-green-600" />
                    <span>Reservation Issues</span>
                  </div>
                </SelectItem>
                <SelectItem value="Renter Overstay" className="text-slate-950">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span>Renter Overstay</span>
                  </div>
                </SelectItem>
                <SelectItem value="Damage Report" className="text-slate-950">
                  <div className="flex items-center gap-2">
                    <ShieldX className="w-4 h-4 text-red-600" />
                    <span>Damage Reports</span>
                  </div>
                </SelectItem>
                <SelectItem value="Other Issues" className="text-slate-950">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-gray-600" />
                    <span>Other Issues</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              onValueChange={(value) =>
                value === "all" ? setStatusFilter(null) : setStatusFilter(value)
              }
              value={statusFilter || "all"}
            >
              <SelectTrigger className="w-full sm:w-36 border border-gray-300 rounded-lg shadow-sm text-slate-950">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {statusFilter === "Active" && (
                      <Circle className="w-4 h-4 text-blue-600" />
                    )}
                    {statusFilter === "Resolved" && (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                    {(statusFilter === null || statusFilter === "all") && (
                      <CircleDot className="w-4 h-4 text-slate-700" />
                    )}
                    <span>{statusFilter || "All Statuses"}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-slate-950">
                  <div className="flex items-center gap-2">
                    <CircleDot className="w-4 h-4 text-slate-700" />
                    <span>All Statuses</span>
                  </div>
                </SelectItem>
                <SelectItem value="Active" className="text-slate-950">
                  <div className="flex items-center gap-2">
                    <Circle className="w-4 h-4 text-blue-600" />
                    <span>Active</span>
                  </div>
                </SelectItem>
                <SelectItem value="Resolved" className="text-slate-950">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Resolved</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => handleReportClick()}
            className="flex items-center gap-2 w-full sm:w-24"
            data-testid="Report Button"
          >
            <AlertCircle className="w-4 h-4" />
            Report
          </Button>
        </div>

        <AnimatePresence mode="wait">
          <BookingsReports
            totalReportsCount={reports.length}
            reports={filteredReports}
            isLoading={isLoading}
            onClearFilters={handleClearFilters}
            onCreateReport={handleCreateReport}
          />
        </AnimatePresence>

        <ReportDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false)
            setSelectedReservation(null)
            setSelectedReportType(null)
          }}
          preselectedReservation={selectedReservation}
          preselectedType={selectedReportType}
        />
      </div>
    </div>
  )
}
