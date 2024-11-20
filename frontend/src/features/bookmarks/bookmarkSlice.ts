import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "@/api/axiosInstance"
import { Bookmark } from "@/types/type"

/**
 * **Bookmarks State Interface**
 */
interface BookmarksState {
  loading: boolean
  error: string | null
  bookmarks: Bookmark[]
}

/**
 * **Initial State**
 */
const initialState: BookmarksState = {
  loading: false,
  error: null,
  bookmarks: [],
}

/**
 * **Async Thunks**
 */

/**
 * Fetch User's bookmarks
 * GET /bookmarks
 */
export const fetchUserBookmarks = createAsyncThunk<
  Bookmark[],
  void,
  { rejectValue: string }
>("bookmarks/fetchUserBookmarks", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get<Bookmark[]>("/bookmarks")
    return response.data
  } catch (error: any) {
    if (error.response?.status === 401) {
      return rejectWithValue("Unauthorized")
    }
    if (error.response?.status === 403) {
      return rejectWithValue("Forbidden")
    }
    return rejectWithValue(
      error.response?.data?.error || "Failed to fetch bookmarks",
    )
  }
})

/**
 * Add a New bookmark
 * POST /parking-spaces/id/bookmark
 */
export const addBookmark = createAsyncThunk<
  Bookmark,
  string,
  { rejectValue: string }
>("bookmarks/addBookmark", async (id, { rejectWithValue }) => {
  try {
    const response = await axios.post<Bookmark>(
      `/parking-spaces/${id}/bookmark`,
    )
    return response.data
  } catch (error: any) {
    if (error.response?.status === 400) {
      return rejectWithValue(error.response?.data?.error || "Invalid input")
    }
    if (error.response?.status === 401) {
      return rejectWithValue("Unauthorized")
    }
    if (error.response?.status === 403) {
      return rejectWithValue("Forbidden")
    }
    return rejectWithValue(
      error.response?.data?.error || "Failed to add bookmark",
    )
  }
})

/**
 * Delete a bookmark
 * DELETE /parking-spaces/id/bookmark
 */
export const deleteBookmark = createAsyncThunk<
  Bookmark,
  string,
  { rejectValue: string }
>("bookmarks/deleteBookmark", async (id, { rejectWithValue }) => {
  try {
    const response = await axios.delete(`/parking-spaces/${id}/bookmark`)
    return response.data
  } catch (error: any) {
    if (error.response?.status === 400) {
      return rejectWithValue(error.response?.data?.error || "Invalid input")
    }
    if (error.response?.status === 401) {
      return rejectWithValue("Unauthorized")
    }
    if (error.response?.status === 403) {
      return rejectWithValue("Forbidden")
    }
    return rejectWithValue(
      error.response?.data?.error || "Failed to update bookmark",
    )
  }
})

/**
 * **bookmark Slice**
 */
const bookmarkSlice = createSlice({
  name: "bookmarks",
  initialState,
  reducers: {
    /**
     * Reset error state
     */
    resetBookmarkError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    /**
     * Handle fetchUserBookmarks actions
     */
    builder
      .addCase(fetchUserBookmarks.pending, (state: BookmarksState) => {
        state.loading = true
        state.error = null
      })
      .addCase(
        fetchUserBookmarks.fulfilled,
        (state: BookmarksState, action) => {
          state.loading = false
          state.bookmarks = action.payload
        },
      )
      .addCase(fetchUserBookmarks.rejected, (state: BookmarksState, action) => {
        state.loading = false
        state.error = action.payload || "Failed to fetch bookmarks"
      })

    /**
     * Handle addBookmark actions
     */
    builder
      .addCase(addBookmark.pending, (state: BookmarksState) => {
        state.loading = true
        state.error = null
      })
      .addCase(addBookmark.fulfilled, (state: BookmarksState, action) => {
        state.loading = false
        state.bookmarks.push(action.payload)
      })
      .addCase(addBookmark.rejected, (state: BookmarksState, action) => {
        state.loading = false
        state.error = action.payload || "Failed to add bookmark"
      })

    /**
     * Handle deleteBookmark actions
     */
    builder
      .addCase(deleteBookmark.pending, (state: BookmarksState) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteBookmark.fulfilled, (state: BookmarksState, action) => {
        state.loading = false
        // Delete the updated bookmark in the list
        var i = state.bookmarks.findIndex(
          (x) => x.parking_spot_id == action.payload.parking_spot_id,
        )
        state.bookmarks.splice(i, 1)
      })
      .addCase(deleteBookmark.rejected, (state: BookmarksState, action) => {
        state.loading = false
        state.error = action.payload || "Failed to delete bookmark"
      })
  },
})

/**
 * **Export Actions and Reducer**
 */
export const { resetBookmarkError } = bookmarkSlice.actions

export default bookmarkSlice.reducer
