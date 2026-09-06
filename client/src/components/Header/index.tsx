import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { useApolloClient } from "@apollo/client/react";
import { LogOut, Menu, Pickaxe, User } from "lucide-react";

import { useAuthStore } from "../../lib/auth.ts";
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
// The 300px original is 87 KB for a 28px mark; this is the same art at 96px.
import logo from "../../assets/Soul_Campfire_96.webp";

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
        <Link to="/" className="flex items-center gap-2 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <img src={logo} alt="" className="size-7" />
          <span className="font-display text-lg tracking-wide">CHUNK&apos;D</span>
        </Link>

        {isLoggedIn && (
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
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
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link to="/editor">
                  <Pickaxe />
                  New build
                </Link>
              </Button>

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
                    {NAV_LINKS.map((link) => (
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
