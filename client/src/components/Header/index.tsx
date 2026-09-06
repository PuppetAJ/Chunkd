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
    // Clear every cached query so the next visitor to this tab cannot read the
    // previous user's data out of the Apollo cache.
    await apollo.clearStore();
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
