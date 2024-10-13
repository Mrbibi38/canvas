const socket = new WebSocket('ws://192.168.56.1:8080');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
let isDrawing = false;
let x = 0;
let y = 0;
let currentColor = 'black'; // Track the current color

let linesHistory = [];     // Local drawing history (to send to the server)
let receivedHistory = [];  // History received from the server (to be drawn)

// Adjust canvas size for different devices
function resizeCanvas() {
    canvas.width = window.innerWidth * 0.9;  // 90% of the viewport width
    canvas.height = window.innerHeight * 0.4;  // 40% of the viewport height
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let sendingHistory = false;

const colors = ['black', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'brown', 'pink', 'gray'];
const colorsButtons = document.querySelector('.colors');

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

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
window.addEventListener('mouseup', stopDrawing);

// Add touch events for mobile
canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    x = touch.clientX - canvas.offsetLeft;
    y = touch.clientY - canvas.offsetTop;
    isDrawing = true;
});

canvas.addEventListener('touchmove', (e) => {
    if (isDrawing) {
        const touch = e.touches[0];
        const newLine = {
            x1: x, y1: y,
            x2: touch.clientX - canvas.offsetLeft,
            y2: touch.clientY - canvas.offsetTop,
            color: currentColor
        };
        drawLine(context, newLine);
        sendNewLineToServer(newLine);
        x = touch.clientX - canvas.offsetLeft;
        y = touch.clientY - canvas.offsetTop;
    }
});

canvas.addEventListener('touchend', stopDrawing);

function startDrawing(e) {
    x = e.offsetX;
    y = e.offsetY;
    isDrawing = true;
}

function draw(e) {
    if (!isDrawing) return;
    const newLine = { x1: x, y1: y, x2: e.offsetX, y2: e.offsetY, color: currentColor };
    drawLine(context, newLine);
    sendNewLineToServer(newLine);
    x = e.offsetX;
    y = e.offsetY;
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
    }
}

function drawLine(context, line) {
    context.strokeStyle = line.color;
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
