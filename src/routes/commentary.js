import { Router } from "express";
import { db } from "../db/db.js";
import { commentary, matches } from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
    createCommentarySchema,
    matchIdParamsSchema,
    listCommentaryQuerySchema
} from "../validation/commentary.js";

export const commentaryRouter = Router({ mergeParams: true });

// GET /matches/:id - List all commentary for a match
commentaryRouter.get('/', async (req, res) => {
    // Validate match ID from params
    const parsedParams = matchIdParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: parsedParams.error.errors
        });
    }

    // Validate query parameters (limit)
    const parsedQuery = listCommentaryQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
        return res.status(400).json({
            error: "Invalid query parameters",
            details: parsedQuery.error.errors
        });
    }

    const { id: matchId } = parsedParams.data;
    const { limit = 50 } = parsedQuery.data;

    try {
        // Check if match exists
        const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);

        if (!match) {
            return res.status(404).json({ error: "Match not found" });
        }

        // Fetch commentary for the match
        const commentaryData = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, matchId))
            .limit(limit);

        return res.status(200).json({
            matchId,
            count: commentaryData.length,
            commentary: commentaryData
        });
    } catch (error) {
        console.error("Error fetching commentary:", error);
        return res.status(500).json({
            error: "Failed to fetch commentary",
            details: error.message
        });
    }
});

// POST /matches/:id - Create new commentary for a match
commentaryRouter.post('/', async (req, res) => {
    // Validate match ID from params
    const parsedParams = matchIdParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: parsedParams.error.errors
        });
    }

    // Validate request body
    const parsedBody = createCommentarySchema.safeParse(req.body);
    if (!parsedBody.success) {
        return res.status(400).json({
            error: "Invalid commentary data",
            details: parsedBody.error.errors
        });
    }

    const { id: matchId } = parsedParams.data;
    const commentaryData = parsedBody.data;

    try {
        // Check if match exists
        const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);

        if (!match) {
            return res.status(404).json({ error: "Match not found" });
        }

        // Insert commentary into database
        const [newCommentary] = await db
            .insert(commentary)
            .values({
                matchId,
                ...commentaryData
            })
            .returning();

        // Broadcast to WebSocket clients if available
        if (req.app.locals.broadcastCommentary) {
            req.app.locals.broadcastCommentary(matchId, newCommentary);
        }

        return res.status(201).json({
            message: "Commentary created successfully",
            commentary: newCommentary
        });
    } catch (error) {
        console.error("Error creating commentary:", error);
        return res.status(500).json({
            error: "Failed to create commentary",
            details: error.message
        });
    }
});