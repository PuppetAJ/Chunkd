import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { useApolloClient } from "@apollo/client/react";
import { LogOut, Menu, Pickaxe, Settings, User } from "lucide-react";

import { useAuthStore } from "../../lib/auth.ts";
import { useHasFinePointer } from "../../lib/useHasFinePointer.ts";
import UserAvatar from "../UserAvatar.tsx";
import { Button } from "../ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "../ui/sheet.tsx";
import CampfireLogo from "../CampfireLogo.tsx";

/**
 * The site header.
 *
 * It is rendered by SiteLayout, which the editor route deliberately sits
 * outside of, so nothing here has to know about the editor any more. The old
 * header carried a "Controls" button that appeared only on /editor; that now
 * lives in the editor's own overlay, next to the rest of its controls.
 */

const NAV_LINKS = [
  { to: "/", label: "Feed" },
  { to: "/editor", label: "Editor" },
  { to: "/profile", label: "My builds" },
];

/**
 * The editor is keyboard and mouse only, so a device without either is not
 * offered it. The route explains itself if someone arrives by a shared link,
 * but a menu item leading somewhere that cannot work is worth leaving out.
 */
function navLinksFor(hasFinePointer: boolean) {
  if (hasFinePointer) return NAV_LINKS;
  return NAV_LINKS.filter((link) => link.to !== "/editor");
}

function navLinkClasses({ isActive }: { isActive: boolean }): string {
  return [
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
  ].join(" ");
}

export default function Header() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const username = useAuthStore((state) => state.user?.username ?? "");
  const logOut = useAuthStore((state) => state.logOut);
  const navigate = useNavigate();
  const apollo = useApolloClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasFinePointer = useHasFinePointer();
  const navLinks = navLinksFor(hasFinePointer);

  const handleLogout = async () => {
    logOut();

    // The order matters and is not obvious. Signing out while a protected page
    // is on screen lets RequireAuth redirect to /login, remembering the page
    // you came from, and it does that in an effect. Awaiting here yields long
    // enough for that redirect to land, so the navigate below overrides it and
    // sends you to the feed with nothing remembered. Navigating before the
    // sign-out instead does not work: the redirect still wins, and you get
    // returned to the page you left the next time you sign in.
    //
    // resetStore rather than clearStore. Both empty the cache, so neither
    // leaves the previous user's data where the next person in this tab could
    // read it, but clearStore stops there and leaves every query that is still
    // mounted showing the result it already had. That was visible: signing out
    // rendered the landing page from a cached feed, and if the scheduled reset
    // had run since the tab was opened, the build ids in that feed no longer
    // existed, so the hero viewer reported the build as unavailable until a
    // refresh. Re-running the queries fetches current ids.
    //
    // It rejects as a matter of course, because `me` is one of the queries it
    // retries and that one is unauthenticated now. Nothing is waiting on the
    // result, and an uncaught rejection here would skip the navigate below.
    await apollo.resetStore().catch(() => {});

    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
        {/* "group" is what lets the campfire react to a hover anywhere on the
            brand, not only on the icon itself. */}
        <Link
          to="/"
          className="group flex items-center gap-2 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <CampfireLogo size="sm" className="size-7" />
          <span className="font-display text-lg tracking-wide">CHUNK&apos;D</span>
        </Link>

        {isLoggedIn && (
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === "/"} className={navLinkClasses}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isLoggedIn ? (
            <>
              {/* Outline rather than filled: the page itself usually owns the one
                  filled button on screen, and two competing primaries read as noise. */}
              {hasFinePointer && (
                <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                  <Link to="/editor">
                    <Pickaxe />
                    New build
                  </Link>
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Account menu"
                  className="rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <UserAvatar username={username} size="md" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="truncate">{username}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <User />
                      My profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">
                      <Settings />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout}>
                    <LogOut />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <SheetTitle className="font-display text-base">Menu</SheetTitle>
                  <nav className="flex flex-col gap-1 px-4">
                    {navLinks.map((link) => (
                      <SheetClose asChild key={link.to}>
                        <NavLink to={link.to} end={link.to === "/"} className={navLinkClasses}>
                          {link.label}
                        </NavLink>
                      </SheetClose>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
