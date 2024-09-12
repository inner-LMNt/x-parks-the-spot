import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('/api/login', () => {
    return HttpResponse.json(
        { message: 'Logged in successfully' },
        { status: 200 }
    )
  }),
  // Add other handlers here
]