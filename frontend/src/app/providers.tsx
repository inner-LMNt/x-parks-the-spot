"use client";

import { Provider } from "react-redux";
import { store } from "@/store";
import { injectStore } from "@/api/axiosInstance";
import { ReactNode, useEffect } from "react";
import { setUpMocks } from "@/mocks/browser";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      setUpMocks().catch(console.error);
    }
  }, []);
  injectStore(store);
  return (
    <Provider store={store}>
      <ToastProvider>{children}</ToastProvider>
    </Provider>
  );
}
