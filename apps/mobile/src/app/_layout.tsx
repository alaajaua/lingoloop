import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { analytics } from "../../services/analytics";
import { AuthProvider } from "../services/auth-context";
export default function RootLayout() {
  const [client] = useState(() => new QueryClient());
  useEffect(() => {
    void analytics.track("app_opened");
  }, []);
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
