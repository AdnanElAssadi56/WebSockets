import { WebSocket, WebSocketServer } from "ws";

const matchSubscribers = new Map();

function subscribe(matchId, socket) {
    if (!matchSubscribers.has(matchId)) {
        matchSubscribers.set(matchId, new Set());
    }
    matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
    const subscribers = matchSubscribers.get(matchId);
    if (subscribers) {
        subscribers.delete(socket);
        if (subscribers.size === 0) {
            matchSubscribers.delete(matchId);
        }
    }
}

function cleanupSubscriptions(socket) {
    const subscriptions = socket.subscriptions;
    subscriptions.forEach(matchId => {
        unsubscribe(matchId, socket);
    });
}


function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) {
        return;
    }
    socket.send(JSON.stringify(payload));
}

export function broadcastToAll(wss, payload) {
    wss.clients.forEach(socket => {
        if (socket.readyState !== WebSocket.OPEN) {
            return;
        }
        sendJson(socket, payload);
    });
}

function broadcastToMatch(matchId, payload) {
    if (matchSubscribers.has(matchId)) {
        matchSubscribers.get(matchId).forEach(socket => {
            sendJson(socket, payload);
        });
    }
}

function handleMessage(socket, data) {
    let message;
    try {
        message = JSON.parse(data.toString());
    } catch (error) {
        sendJson(socket, { type: 'error', message: 'Invalid JSON' });
        return;
    }

    const { type, matchId } = message;

    // Use Number() to satisfy both strings "1" and numbers 1
    const parsedId = Number(matchId);
    const isValidId = !isNaN(parsedId) && Number.isInteger(parsedId);

    if (type === "subscribe" && isValidId) {
        subscribe(parsedId, socket);
        socket.subscriptions.add(parsedId);
        sendJson(socket, { type: 'subscribed', matchId: parsedId });
        return;
    }

    if (type === "unsubscribe" && isValidId) {
        unsubscribe(parsedId, socket);
        socket.subscriptions.delete(parsedId);
        sendJson(socket, { type: 'unsubscribed', matchId: parsedId });
        return;
    }

    sendJson(socket, { type: 'error', message: 'Invalid message type or missing/invalid matchId' });
}
export function attachWebSocketServer(httpServer) {
    const wss = new WebSocketServer({
        server: httpServer,
        path: '/ws',
        maxPayload: 1024 * 1024,
    });

    const HEARTBEAT_INTERVAL = 30000;

    wss.on('connection', (socket) => {

        socket.isAlive = true;

        sendJson(socket, { type: 'welcome', message: 'Welcome to the WebSocket server!' });

        socket.on('pong', () => {
            socket.isAlive = true;
        });

        socket.subscriptions = new Set();
        socket.on('message', (data) => handleMessage(socket, data));
        socket.on('error', console.error);

        socket.on('close', () => {
            console.log('Client disconnected');
            cleanupSubscriptions(socket);
        });
    });

    const heartbeatInterval = setInterval(() => {
        wss.clients.forEach(socket => {
            if (!socket.isAlive) {
                socket.terminate();
                return;
            }
            socket.isAlive = false;
            socket.ping();
        });
    }, HEARTBEAT_INTERVAL);

    wss.on('close', () => {
        clearInterval(heartbeatInterval);
    });

    function broadcastMatchCreated(match) {
        broadcastToAll(wss, { type: 'match_created', data: match });
    }

    function broadcastCommentary(matchId, commentary) {
        broadcastToMatch(matchId, { type: 'commentary', data: commentary });
    }
    return {
        broadcastMatchCreated,
        broadcastCommentary,
    };
}
