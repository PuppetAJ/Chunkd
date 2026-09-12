import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { useApolloClient } from "@apollo/client/react";
import {
  Boxes,
  LogOut,
  Menu,
  MessagesSquare,
  Pickaxe,
  Settings,
  User,
} from "lucide-react";

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
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "../ui/sheet.tsx";
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
  { to: "/", label: "Feed", icon: MessagesSquare },
  { to: "/editor", label: "Editor", icon: Pickaxe },
  { to: "/profile", label: "My builds", icon: Boxes },
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

/** The same links in the slide-out menu, where they are touch targets. */
function sheetLinkClasses({ isActive }: { isActive: boolean }): string {
  return [
    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
    isActive
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
  ].join(" ");
}

export default function Header() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const username = useAuthStore((state) => state.user?.username ?? "");
  const logOut = useAuthStore((state) => state.logOut);
  const navigate = useNavigate();
  const location = useLocation();
  const apollo = useApolloClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasFinePointer = useHasFinePointer();
  const navLinks = navLinksFor(hasFinePointer);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    closeMenu();
    // Passing the page this was done from is what lets RequireAuth tell a
    // deliberate sign-out from an expired session. Both end up at the landing
    // page, so it no longer matters which of the two gets there first. It used
    // to: when the redirect won, it recorded the page you left and sent you
    // back to it at your next sign-in.
    logOut(location.pathname);

    // resetStore rather than clearStore: both empty the cache, but clearStore
    // leaves every mounted query showing what it already had, which rendered
    // the landing page from a stale feed.
    //
    // It rejects as a matter of course, since `me` is one of the queries it
    // retries and nobody is signed in now. Uncaught, that would skip the
    // navigate below.
    await apollo.resetStore().catch(() => {});

    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-sm">
      <div className="page-gutter mx-auto flex h-14 w-full max-w-6xl items-center gap-2">
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
                {/* Below md the slide-out menu carries these items instead, so
                    that a small screen has one menu rather than two. */}
                <DropdownMenuTrigger
                  aria-label="Account menu"
                  className="hidden rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:block"
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
                <SheetContent side="right" className="gap-0 p-0">
                  {/* pr-12 keeps the name clear of the close button. */}
                  <div className="flex items-center gap-3 border-b border-border p-4 pr-12">
                    <UserAvatar username={username} size="md" />
                    <SheetTitle className="min-w-0 truncate text-base">{username}</SheetTitle>
                  </div>

                  {hasFinePointer && (
                    <div className="border-b border-border p-3">
                      <Button asChild className="w-full justify-start">
                        <Link to="/editor" onClick={closeMenu}>
                          <Pickaxe />
                          New build
                        </Link>
                      </Button>
                    </div>
                  )}

                  {/* Closed by hand rather than with SheetClose, which wraps its
                      child in a Radix Slot. The Slot merges className by joining
                      strings, so NavLink's className function lands in the class
                      attribute as its own source text and nothing is styled. */}
                  <nav className="flex flex-col gap-1 p-3">
                    {navLinks.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.to === "/"}
                        className={sheetLinkClasses}
                        onClick={closeMenu}
                      >
                        <link.icon />
                        {link.label}
                      </NavLink>
                    ))}
                  </nav>

                  <div className="mt-auto flex flex-col gap-1 border-t border-border p-3">
                    <NavLink to="/settings" className={sheetLinkClasses} onClick={closeMenu}>
                      <Settings />
                      Settings
                    </NavLink>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={sheetLinkClasses({ isActive: false })}
                    >
                      <LogOut />
                      Log out
                    </button>
                  </div>
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
