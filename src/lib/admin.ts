import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Not authenticated.", status: 401 as const, session: null };
  }

  if ((session.user as any).role !== "admin") {
    return { error: "Admin access required.", status: 403 as const, session: null };
  }

  return { error: null, status: 200 as const, session };
}
