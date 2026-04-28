import type { Selectable } from "@ktb/db/kysely-types";
import type { User } from "@ktb/db/types";

import { CaretUpDownIcon, SignOutIcon, SwordIcon } from "@phosphor-icons/react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import invariant from "tiny-invariant";

import { Avatar, AvatarFallback, AvatarImage } from "#components/ui/avatar.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu.js";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "#components/ui/sidebar.js";
import { getInitials } from "#lib/utils/get-initials.js";
import { useRootLoaderData } from "#root.js";
import { queries } from "#zero/queries.js";

import { HeaderSlotContext } from "./header-slot.js";

export default function Route() {
  const [headerEl, setHeaderEl] = useState<HTMLElement | null>(null);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh">
        <header className="border-border flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <SidebarTrigger />
          {/* Portal target for child routes' `HeaderSlot` items. `display:
              contents` lets the portaled children participate directly in the
              header's flex layout, inheriting its gap and alignment. */}
          <div className="contents" ref={setHeaderEl} />
        </header>
        <main className="flex-1 overflow-auto">
          <HeaderSlotContext.Provider value={headerEl}>
            <Outlet />
          </HeaderSlotContext.Provider>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="gap-1">
              <Link draggable={false} to="/">
                <SwordIcon weight="fill" />
                <span className="text-sm font-semibold tracking-tight">
                  KTB
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SessionList />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}

function SessionList() {
  const [sessions] = useQuery(queries.sessions.mine());

  if (sessions.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {sessions.map((session) => (
            <SidebarMenuItem key={session.id}>
              <NavLink draggable={false} to={`/sessions/${session.id}`}>
                {({ isActive }) => (
                  <SidebarMenuButton isActive={isActive}>
                    <span className="truncate">
                      {session.title ?? session.initialPrompt}
                    </span>
                  </SidebarMenuButton>
                )}
              </NavLink>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function UserInfo({
  showEmail,
  user,
}: {
  showEmail: boolean;
  user: Pick<Selectable<User>, "avatarUrl" | "displayName" | "email">;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar size="sm">
        <AvatarImage alt={user.displayName} src={user.avatarUrl ?? undefined} />
        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-xs font-medium">{user.displayName}</span>
        {showEmail && (
          <span className="text-muted-foreground truncate text-xs">
            {user.email}
          </span>
        )}
      </div>
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
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <UserInfo showEmail={false} user={user} />
              <CaretUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            side="top"
          >
            <div className="px-1 py-1.5">
              <UserInfo showEmail={true} user={user} />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link draggable={false} onClick={handleSignOut} to="/sign-out">
                <SignOutIcon />
                Sign out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
