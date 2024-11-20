"use client"

import React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { ShieldCheck, Clock, Star } from "lucide-react"

const SummaryMetric = ({ label, value, subtext, Icon, iconColor }) => (
  <div className="flex items-center space-x-4">
    <div className={`${iconColor} p-2 rounded-full bg-background`}>
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
    </div>
  </div>
)

const SpotsSummaryCard = ({
  verifiedSpots,
  totalSpots,
  pendingSpots,
  avgRating,
  numReviews,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg font-semibold">Spots Overview</CardTitle>
      <CardDescription>Summary of spot metrics and performance</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryMetric
          label="Verified Spots"
          value={verifiedSpots}
          subtext={`${totalSpots > 0 ? ((verifiedSpots / totalSpots) * 100).toFixed(0) : 0}% of total spots`}
          Icon={ShieldCheck}
          iconColor="text-green-500"
        />
        <SummaryMetric
          label="Pending Verification"
          value={pendingSpots}
          subtext="Awaiting approval"
          Icon={Clock}
          iconColor="text-yellow-500"
        />
        <SummaryMetric
          label="Average Rating"
          value={avgRating.toFixed(1)}
          subtext={`${numReviews} review${numReviews !== 1 ? "s" : ""}`}
          Icon={Star}
          iconColor="text-yellow-400"
        />
      </div>
    </CardContent>
  </Card>
)

export default SpotsSummaryCard
