import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export type DirectoryMember = {
  _id: Id<"users">;
  name: string;
  avatar: string | null;
  role: string;
};

/**
 * Every member's name and avatar, keyed by id. Messages only store an author's
 * name, so this is how their avatar and profile link stay current.
 */
export function useMemberDirectory(): Map<string, DirectoryMember> {
  const rows = useQuery(api.profiles.directory);
  return useMemo(() => {
    const map = new Map<string, DirectoryMember>();
    for (const row of rows ?? []) map.set(row._id, row);
    return map;
  }, [rows]);
}
