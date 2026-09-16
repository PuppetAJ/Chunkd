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

const NAV_LINKS = [
  { to: "/", label: "Feed", icon: MessagesSquare },
  { to: "/editor", label: "Editor", icon: Pickaxe },
  { to: "/profile", label: "My builds", icon: Boxes },
];

/** The editor needs a mouse and keyboard, so a device without them is not offered it. */
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
    // The page lets RequireAuth tell a deliberate sign-out from an expired session.
    logOut(location.pathname);

    // resetStore rather than clearStore, which leaves mounted queries showing stale data.
    // It rejects as a matter of course, since `me` is refetched with nobody signed in.
    await apollo.resetStore().catch(() => {});

    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-sm">
      <div className="page-gutter mx-auto flex h-14 w-full max-w-6xl items-center gap-2">
        {/* "group" lets the campfire react to a hover anywhere on the brand. */}
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
              {hasFinePointer && (
                <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                  <Link to="/editor">
                    <Pickaxe />
                    New build
                  </Link>
                </Button>
              )}

              <DropdownMenu>
                {/* Below md the slide-out menu carries these items instead. */}
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

                  {/* Closed by hand rather than with SheetClose: its Radix Slot joins
                      className strings, so NavLink's className function would land
                      in the attribute as source text. */}
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
