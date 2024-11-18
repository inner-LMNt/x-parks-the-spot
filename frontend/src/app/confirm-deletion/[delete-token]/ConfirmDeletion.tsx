"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch } from "@/store/hooks";
import { deleteAccount } from "@/features/user/userSlice";

export default function ConfirmDeletePage() {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dispatch = useAppDispatch();

  const params = useParams();
  const token = (params?.["delete-token"] as string) ?? "invalid";

  const handleConfirmDelete = async () => {
    if (!token) {
      setError("Invalid or missing token");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const resultAction = await dispatch(deleteAccount(token)); // Ensure this is called correctly

      if (deleteAccount.fulfilled.match(resultAction)) {
        console.log("Account deleted successfully");
        setConfirmed(true); // Set confirmation state
      } else if (deleteAccount.rejected.match(resultAction)) {
        console.log("Deletion failed", resultAction.payload);
        setError(resultAction.payload || "Account deletion failed");
      }
    } catch (err) {
      console.error("Deletion failed:", err);
      setError("Something went wrong"); // Handle unexpected errors
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      >
        <Card className="w-[350px] shadow-2xl backdrop-blur-sm bg-white/90">
          <CardHeader className="space-y-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ stiffness: 100 }}
            >
              <CardTitle className="text-2xl text-center font-bold">
                Confirm Deletion
              </CardTitle>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ stiffness: 100 }}
            >
              {!confirmed && !error ? (
                <CardDescription className="text-center">
                  Are you sure you want to delete your account?
                </CardDescription>
              ) : error ? (
                <CardDescription className="text-center text-red-500">
                  {error}
                </CardDescription>
              ) : (
                <CardDescription className="text-center text-green-500">
                  Account deletion confirmed. <br />
                </CardDescription>
              )}
            </motion.div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!confirmed && !error ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ stiffness: 100 }}
              >
                <Button
                  onClick={handleConfirmDelete}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Confirm Deletion
                </Button>
              </motion.div>
            ) : null}
          </CardContent>
          <CardFooter className="flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ stiffness: 100 }}
            >
              <Link href="/login">
                <Button
                  variant="link"
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Back to Login
                </Button>
              </Link>
            </motion.div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
