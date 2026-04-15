import type { Selectable } from "@ktb/db/kysely-types";
import type { User } from "@ktb/db/types";

import {
  CaretUpDownIcon,
  GitBranchIcon,
  SignOutIcon,
  SwordIcon,
} from "@phosphor-icons/react";
import { useQuery, useZero } from "@rocicorp/zero/react";
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "#components/ui/sidebar.js";
import { getInitials } from "#lib/utils.js";
import { useRootLoaderData } from "#root.js";
import { queries } from "#zero/queries.js";

export default function Route() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="border-border flex h-12 items-center gap-2 border-b px-3">
          <SidebarTrigger />
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
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
            <SidebarMenuButton asChild size="lg">
              <Link draggable={false} to="/">
                <SwordIcon className="text-primary" weight="fill" />
                <span className="font-heading text-xs font-semibold tracking-tight">
                  Kill The Backlog
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
      <SidebarGroupLabel>Recent</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {sessions.map((session) => (
            <SidebarMenuItem key={session.id}>
              <NavLink draggable={false} to={`/sessions/${session.id}`}>
                {({ isActive }) => (
                  <SidebarMenuButton isActive={isActive}>
                    <span className="truncate">{session.prompt}</span>
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
  user,
}: {
  user: Pick<Selectable<User>, "avatarUrl" | "displayName" | "email">;
}) {
  return (
    <>
      <Avatar size="sm">
        <AvatarImage alt={user.displayName} src={user.avatarUrl ?? undefined} />
        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-xs leading-tight">
        <span className="truncate font-medium">{user.displayName}</span>
        <span className="text-muted-foreground text-2xs truncate">
          {user.email}
        </span>
      </div>
    </>
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
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              size="lg"
            >
              <UserInfo user={user} />
              <CaretUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            side="top"
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-xs">
                <UserInfo user={user} />
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link draggable={false} to="/repos">
                <GitBranchIcon />
                Repos
              </Link>
            </DropdownMenuItem>
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
