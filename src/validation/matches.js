import { z } from 'zod';

// Match status constants
export const MATCH_STATUS = {
    SCHEDULED: 'scheduled',
    LIVE: 'live',
    FINISHED: 'finished',
};

// Schema for listing matches with query parameters
export const listMatchesQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
});

// Schema for match ID in URL params
export const matchIdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});

// Schema for creating a new match
export const createMatchSchema = z
    .object({
        sport: z.string().min(1, 'Sport is required'),
        homeTeam: z.string().min(1, 'Home team is required'),
        awayTeam: z.string().min(1, 'Away team is required'),
        startTime: z.iso.datetime('startTime must be a valid ISO date string'),
        endTime: z.iso.datetime('endTime must be a valid ISO date string'),
        homeScore: z.coerce.number().int().min(0).optional(),
        awayScore: z.coerce.number().int().min(0).optional(),
    })
    .superRefine((data, ctx) => {
        // Ensure endTime is after startTime
        const startDate = new Date(data.startTime);
        const endDate = new Date(data.endTime);

        if (endDate <= startDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'endTime must be after startTime',
                path: ['endTime'],
            });
        }
    });

// Schema for updating match scores
export const updateScoreSchema = z.object({
    homeScore: z.coerce.number().int().min(0),
    awayScore: z.coerce.number().int().min(0),
});
