import { http, HttpResponse } from 'msw'
import { v4 as uuidv4 } from 'uuid'

let spots: string | number | boolean | any[] | Record<string, any> | null | undefined = []

export const addSpotHandler = http.post('/api/spots', async ({ request }) => {
  const spot = await request.json()
  const newSpot = {
    id: uuidv4(),
    ...spot,
  }
  spots.push(newSpot)
  return HttpResponse.json(newSpot, { status: 201 })
})

export const getMySpotsHandler = http.get('/api/myspots', () => {
  return HttpResponse.json(spots, { status: 200 })
})

export const deleteSpotHandler = http.delete('/api/spots/:id', ({ params }) => {
  const { id } = params
  spots = spots.filter(spot => spot.id !== id)
  return HttpResponse.json({ message: 'Spot deleted successfully' }, { status: 200 })
})