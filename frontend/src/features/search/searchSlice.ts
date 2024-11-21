import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "../../api/axiosInstance"
import {
  ParkingSpace,
  SearchRequest,
  SearchResponse,
  LeaderboardUser,
} from "@/types/type"

interface SearchState {
  loading: boolean
  error: string | null
  spots: ParkingSpace[]
  rerouteSpots: ParkingSpace[]
  leaderboard: LeaderboardUser[]
}

const initialState: SearchState = {
  loading: false,
  error: null,
  spots: [],
  rerouteSpots: [],
  leaderboard: [],
}

export const searchSpots = createAsyncThunk<
  SearchResponse,
  SearchRequest,
  { rejectValue: string }
>("search/spots", async (searchRequest, { rejectWithValue }) => {
  try {
    const response = await axios.post<SearchResponse>("/search", searchRequest)
    return response.data
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || "Search failed")
  }
})

export const searchLeaderboard = createAsyncThunk<
  LeaderboardUser[],
  void,
  { rejectValue: string }
>("search/leaderboard", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get<LeaderboardUser[]>("/search/leaderboard")
    return response.data
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Leaderboard fetch failed",
    )
  }
})

export const searchRerouteSpots = createAsyncThunk<
  SearchResponse,
  SearchRequest,
  { rejectValue: string }
>("search/rerouteSpots", async (searchRequest, { rejectWithValue }) => {
  try {
    const response = await axios.post<SearchResponse>("/search", searchRequest)
    console.log("reroute spots", response.data)
    return response.data
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || "Search failed")
  }
})

const searchSlice = createSlice({
  name: "search",
  initialState,
  reducers: {
    errorReset(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchSpots.pending, (state: SearchState) => {
        state.loading = true
        state.error = null
      })
      .addCase(searchSpots.fulfilled, (state: SearchState, action: any) => {
        state.loading = false
        state.spots = action.payload
      })
      .addCase(searchSpots.rejected, (state: SearchState, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(searchLeaderboard.pending, (state: SearchState) => {
        state.loading = true
        state.error = null
      })
      .addCase(
        searchLeaderboard.fulfilled,
        (state: SearchState, action: any) => {
          state.loading = false
          state.leaderboard = action.payload.leaderboard
        },
      )
      .addCase(
        searchLeaderboard.rejected,
        (state: SearchState, action: any) => {
          state.loading = false
          state.error = action.payload as string
        },
      )
      .addCase(searchRerouteSpots.pending, (state: SearchState) => {
        state.loading = true
        state.error = null
      })
      .addCase(
        searchRerouteSpots.fulfilled,
        (state: SearchState, action: any) => {
          state.loading = false
          state.rerouteSpots = action.payload
        },
      )
      .addCase(searchRerouteSpots.rejected, (state: SearchState, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addMatcher(
        (action: { type: string }): action is { type: "search/resetSpots" } =>
          action.type === "search/resetSpots",
        (state: SearchState) => {
          console.log("Resetting spots")
        },
      )
  },
})

export const { errorReset } = searchSlice.actions
export default searchSlice.reducer
