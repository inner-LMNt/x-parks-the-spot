// src/mocks/handlers/index.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('/api/login', () => {
    return HttpResponse.json(
        { message: 'Logged in successfully' },
        { status: 200 }
    )
  }),
  http.get('/api/user', () => {
    return HttpResponse.json({
      name: 'John Doe',
      email: 'john@example.com',
      permissions: {
        canRent: true,
        canList: true,
        canSpot: true
      }
    })
  }),
  http.get('/api/dashboard/overview', () => {
    return HttpResponse.json({
      totalBookings: 254,
      totalEarnings: 1234,
      activeListings: 12,
      averageRating: 4.8,
      spotsReported: 57
    })
  }),
  http.get('/api/dashboard/bookings', () => {
    return HttpResponse.json([
      { date: '2023-01', bookings: 12 },
      { date: '2023-02', bookings: 19 },
      { date: '2023-03', bookings: 3 },
      { date: '2023-04', bookings: 5 },
      { date: '2023-05', bookings: 2 },
      { date: '2023-06', bookings: 3 },
    ])
  }),
  http.get('/api/dashboard/earnings', () => {
    return HttpResponse.json([
      { date: '2023-01', earnings: 120 },
      { date: '2023-02', earnings: 190 },
      { date: '2023-03', earnings: 30 },
      { date: '2023-04', earnings: 50 },
      { date: '2023-05', earnings: 20 },
      { date: '2023-06', earnings: 30 },
    ])
  }),
  http.get('/api/bookings', () => {
    return HttpResponse.json([
      { id: 1, date: '2023-09-15', location: 'Downtown Parking', duration: '2 hours', cost: 15 },
      { id: 2, date: '2023-09-18', location: 'Airport Long-Term', duration: '3 days', cost: 60 },
      { id: 3, date: '2023-09-20', location: 'Shopping Center', duration: '4 hours', cost: 8 },
    ])
  }),

  http.get('/api/listings', () => {
    return HttpResponse.json([
      { id: 1, location: 'Home Driveway', availability: 'Weekends', rate: '5/hour' },
      { id: 2, location: 'Office Parking Lot', availability: 'Weeknights', rate: '3/hour' },
      { id: 3, location: 'Beach Parking Spot', availability: 'Anytime', rate: '10/hour' },
    ])
  }),

  http.get('/api/spotted-spots', () => {
    return HttpResponse.json([
      { id: 1, location: 'Main St & 5th Ave', reportedAt: '2023-09-10 14:30', status: 'Verified' },
      { id: 2, location: 'Central Park West', reportedAt: '2023-09-12 09:15', status: 'Pending' },
      { id: 3, location: 'Broadway & 42nd St', reportedAt: '2023-09-14 18:45', status: 'Verified' },
    ])
  }),
]