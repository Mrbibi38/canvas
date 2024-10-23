const socket = new WebSocket('ws://localhost:8080');
const canvas = document.getElementById('canvas');
const thicknessSlider = document.querySelector('#lineThickness');
const lineThicknessValue = document.querySelector('.lineThicknessValue');
const context = canvas.getContext('2d');

let isDrawing = false;
let x = 0;
let y = 0;
let currentColor = 'black';  
let lineWidth = thicknessSlider.value;  

let linesHistory = [];  
let sendingHistory = false;

// Adjust canvas size for different devices
function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

window.addEventListener('resize', () => {
    resizeCanvas();
    redrawHistory(); // Redraw lines on resize
});
resizeCanvas();

// Initialize colors and thickness
function initializeColors() {
    const colors = ['black', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'brown', 'pink', 'gray'];
    const colorsButtons = document.querySelector('.colors-btns');

    colors.forEach(color => {
        const button = createColorButton(color);
        colorsButtons.appendChild(button);
    });
}

function createColorButton(color) {
    const button = document.createElement('button');
    button.style.backgroundColor = color;
    button.addEventListener('click', () => {
        setCurrentColor(color);
    });
    return button;
}

function setCurrentColor(color) {
    currentColor = color;
    context.strokeStyle = color;
}

// Initialize line thickness
function initializeThicknessSlider() {
    thicknessSlider.min = '1';
    thicknessSlider.max = '10';
    thicknessSlider.value = lineWidth;
    lineThicknessValue.innerHTML = `${lineWidth}px`;

    thicknessSlider.addEventListener('input', (e) => {
        updateLineWidth(e.target.value);
    });
}

function updateLineWidth(value) {
    lineWidth = value;
    context.lineWidth = lineWidth;
    lineThicknessValue.innerHTML = `${lineWidth}px`;
}

// Drawing functions
canvas.addEventListener('mousedown', (e) => startDrawing(e.clientX, e.clientY));
canvas.addEventListener('mousemove', (e) => draw(e.clientX, e.clientY));
window.addEventListener('mouseup', stopDrawing);

canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    startDrawing(touch.clientX, touch.clientY);
});

canvas.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    draw(touch.clientX, touch.clientY);
});

canvas.addEventListener('touchend', stopDrawing);

function startDrawing(clientX, clientY) {
    const mousePos = getMousePos(clientX, clientY);
    x = mousePos.x;
    y = mousePos.y;
    isDrawing = true;
}

function draw(clientX, clientY) {
    if (!isDrawing) return;

    const mousePos = getMousePos(clientX, clientY);
    const newLine = { x1: x, y1: y, x2: mousePos.x, y2: mousePos.y, color: currentColor, width: lineWidth };
    drawLine(context, newLine);
    sendNewLineToServer(newLine);
    x = mousePos.x;
    y = mousePos.y;
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        linesHistory.push({ x1: x, y1: y, x2: x, y2: y, color: currentColor, width: lineWidth });
    }
}

function drawLine(context, line) {
    context.strokeStyle = line.color;
    context.lineWidth = line.width;  
    context.beginPath();
    context.moveTo(line.x1, line.y1);
    context.lineTo(line.x2, line.y2);
    context.closePath();
    context.stroke();
}

function getMousePos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height),
    };
}

// Socket communication
function sendNewLineToServer(newLine) {
    sendingHistory = true;
    socket.send(JSON.stringify([newLine]));
}

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleSocketMessage(data);
};

function handleSocketMessage(data) {
    if (data.clearBoard) {
        clearArea();
        return;
    }
    if (sendingHistory) {
        sendingHistory = false;
        return;
    }
    data.forEach((line) => drawLine(context, line));
}

// Clear the canvas
function clearArea() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    linesHistory = [];
}

function sendClearBoard() {
    socket.send(JSON.stringify({ clearBoard: true }));
}

// Clear button handling
const clearButton = document.getElementById('clearButton');
clearButton.addEventListener('click', () => {
    clearArea();
    sendClearBoard();
});

// Modal handling
function toggleLoginForm() {
    const modal = document.getElementById('loginModal');
    modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
}

// Close the modal if the user clicks outside of it
window.onclick = (event) => {
    const modal = document.getElementById('loginModal');
    if (event.target === modal) {
        toggleLoginForm();
    }
}

// Initialize components
initializeColors();
initializeThicknessSlider();
