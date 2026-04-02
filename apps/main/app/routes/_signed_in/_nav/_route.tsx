import { GithubLogoIcon, SwordIcon } from "@phosphor-icons/react";
import { Link, Outlet } from "react-router";

import { Button } from "#components/ui/button.js";

export default function Route() {
  return (
    <div className="flex h-full flex-col">
      <Nav />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function Nav() {
  return (
    <header className="border-border z-50 flex h-14 items-center gap-1 border-b px-2">
      <NavLogo />
      <Button
        asChild
        className="rounded-md"
        variant="ghost"
      >
        <Link to="/repos">
          <GithubLogoIcon className="size-4" />
          <span className="hidden sm:inline">Repos</span>
        </Link>
      </Button>
    </header>
  );
}

function NavLogo() {
  return (
    <Button
      asChild
      className="rounded-md max-sm:size-8 max-sm:p-0"
      draggable={false}
      variant="ghost"
    >
      <Link to="/">
        <SwordIcon className="text-primary size-5" weight="fill" />
        <span className="hidden font-semibold tracking-tight sm:inline">
          Kill The Backlog
        </span>
      </Link>
    </Button>
  );
}
