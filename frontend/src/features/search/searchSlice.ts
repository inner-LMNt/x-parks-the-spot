import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../../api/axiosInstance";
import { ParkingSpace, SearchRequest, SearchResponse } from "@/types/type";

interface SearchState {
  loading: boolean;
  error: string | null;
  spots: ParkingSpace[];
}

const initialState: SearchState = {
  loading: false,
  error: null,
  spots: [],
};

export const searchSpots = createAsyncThunk<
    SearchResponse,
    SearchRequest,
    { rejectValue: string }
>("search/spots", async (searchRequest, { rejectWithValue }) => {
  try {
    const response = await axios.post<SearchResponse>("/search", searchRequest);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || "Search failed");
  }
});

const searchSlice = createSlice({
  name: "search",
  initialState,
  reducers: {
    errorReset(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
        .addCase(searchSpots.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(searchSpots.fulfilled, (state, action) => {
          state.loading = false;
          state.spots = action.payload.spots;
        })
        .addCase(searchSpots.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload as string;
        });
  },
});

export const { errorReset } = searchSlice.actions;
export default searchSlice.reducer;