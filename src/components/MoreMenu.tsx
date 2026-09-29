import { Link } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SECONDARY_LINKS } from "@/lib/site";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MoreHorizontal } from "lucide-react";

/**
 * Everything that does not earn a permanent place in the header bar. The four
 * primary links stay visible; this keeps the rest one click away so the header
 * never has to wrap on a narrow screen.
 */
export function MoreMenu() {
  const { isAuthenticated } = useAuth();
  const status = useQuery(api.users.adminStatus);

  const staffLinks = [
    ...(status?.isModerator ? [{ label: "Staff", to: "/staff" }] : []),
    ...(status?.isAdmin ? [{ label: "Admin", to: "/admin" }] : []),
  ];
  const items = [
    ...SECONDARY_LINKS,
    ...(isAuthenticated ? [{ label: "Messages", to: "/messages" }] : []),
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
        >
          More
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {items.map((item) => (
          <DropdownMenuItem key={item.to} asChild>
            <Link to={item.to}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
        {staffLinks.length > 0 && <DropdownMenuSeparator />}
        {staffLinks.map((item) => (
          <DropdownMenuItem key={`staff-${item.to}`} asChild>
            <Link to={item.to}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
