const WebSocket = require("ws");
const { v4: uuidv4 } = require('uuid');  // UUID package to generate unique tokens
const wss = new WebSocket.Server({ host: '0.0.0.0', port: 8080 });

// Express server setup
const cors = require('cors');
const express = require('express');
const app = express();
const PORT = 8888;

// Enable JSON parsing for the Express app
app.use(express.json());
app.use(cors());  // Allow all origins

const teacherCredentials = {
    username: 'prof',
    password: 'pass'
};

// Map to store clients and their tokens
const clients = new Map();
const teachers = new Map();

wss.on("connection", function connection(ws) {
    const clientToken = uuidv4();  // Generate a unique token for the client
    clients.set(ws, clientToken);   // Store the token with the WebSocket connection

    console.log(`A client connected with token: ${clientToken}`);
    
    // Send the token back to the client
    ws.send(JSON.stringify({ token: clientToken }));

    // Handle incoming messages
    ws.on("message", function incoming(message) {
        // If the message is a Buffer, convert it to a string
        if (Buffer.isBuffer(message)) {
            message = message.toString(); // Convert Buffer to string
        }

        // console.log("Received: ", message);
        // console.log("Message Type: ", typeof message); // Log the type of the message

        // Ensure the message is a string before processing
        if (typeof message === 'string') {
            const parsedMessage = JSON.parse(message);  // Parse the incoming message
            // console.log("Parsed Message: ", parsedMessage);

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
                // Check if the client is a teacher
                const clientToken = clients.get(ws); // Retrieve the token of the client
                if (teachers.has(clientToken)) {
                    // Broadcast the drawing data to all clients
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            console.log("Broadcasting: " + message);
                            client.send(message); // Send the drawing message
                        }
                    });
                } else {
                    // Log that the client is not a teacher and can't draw
                    console.log(`Client ${clientToken} attempted to draw without permission.`);
                }
            }
        } else {
            console.warn("Received non-string message");
        }
    });

    ws.on("close", function close() {
        const clientToken = clients.get(ws); // Retrieve the token of the disconnected client
        console.log(`A client disconnected with token: ${clientToken}`);
        clients.delete(ws);  // Remove the client from the map
    });
});

console.log('WebSocket server running on ws://localhost:8080');

// Route for login
app.post('/login', (req, res) => {
    const { username, password, clientToken } = req.body;

    // Check if the provided credentials are valid
    if (username === teacherCredentials.username && password === teacherCredentials.password) {
        console.log(`Client ${clientToken} logged in successfully as teacher.`);
        
        // Store the teacher token
        teachers.set(clientToken, true);  

        // Send success response
        return res.json({
            message: 'Login successful',
            newToken: clientToken  // You can send a new token if needed
        });
    } else {
        console.log(`Client ${clientToken} failed to login.`);
        
        // Send error response if credentials are invalid
        return res.status(401).json({
            message: 'Invalid username or password'
        });
    }
});

app.post('/logout', (req, res) => {
    const { clientToken } = req.body;

    if (!clientToken || !teachers.has(clientToken)) {
        return res.status(400).json({ message: 'Invalid or non-existent token' });
    }

    // Remove the teacher from the teachers map to revoke drawing permissions
    teachers.delete(clientToken);
    console.log(`Teacher with token ${clientToken} has logged out`);

    res.json({ message: 'Logout successful' });
});


app.listen(PORT, () => {
    console.log(`Express server running on http://localhost:${PORT}`);
});
