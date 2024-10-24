const socket = new WebSocket('ws://localhost:8080');
const canvas = document.getElementById('canvas');
const thicknessSlider = document.querySelector('#lineThickness');
const lineThicknessValue = document.querySelector('.lineThicknessValue');
const context = canvas.getContext('2d');
let isDrawing = false;
let x = 0;
let y = 0;
let currentColor = 'black';  // Track the current color
let lineWidth = thicknessSlider.value;  // Track the current line width

let linesHistory = [];  // Local drawing history (to send to the server)
let receivedHistory = [];  // History received from the server (to be drawn)

// Function to store token in localStorage or cookie
function storeToken(token) {
    // Storing in localStorage (uncomment to use)
    localStorage.setItem('clientToken', token);

    // Or store in a cookie (uncomment to use)
    // document.cookie = `clientToken=${token}; path=/; secure; SameSite=Strict;`;
}

// Function to retrieve token from localStorage or cookie
function getToken() {
    // Retrieving from localStorage (uncomment to use)
    const token = localStorage.getItem('clientToken');

    // Or retrieve from cookie (uncomment to use)
    // const token = document.cookie.split('; ').find(row => row.startsWith('clientToken=')).split('=')[1];

    return token;
}

// Adjust canvas size for different devices
function resizeCanvas() {
    canvas.width = canvas.offsetWidth;  // Set internal width based on CSS
    canvas.height = canvas.offsetHeight;  // Set internal height based on CSS
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let sendingHistory = false;

// Colors buttons
const colors = ['black', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'brown', 'pink', 'gray'];
const colorsButtons = document.querySelector('.colors-btns');

colors.forEach((color) => {
    const button = document.createElement('button');
    button.style.backgroundColor = color;
    button.addEventListener('click', () => {
        currentColor = color;
        context.strokeStyle = color;
    });
    colorsButtons.appendChild(button);
});

context.strokeStyle = currentColor;

// Set the initial line width
context.lineWidth = lineWidth;

// Line thickness slider
thicknessSlider.min = '1';
thicknessSlider.max = '10';
thicknessSlider.value = lineWidth;
lineThicknessValue.innerHTML = lineWidth + "px";

thicknessSlider.addEventListener('input', (e) => {
    lineWidth = e.target.value;
    context.lineWidth = lineWidth;  // Update the line width in the context
    lineThicknessValue.innerHTML = lineWidth + "px";
});

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
window.addEventListener('mouseup', stopDrawing);

// Add touch events for mobile
canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const mousePos = getMousePos(touch.clientX, touch.clientY);
    x = mousePos.x;
    y = mousePos.y;
    isDrawing = true;
});

canvas.addEventListener('touchmove', (e) => {
    if (isDrawing) {
        const touch = e.touches[0];
        const newLine = {
            x1: x, y1: y,
            x2: touch.clientX - canvas.offsetLeft,
            y2: touch.clientY - canvas.offsetTop,
            color: currentColor,
            width: lineWidth
        };
        drawLine(context, newLine);
        sendNewLineToServer(newLine);
        const mousePos = getMousePos(touch.clientX, touch.clientY);
        x = mousePos.x;
        y = mousePos.y;
    }
});

canvas.addEventListener('touchend', stopDrawing);

function getMousePos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
    };
}

function startDrawing(e) {
    const mousePos = getMousePos(e.clientX, e.clientY);
    x = mousePos.x;
    y = mousePos.y;
    isDrawing = true;
}

function draw(e) {
    if (!isDrawing) return;

    const mousePos = getMousePos(e.clientX, e.clientY);
    const newLine = { x1: x, y1: y, x2: mousePos.x, y2: mousePos.y, color: currentColor, width: lineWidth };
    drawLine(context, newLine);
    sendNewLineToServer(newLine);
    x = mousePos.x;
    y = mousePos.y;
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
    }
}

function drawLine(context, line) {
    context.strokeStyle = line.color;
    context.lineWidth = line.width;  // Use the width from the line data
    context.beginPath();
    context.moveTo(line.x1, line.y1);
    context.lineTo(line.x2, line.y2);
    context.closePath();
    context.stroke();
    linesHistory.push(line);
}

function sendNewLineToServer(newLine) {
    sendingHistory = true;
    socket.send(JSON.stringify([newLine]));
}

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // Check if the message contains the token
    if (data.token) {
        storeToken(data.token);  // Store the token in localStorage or cookie
        console.log('Received client token: ', data.token);
    }

    if (data.clearBoard) {
        clearArea();
        return;
    }

    if (sendingHistory) {
        sendingHistory = false;
        return;
    }

    data.forEach((line) => {
        drawLine(context, line);
    });
};

function clearArea() {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
}

function sendClearBoard() {
    socket.send(JSON.stringify({ clearBoard: true }));
}

const clearButton = document.getElementById('clearButton');
clearButton.addEventListener('click', () => {
    clearArea();
    sendClearBoard();
});
