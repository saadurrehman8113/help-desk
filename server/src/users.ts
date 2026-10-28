import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";
import { getDatabase } from "./database.js";

export const usersRouter = Router();
const pageSize = 20;

usersRouter.get("/", async (request, response) => {
  response.set("Cache-Control", "no-store");

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  if (!session) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }

  if (session.user.role !== "admin") {
    response.status(403).json({ error: "Admin access required" });
    return;
  }

  const rawPage = request.query.page ?? "1";

  const page =
    typeof rawPage === "string" && /^[1-9]\d*$/.test(rawPage)
      ? Number(rawPage)
      : NaN;

  // Prisma offsets must fit a signed 32-bit integer.
  if (!Number.isSafeInteger(page) || (page - 1) * pageSize > 2_147_483_647) {
    response.status(400).json({
      error: "Page must be a positive integer within the supported range",
    });
    return;
  }

  const database = getDatabase();
  const [users, total] = await database.$transaction(
    [
      database.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      database.user.count(),
    ],
    { isolationLevel: "RepeatableRead" },
  );

  response.json({ users, page, pageSize, total });
});
