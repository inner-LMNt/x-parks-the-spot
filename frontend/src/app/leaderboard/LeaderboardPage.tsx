"use client"

import { useState } from "react"
import { CarIcon, MapPinIcon } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

// Mock data
const users = [
    { id: 1, name: "Alice Johnson", points: 1250, state: "California", city: "Los Angeles" },
    { id: 2, name: "Bob Smith", points: 980, state: "New York", city: "New York City" },
    { id: 3, name: "Charlie Brown", points: 1100, state: "California", city: "San Francisco" },
    { id: 4, name: "David Lee", points: 850, state: "Texas", city: "Houston" },
    { id: 5, name: "Eva Martinez", points: 1300, state: "Florida", city: "Miami" },
    { id: 6, name: "Frank Wilson", points: 920, state: "Illinois", city: "Chicago" },
    { id: 7, name: "Grace Taylor", points: 1050, state: "New York", city: "Buffalo" },
    { id: 8, name: "Henry Davis", points: 1150, state: "Texas", city: "Austin" },
    { id: 9, name: "Ivy Chen", points: 890, state: "California", city: "San Diego" },
    { id: 10, name: "Jack Anderson", points: 1200, state: "Florida", city: "Orlando" },
]

const states = ["All States", "California", "New York", "Texas", "Florida", "Illinois"]
const cities = {
    "All States": ["All Cities"],
    "California": ["All Cities", "Los Angeles", "San Francisco", "San Diego"],
    "New York": ["All Cities", "New York City", "Buffalo"],
    "Texas": ["All Cities", "Houston", "Austin"],
    "Florida": ["All Cities", "Miami", "Orlando"],
    "Illinois": ["All Cities", "Chicago"],
}

export default function LeaderboardComponent() {
    const [selectedState, setSelectedState] = useState("All States")
    const [selectedCity, setSelectedCity] = useState("All Cities")

    const filteredUsers = users.filter(user =>
        (selectedState === "All States" || user.state === selectedState) &&
        (selectedCity === "All Cities" || user.city === selectedCity)
    ).sort((a, b) => b.points - a.points)

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 p-4">
            <Card className="w-full max-w-4xl mx-auto px-2 sm:px-4 overflow-y-auto max-h-[80vh]">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Parking Spot Leaderboard</CardTitle>
                    <CardDescription className="text-center">Top contributors in finding free parking spots</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
                        <Select value={selectedState} onValueChange={(value) => {
                            setSelectedState(value);
                            setSelectedCity("All Cities");
                        }}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Select State" />
                            </SelectTrigger>
                            <SelectContent>
                                {states.map(state => (
                                    <SelectItem key={state} value={state}>{state}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={selectedCity}
                            onValueChange={setSelectedCity}
                            disabled={selectedState === "All States"}
                        >
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Select City" />
                            </SelectTrigger>
                            <SelectContent>
                                {cities[selectedState as keyof typeof cities].map(city => (
                                    <SelectItem key={city} value={city}>{city}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Rank</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-right">Points</TableHead>
                                    <TableHead className="hidden sm:table-cell">Location</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user, index) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{index + 1}</TableCell>
                                        <TableCell className="font-medium sm:font-normal">{user.name}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end">
                                                <CarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                                {user.points}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                            <div className="flex items-center">
                                                <MapPinIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                                {user.city}, {user.state}
                                            </div>
                                        </TableCell>
                                        <TableCell className="sm:hidden text-xs text-muted-foreground">
                                            {user.city}, {user.state}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}