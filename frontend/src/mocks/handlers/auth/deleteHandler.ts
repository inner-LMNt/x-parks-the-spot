// src/mocks/handlers/auth/deleteUserHandler.ts

import { http, HttpResponse } from "msw";
import { findUserById } from "@/mocks/data/auth/authData";

/**
 * Handler for DELETE /user
 */
export const deleteHandler = http.post<
  never,
  { userId: string; password: string }
>("v1/auth/delete", async ({ request }) => {
  const data = await request.json(); // Extract request body
  const { userId, password } = data; // Extract userId and password from the body

  // Find the user by ID
  //const user = findUserById(userId);
  if (false) {
    return HttpResponse.json({ message: userId }, { status: 404 });
  }

  // Validate the password (assuming password123 is the correct password)
  if (password !== "password123") {
    return HttpResponse.json({ message: "Invalid password" }, { status: 401 });
  }

  // Update the account status to 'suspended' or 'deleted'
  //user.account_status = 'suspended';
  //user.updated_at = new Date().toISOString();

  // Respond with success message
  return HttpResponse.json(
    { message: "Account status updated to deleted" },
    { status: 200 },
  );
});
