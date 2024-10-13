const WebSocket = require("ws");

const wss = new WebSocket.Server({ host: '0.0.0.0', port: 8080 });

wss.on("connection", function connection(ws) {
    console.log("A client connected");

    // Handle incoming messages
    ws.on("message", function incoming(message) {
        // If the message is a Buffer, convert it to a string
        if (Buffer.isBuffer(message)) {
            message = message.toString(); // Convert Buffer to string
        }

        console.log("Received: ", message);
        console.log("Message Type: ", typeof message); // Log the type of the message

        // Ensure the message is a string before broadcasting
        if (typeof message === 'string') {
            const parsedMessage = JSON.parse(message);  // Parse the incoming message

            console.log("Parsed Message: ", parsedMessage);
            

            // Check if the message is a clear board command
            if (parsedMessage.clearBoard) {
                console.log("Clear board message received. Broadcasting to all clients.");

                // Broadcast the clear board message to all clients
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ clearBoard: true }));  // Broadcast the clear signal
                    }
                });
            } else {
                // Broadcast the drawing data to all clients
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        console.log("Broadcasting: " + message);
                        client.send(message); // Send the drawing message
                    }
                });
            }
        } else {
            console.warn("Received non-string message");
        }
    });

    ws.on("close", function close() {
        console.log("A client disconnected");
    });
});

console.log('WebSocket server running on ws://localhost:8080');
