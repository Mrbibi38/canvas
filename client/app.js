const API_URL = 'http://localhost:8888';
const WS_URL = 'ws://localhost:8080';

const socket = new WebSocket(WS_URL);
const canvas = document.getElementById('canvas');
const thicknessSlider = document.querySelector('#lineThickness');
const lineThicknessValue = document.querySelector('.lineThicknessValue');
const calloutHeadersText = document.querySelectorAll('.callout-header-text');
const calloutContents = document.querySelectorAll('.callout-content');
const loginButton = document.querySelectorAll('.login-button');
const logoutButton = document.querySelectorAll('.logout-button');
const toolbar = document.querySelector('.toolbar');
const context = canvas.getContext('2d');

let isDrawing = false;
let x = 0;
let y = 0;
let currentColor = 'black';  
let lineWidth = thicknessSlider.value;  

let linesHistory = [];  
let sendingHistory = false;
let isTeacher = false;  // Tracks if the user is a teacher

// Store and retrieve client tokens
function storeToken(token) {
    sessionStorage.setItem('clientToken', token);
}

function getToken() {
    return sessionStorage.getItem('clientToken');
}

// Adjust canvas size for responsiveness
function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    redrawHistory(); // Redraw lines on resize
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Initialize canvas tools and UI elements
function initializeColors() {
    const colors = ['black', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'brown', 'pink', 'gray'];
    const colorsButtons = document.querySelector('.colors-btns');

    colors.forEach(color => {
        const button = document.createElement('button');
        button.style.backgroundColor = color;
        button.addEventListener('click', () => setCurrentColor(color));
        colorsButtons.appendChild(button);
    });
}

function setCurrentColor(color) {
    currentColor = color;
    context.strokeStyle = color;
}

function initializeThicknessSlider() {
    thicknessSlider.min = '1';
    thicknessSlider.max = '10';
    thicknessSlider.value = lineWidth;
    lineThicknessValue.innerHTML = `${lineWidth}px`;

    thicknessSlider.addEventListener('input', (e) => {
        lineWidth = e.target.value;
        context.lineWidth = lineWidth;
        lineThicknessValue.innerHTML = `${lineWidth}px`;
    });
}

function initializeToolsBar() {
    toolbar.style.display = isTeacher ? 'flex' : 'none';
}

// Drawing functionality
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
    if (!isTeacher) {
        toggleUnauthorizedModal();
        return;
    }
    const mousePos = getMousePos(clientX, clientY);
    x = mousePos.x;
    y = mousePos.y;
    isDrawing = true;
}

function draw(clientX, clientY) {
    if (!isDrawing || !isTeacher) return;

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

// WebSocket communication
function sendNewLineToServer(newLine) {
    sendingHistory = true;
    socket.send(JSON.stringify([newLine]));
}

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.clearBoard) {
        clearArea();
    } else if (data.token) {
        storeToken(data.token);
    } else if (!sendingHistory) {
        data.forEach((line) => drawLine(context, line));
    }
    sendingHistory = false;
};

// Clear the canvas
function clearArea() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    linesHistory = [];
}

const clearButton = document.getElementById('clearButton');
clearButton.addEventListener('click', () => {
    clearArea();
    socket.send(JSON.stringify({ clearBoard: true }));
});

// Login function
async function loginAsTeacher() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const clientToken = getToken();

    if (!clientToken) {
        alert('No client token found. Refresh the page to get one.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, clientToken })
        });

        if (response.ok) {
            const result = await response.json();
            storeToken(result.newToken || clientToken);
            changeCalloutContentForTeacher();
            toggleLoginForm();
        } else {
            alert('Login failed. Check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error);
    }
}

// Logout function
async function logout() {
    const clientToken = getToken();

    try {
        const response = await fetch(`${API_URL}/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientToken })
        });

        if (response.ok) {
            sessionStorage.removeItem('clientToken');
            changeCalloutContentForStudent();
        } else {
            alert('Logout failed.');
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

initializeColors();
initializeThicknessSlider();
initializeToolsBar();
