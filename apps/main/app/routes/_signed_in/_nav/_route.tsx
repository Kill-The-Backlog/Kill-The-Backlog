import { SignOutIcon, SwordIcon } from "@phosphor-icons/react";
import { useZero } from "@rocicorp/zero/react";
import { Fragment } from "react";
import { Link, Outlet, useMatches, useNavigate } from "react-router";
import invariant from "tiny-invariant";

import { Avatar, AvatarFallback, AvatarImage } from "#components/ui/avatar.js";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "#components/ui/breadcrumb.js";
import { Button } from "#components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu.js";
import { hasBreadcrumbHandle } from "#lib/route-handle.js";
import { getInitials } from "#lib/utils.js";
import { useRootLoaderData } from "#root.js";
import { ZeroProvider } from "#zero/zero-provider.js";

export default function Route() {
  const { env, user } = useRootLoaderData();
  invariant(user, "User is required");

  return (
    <ZeroProvider cacheURL={env.ZERO_CACHE_URL} userId={user.id}>
      <div className="flex h-full flex-col">
        <Nav />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </ZeroProvider>
  );
}

function Nav() {
  return (
    <header className="border-border z-50 flex h-12 items-center border-b px-3">
      <NavBreadcrumbs />
      <UserMenu />
    </header>
  );
}

function NavBreadcrumbs() {
  const matches = useMatches();
  const breadcrumbs = matches.flatMap((m) =>
    hasBreadcrumbHandle(m.handle) ? [m.handle.breadcrumb(m.loaderData)] : [],
  );

  return (
    <div className="flex items-center gap-2">
      <Button
        asChild
        className="rounded-md max-sm:size-8 max-sm:p-0"
        draggable={false}
        variant="ghost"
      >
        <Link to="/">
          <SwordIcon className="text-primary size-5" weight="fill" />
          <span className="hidden text-xs font-semibold tracking-tight sm:inline">
            Kill The Backlog
          </span>
        </Link>
      </Button>

      {breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <Fragment key={i}>
                  {i > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={crumb.to}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}
    </div>
  );
}

function UserMenu() {
  const { user } = useRootLoaderData();
  invariant(user, "User is required");
  const zero = useZero();
  const navigate = useNavigate();

  function handleSignOut(e: React.MouseEvent) {
    e.preventDefault();
    // @todo: Find a way to delete the zero cache on the actual sign-out route.
    void zero.delete().then(() => navigate("/sign-out"));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="ml-auto rounded-full" size="icon-sm" variant="ghost">
          <Avatar size="sm">
            <AvatarImage
              alt={user.displayName}
              src={user.avatarUrl ?? undefined}
            />
            <AvatarFallback>
              {getInitials(user.displayName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium">{user.displayName}</span>
            <span className="text-muted-foreground font-normal">
              {user.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link onClick={handleSignOut} to="/sign-out">
            <SignOutIcon />
            Sign out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
