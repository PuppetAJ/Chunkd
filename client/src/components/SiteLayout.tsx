import { Suspense } from "react";
import { Outlet } from "react-router";
import Header from "./Header/index.tsx";
import Footer from "./Footer/index.tsx";
import ErrorBoundary from "./ErrorBoundary.tsx";
import { Skeleton } from "./ui/skeleton.tsx";
import { Toaster } from "./ui/sonner.tsx";

export default function SiteLayout() {
  // #root is viewport-tall for the editor, and a fragment would make it the
  // header's sticky containing block. This column grows with the page instead.
  return (
    <div className="flex min-h-full w-full shrink-0 flex-col">
      <Header />
      <main className="page-gutter mx-auto w-full max-w-6xl grow py-8">
        <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
