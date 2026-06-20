import { Router, type IRouter } from "express";
import { db, usersTable, userRoleEnum } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireSession, getSession } from "../lib/session";
import { requireAdmin } from "../lib/admin";

const router: IRouter = Router();

// Every endpoint here is admin-only: it manages who can access the app and
// what role they hold. requireSession runs first (401 when no session), then
// requireAdmin (403 when the user is not an admin).
router.use(requireSession, requireAdmin);

const VALID_ROLES = userRoleEnum.enumValues;

/**
 * GET /users
 * Lists every user who has logged in (or been provisioned), with their current
 * role and last login. Ordered by most-recent login first so active members
 * surface at the top.
 */
router.get("/users", async (_req, res) => {
  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profileImageUrl: usersTable.profileImageUrl,
      role: usersTable.role,
      lastLoginAt: usersTable.lastLoginAt,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable);

  // Most-recently active first; users who have never logged in sort last.
  rows.sort((a, b) => {
    const at = a.lastLoginAt ? a.lastLoginAt.getTime() : 0;
    const bt = b.lastLoginAt ? b.lastLoginAt.getTime() : 0;
    return bt - at;
  });

  res.json({ users: rows });
});

/**
 * PATCH /users/:id/role
 * Assigns or changes a user's role. Body: { role } where role is one of the
 * app roles, or null to revoke access (the user falls back to the "no access
 * yet" state until a role is reassigned).
 */
router.patch("/users/:id/role", async (req, res) => {
  const id = req.params["id"] as string;
  const { role } = req.body as { role?: unknown };

  if (role !== null && !VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    res.status(400).json({
      error: `role must be one of: ${VALID_ROLES.join(", ")}, or null to revoke access`,
    });
    return;
  }

  const { userId } = getSession(req);
  const nextRole = role as (typeof VALID_ROLES)[number] | null;

  // Guard against an admin removing their own admin access and locking
  // everyone out of this screen.
  if (id === userId && nextRole !== "admin") {
    res.status(400).json({
      error:
        "You cannot change your own role away from admin — ask another admin to do it.",
    });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ role: nextRole })
    .where(eq(usersTable.id, id))
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profileImageUrl: usersTable.profileImageUrl,
      role: usersTable.role,
      lastLoginAt: usersTable.lastLoginAt,
      createdAt: usersTable.createdAt,
    });

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user: updated });
});

export default router;
