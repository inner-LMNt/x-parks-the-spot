"use client"

import { useEffect, useState } from "react"
import { MapPinIcon, RefreshCwIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { LeaderboardUser } from "@/types/type"
import { searchLeaderboard } from "@/features/search/searchSlice"
import { get_user_name, get_points } from "@/features/user/userSlice"

const stateDictionary: { [key: string]: string } = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  None: "None",
}

const reversedStateDictionary: { [key: string]: string } = Object.fromEntries(
  Object.entries(stateDictionary).map(([abbr, name]) => [name, abbr]),
)

export default function LeaderboardComponent() {
  const dispatch = useAppDispatch()
  const [selectedState, setSelectedState] = useState("All States")
  const [currentPage, setCurrentPage] = useState(1)
  const [usersPerPage, setUsersPerPage] = useState(5)
  const users = useAppSelector((state) => state.search.leaderboard)
  const userName = useAppSelector((state) => state.user.name)
  const userPoints = useAppSelector((state) => state.user.total_points)
  const userState = useAppSelector((state) => state.user.userState)
  const userCity = useAppSelector((state) => state.user.userCity)

  const filteredUsers = Array.isArray(users)
    ? users
      .filter(
        (user: LeaderboardUser) =>
          user.state !== "None" &&
          (selectedState === "All States" ||
            stateDictionary[user.state] === selectedState),
      )
      .sort((a: LeaderboardUser, b: LeaderboardUser) => b.points - a.points)
    : []

  useEffect(() => {
    dispatch(searchLeaderboard())
    dispatch(get_user_name())
    dispatch(get_points())
  }, [dispatch])

  const handleRefresh = () => {
    dispatch(searchLeaderboard())
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handleUsersPerPageChange = (value: string) => {
    setUsersPerPage(Number(value))
    setCurrentPage(1) // Reset to first page when users per page changes
  }

  const indexOfLastUser = currentPage * usersPerPage
  const indexOfFirstUser = indexOfLastUser - usersPerPage
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser)

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage)

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 p-4">
      <Card className="w-full max-w-4xl mx-auto px-2 sm:px-4 overflow-y-auto max-h-[80vh]">
        <CardHeader className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold text-center">
              Parking Spot Leaderboard
            </CardTitle>
            <CardDescription className="text-center">
              Top contributors in finding free parking spots
            </CardDescription>
          </div>
          <button
            onClick={handleRefresh}
            className="text-blue-500 hover:text-blue-700"
          >
            <RefreshCwIcon className="h-6 w-6" />
          </button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent>
                {["All States", ...Object.keys(reversedStateDictionary)].map(
                  (state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            {currentUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Location
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentUsers.map((user: LeaderboardUser, index: number) => {
                    // Comparison by name, points, state, and city, but possibly we can do by ID in the future
                    const isCurrentUser =
                      user.name === userName &&
                      Number(user.points) === userPoints &&
                      user.state === userState &&
                      user.city === userCity
                    const userKey = `${user.name}-${user.points}-${user.state}-${user.city}`

                    return (
                      <TableRow
                        key={userKey}
                        className={isCurrentUser ? "bg-cyan-100" : ""}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center justify-center">
                            {indexOfFirstUser + index + 1}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium sm:font-normal">
                          {user.name}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            {user.points}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center">
                            <MapPinIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                            {user.city !== "None" ? `${user.city}, ` : ""}
                            {stateDictionary[user.state]}
                          </div>
                        </TableCell>
                        <TableCell className="sm:hidden text-xs text-muted-foreground">
                          {user.city !== "None" ? `${user.city}, ` : ""}
                          {stateDictionary[user.state]}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center text-black">
                No users found for this state.
              </div>
            )}
          </div>
          <div className="flex justify-center items-center mt-4 space-x-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || totalPages === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              Previous
            </button>
            <div className="flex items-center space-x-2">
              <div className="text-black">
                {totalPages === 0 ? 0 : currentPage}/{totalPages}
              </div>
              <Select
                value={String(usersPerPage)}
                onValueChange={handleUsersPerPageChange}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 25, 50].map((number) => (
                    <SelectItem key={number} value={String(number)}>
                      {number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
