import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import Layout from "@/components/Layout";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PBS Dashboard | Lombok Barat" },
      { name: "description", content: "Dashboard Data Peserta Berkebutuhan Siswa Kabupaten Lombok Barat" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

import { useEffect } from "react";
import { initDb } from "@/lib/db";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    // Inisialisasi tabel di Turso jika belum ada
    initDb().then(() => {
      console.log("Database initialized");
      queryClient.invalidateQueries();
    }).catch(err => {
      console.error("Failed to initialize database:", err);
    });
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Layout />
    </QueryClientProvider>
  );
}
