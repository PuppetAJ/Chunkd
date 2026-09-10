import { Suspense } from "react";
import { Outlet } from "react-router";
import Header from "./Header/index.tsx";
import Footer from "./Footer/index.tsx";
import ErrorBoundary from "./ErrorBoundary.tsx";
import { Skeleton } from "./ui/skeleton.tsx";
import { Toaster } from "./ui/sonner.tsx";

/**
 * The page shell: header, content, footer.
 *
 * This is a layout route, so it renders once and the matched page appears in
 * the Outlet. The editor is routed outside it on purpose. It is a full-screen
 * pointer-locked view, and while it shared this shell the hotbar was drawn on
 * top of the footer and the sticky header ate the top of the canvas.
 */
export default function SiteLayout() {
  // #root is height: 100% so the editor can fill the window. A fragment would
  // make that viewport-tall box the header's sticky containing block, and the
  // bar would unstick after one screen. This column is at least the viewport
  // (footer sits at the bottom of short pages) and cannot shrink, so sticky
  // lasts for the whole page.
  return (
    <div className="flex min-h-full w-full shrink-0 flex-col">
      <Header />
      <main className="page-gutter mx-auto w-full max-w-6xl grow py-8">
        {/* Both boundaries sit inside the shell rather than around it, so a
            page that fails or is still downloading leaves the header and footer
            in place instead of blanking the window. */}
        <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      {/* One toaster for the whole site; anything can call toast() and it lands
          here. */}
      <Toaster />
    </div>
  );
}

/** Stands in for a page while its code downloads. */
function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
