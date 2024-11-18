// src/app/signup/DashboardPage.test.tsx

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import SignUpPage from "./page"
import { Provider } from "react-redux"
import configureStore from "redux-mock-store"

const mockStore = configureStore([])

describe("SignUpPage", () => {
  let store

  beforeEach(() => {
    store = mockStore({
      user: {
        isLoggedIn: false,
      },
    })
  })

  it("renders signup form", () => {
    render(
      <Provider store={store}>
        <SignUpPage />
      </Provider>,
    )

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.queryAllByLabelText(/password/i).length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument()
  })

  it("displays error messages for invalid inputs", async () => {
    render(
      <Provider store={store}>
        <SignUpPage />
      </Provider>,
    )

    fireEvent.click(screen.getByRole("button", { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  //todo: fix broken test
  // it('submits the form with valid data', async () => {
  //     render(
  //         <Provider store={store}>
  //             <SignUpPage />
  //             </Provider>
  //     );
  //
  //     fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John Doe' } });
  //     fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
  //     fireEvent.change(screen.queryAllByLabelText(/^password$/i)[0], { target: { value: 'password123' } });
  //     fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } });
  //
  //     await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /sign up/i })));
  //
  //     await waitFor(() => {
  //         const actions = store.getActions();
  //         expect(actions).toContainEqual(expect.objectContaining({ type: 'user/signup/pending' }));
  //     });
  // });
})
