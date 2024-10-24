const socket = new WebSocket('ws://localhost:8080');
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
let isTeacher = false;  // New flag to track if the user is a teacher

// Function to store token in sessionStorage or cookie
function storeToken(token) {
    sessionStorage.setItem('clientToken', token);
}

// Function to retrieve token from sessionStorage or cookie
function getToken() {
    return sessionStorage.getItem('clientToken');
}

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

function initializeToolsBar() {
    if(!isTeacher) {
        toolbar.style.display = 'none';
    } else {
        toolbar.style.display = 'flex';
    }
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
    if (!isTeacher) {
        // alert('You are not authorized to draw on the canvas.');
        toggleUnauthorizedModal();
        return;  // Prevent drawing if not a teacher
    }

    const mousePos = getMousePos(clientX, clientY);
    x = mousePos.x;
    y = mousePos.y;
    isDrawing = true;
}

function draw(clientX, clientY) {
    if (!isDrawing || !isTeacher) return;  // Prevent drawing if not a teacher or if not currently drawing

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
    if (data.token) {
        storeToken(data.token);
        console.log('Received client token: ', data.token);
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

async function loginAsTeacher() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const clientToken = getToken();
    if (!clientToken) {
        alert('No client token found... Please refresh the page to get a client token.');
        return;
    }

    const loginData = { username, password, clientToken };

    try {
        const response = await fetch('http://localhost:8888/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        });

        const result = await response.json();
        if (response.ok) {
            console.log('Login successful:', result.message);
            sessionStorage.setItem('clientToken', result.newToken || clientToken);
            toggleLoginForm();
            changeCalloutContentForTeacher();
            hideLoginButton();
            showLogoutButton();
            toggleSuccessModal();
        } else {
            console.error('Login failed:', result.message);
            toggleFailModal();
        }
    } catch (error) {
        console.error('Error logging in:', error);
        toggleFailModal();
    }
}

// Function to change callout content when logged as a teacher
function changeCalloutContentForTeacher() {
    calloutHeadersText[0].textContent = 'Logged as teacher';
    calloutContents[0].textContent = 'You can now draw on the canvas. The student connected to this session will see your drawings.';
    isTeacher = true;  // Set role to teacher
    initializeToolsBar();
}

function changeCalloutContentForStudent() {
    calloutHeadersText[0].textContent = 'Logged as student';
    calloutContents[0].textContent = "You can view the whiteboard but you can't draw on it.";
    isTeacher = false;  // Set role to student
    initializeToolsBar();
}

function showLoginButton() {
    loginButton.forEach(button => button.style.display = 'block');
}

function hideLoginButton() {
    loginButton.forEach(button => button.style.display = 'none');
}

function showLogoutButton() {
    logoutButton.forEach(button => button.style.display = 'block');
}

function hideLogoutButton() {
    logoutButton.forEach(button => button.style.display = 'none');
}

// Logout function
async function logout() {
    const clientToken = getToken();  // Get the current token from sessionStorage

    if (!clientToken) {
        alert('No client token found... You are not logged in.');
        return;
    }

    // Send a logout request to the server
    try {
        const response = await fetch('http://localhost:8888/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ clientToken })
        });

        if (response.ok) {
            console.log('Logout successful');
            // sessionStorage.removeItem('clientToken');  // Clear the token on client side
            changeCalloutContentForStudent();  // Revert UI to student mode
            hideLogoutButton();
            showLoginButton();
            toggleDisconnectModal();  // Show disconnect modal
            isTeacher = false;  // Reset role to student
        } else {
            console.error('Logout failed');
        }
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

// Function to toggle success modal
function toggleSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
}

// Function to toggle fail modal
function toggleFailModal() {
    const modal = document.getElementById('failModal');
    modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
}

// Function to toggle disconnect modal
function toggleDisconnectModal() {
    const modal = document.getElementById('disconnectModal');
    modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
}

function toggleUnauthorizedModal() {
    const modal = document.getElementById("unauthorizedModal");
    modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
}

// Initialize canvas and controls
initializeColors();
initializeThicknessSlider();
initializeToolsBar();
