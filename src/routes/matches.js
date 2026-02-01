import { Router } from "express";
import { createMatchSchema } from "../validation/matches.js";
import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc } from "drizzle-orm";
import { listMatchesQuerySchema } from "../validation/matches.js";

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get('/', async (req, res) => {

    const parsedQuery = listMatchesQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
        return res.status(400).json({ error: "Invalid query parameters", details: parsedQuery.error.errors });
    }

    const limit = Math.min(parsedQuery.data.limit ?? 50, MAX_LIMIT);

    try {
        const events = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);
        return res.status(200).json({ events });
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch matches", details: error });
    }
});

matchRouter.post('/', async (req, res) => {
    const parsedData = createMatchSchema.safeParse(req.body);
    if (!parsedData.success) {
        return res.status(400).json({ error: parsedData.error.errors });
    }
    const { data: { startTime, endTime, homeScore, awayScore, ...rest } } = parsedData;
    try {
        const [event] = await db.insert(matches).values({
            ...rest,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status: getMatchStatus(startTime, endTime),
        }).returning();

        if (req.app.locals.broadcastMatchCreated) {
            req.app.locals.broadcastMatchCreated(event);
        }

        return res.status(201).json({ message: "Match created successfully", event });
    } catch (error) {
        return res.status(500).json({ error: "Failed to create match", details: error });
    }
})
