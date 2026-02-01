import { WebSocket, WebSocketServer } from "ws";

function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) {
        return;
    }
    socket.send(JSON.stringify(payload));
}

export function broadcastJson(wss, payload) {
    wss.clients.forEach(socket => {
        if (socket.readyState !== WebSocket.OPEN) {
            return;
        }
        sendJson(socket, payload);
    });
}

export function attachWebSocketServer(httpServer) {
    const wss = new WebSocketServer({
        server: httpServer,
        path: '/ws',
        maxPayload: 1024 * 1024,
    });

    wss.on('connection', (socket) => {
        sendJson(socket, { type: 'welcome', message: 'Welcome to the WebSocket server!' });

        socket.on('error', console.error);

        socket.on('close', () => {
            console.log('Client disconnected');
        });
    });
    function broadcastMatchCreated(match) {
        broadcastJson(wss, { type: 'match_created', data: match });
    }

    return {
        broadcastMatchCreated,
    };
}
