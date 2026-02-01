import { z } from 'zod';

// Schema for validating match ID in route parameters
export const matchIdParamsSchema = z.object({
    id: z.coerce.number().int().positive({
        message: 'Match ID must be a positive integer'
    })
});

export const listCommentaryQuerySchema = z.object({
    limit: z.coerce
        .number()
        .positive({ message: 'Limit must be a positive number' })
        .max(100, { message: 'Limit cannot exceed 100' })
        .optional()
});


export const createCommentarySchema = z.object({
    minute: z.number().int().nonnegative({
        message: 'Minute must be a non-negative integer'
    }),
    sequence: z.number().int().nonnegative({
        message: 'Sequence must be a non-negative integer'
    }),
    period: z.string().min(1, {
        message: 'Period is required and cannot be empty'
    }),
    eventType: z.string().min(1, {
        message: 'Event type is required and cannot be empty'
    }),

    actor: z.string().min(1, {
        message: 'Actor is required and cannot be empty'
    }),

    team: z.string().min(1, {
        message: 'Team is required and cannot be empty'
    }),
    message: z.string().min(1, {
        message: 'Message is required and cannot be empty'
    }),
    metadata: z.record(z.string(), z.any()).optional(),
    tags: z.array(z.string()).optional()
});
