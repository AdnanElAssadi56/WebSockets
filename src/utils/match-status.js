import { MATCH_STATUS } from "../validation/matches.js";

export function getMatchStatus(startTime, endTime, now = new Date()) {
    if (now < startTime) {
        return MATCH_STATUS.SCHEDULED;
    } else if (now < endTime) {
        return MATCH_STATUS.LIVE;
    } else {
        return MATCH_STATUS.FINISHED;
    }
}

// export async function syncMatchStatus(match, updatedStatus) {
//     const nextStatus = getMatchStatus(match.startTime, match.endTime);
//     if (!nextStatus) {
//         return match.status;
//     }
//     if (nextStatus !== updatedStatus) {
//         await updateStatus(nextStatus);
//         match.status = nextStatus;
//     }
//     return match.status;
// }
