// Global state
let userData = {
    username: '',
    wakeTime: '',
    sleepTime: '',
    genre: '',
    intensity: '',
    peakWindows: [],
    cycles: []
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('analyzeBtn').addEventListener('click', handleAnalyze);
    document.getElementById('exportBtn').addEventListener('click', exportImage);
    document.getElementById('resetBtn').addEventListener('click', resetApp);
}

function handleAnalyze() {
    // Get form data
    const username = document.getElementById('username').value.trim();
    const wakeTime = document.getElementById('wakeTime').value;
    const sleepTime = document.getElementById('sleepTime').value;
    const genre = document.getElementById('gameGenre').value;
    const intensity = document.getElementById('intensity').value;

    // Validate
    if (!username) {
        alert('Please enter your operator alias');
        return;
    }

    if (!wakeTime || !sleepTime) {
        alert('Please set your wake and sleep times');
        return;
    }

    // Store data
    userData = {
        username,
        wakeTime,
        sleepTime,
        genre,
        intensity
    };

    // Calculate rhythms
    calculateUltradianRhythms();

    // Show results
    showResults();
}

function calculateUltradianRhythms() {
    const cycles = [];
    const wake = parseTime(userData.wakeTime);
    const sleep = parseTime(userData.sleepTime);
    
    // Calculate total awake hours
    let totalMinutes;
    if (sleep > wake) {
        totalMinutes = sleep - wake;
    } else {
        totalMinutes = (1440 - wake) + sleep; // Cross midnight
    }

    // Ultradian cycle parameters
    const CYCLE_LENGTH = 90; // Peak phase length in minutes
    const REST_LENGTH = 20;  // Trough phase length in minutes
    const FULL_CYCLE = CYCLE_LENGTH + REST_LENGTH;

    // First peak starts 90-120 minutes after waking (cortisol awakening response)
    let currentTime = wake + 100; // Start first peak at ~1h 40min after wake

    const peakWindows = [];
    let cycleCount = 0;

    while (currentTime < wake + totalMinutes - CYCLE_LENGTH) {
        const peakStart = currentTime;
        const peakEnd = currentTime + CYCLE_LENGTH;
        const restEnd = peakEnd + REST_LENGTH;

        // Store peak window
        peakWindows.push({
            start: peakStart,
            end: peakEnd,
            restEnd: restEnd,
            cycle: cycleCount
        });

        cycles.push({
            peakStart,
            peakEnd,
            restEnd,
            performance: calculatePerformanceScore(currentTime, wake, totalMinutes, cycleCount)
        });

        currentTime = restEnd;
        cycleCount++;
    }

    userData.cycles = cycles;
    userData.peakWindows = peakWindows;
    
    // Find optimal peak window (highest performance)
    const bestWindow = peakWindows.reduce((best, current, index) => {
        const currentScore = cycles[index].performance;
        const bestScore = cycles[best].performance;
        return currentScore > bestScore ? index : best;
    }, 0);

    userData.optimalWindow = peakWindows[bestWindow];
}

function calculatePerformanceScore(time, wake, totalMinutes, cycleNumber) {
    // Base performance on time of day and cycle number
    const hoursAwake = (time - wake) / 60;
    
    // Peak performance typically 2-6 hours after waking
    let circadianFactor = 1.0;
    if (hoursAwake >= 2 && hoursAwake <= 6) {
        circadianFactor = 1.3; // Prime time
    } else if (hoursAwake >= 6 && hoursAwake <= 10) {
        circadianFactor = 1.1; // Good time
    } else if (hoursAwake >= 10 && hoursAwake <= 14) {
        circadianFactor = 0.9; // Afternoon dip
    } else {
        circadianFactor = 0.7; // Early morning or late evening
    }

    // Slight degradation over cycles (fatigue)
    const fatigueFactor = Math.max(0.7, 1.0 - (cycleNumber * 0.05));

    // Genre-specific adjustments
    const genreFactors = {
        'FPS': 1.2,
        'MOBA': 1.15,
        'Battle Royale': 1.18,
        'Fighting': 1.22,
        'RTS': 1.1,
        'Racing': 1.2
    };

    const genreFactor = genreFactors[userData.genre] || 1.0;

    // Intensity multiplier
    const intensityFactors = {
        'Casual': 0.8,
        'Competitive': 1.0,
        'Ranked Grind': 1.15,
        'Pro Practice': 1.25
    };

    const intensityFactor = intensityFactors[userData.intensity] || 1.0;

    // Calculate final score (base 100, modified by factors)
    const baseScore = 100;
    return baseScore * circadianFactor * fatigueFactor * genreFactor * intensityFactor;
}

function showResults() {
    // Hide setup, show results
    document.getElementById('setupScreen').classList.remove('active');
    document.getElementById('resultsScreen').classList.add('active');

    // Display user info
    document.getElementById('displayUsername').textContent = userData.username;
    document.getElementById('displayGenre').textContent = userData.genre;
    document.getElementById('displayIntensity').textContent = userData.intensity;

    // Display optimal peak window
    const optimal = userData.optimalWindow;
    const peakStart = formatTime(optimal.start);
    const peakEnd = formatTime(optimal.end);
    document.getElementById('peakWindow').textContent = `${peakStart} - ${peakEnd}`;

    // Display wake/sleep times in chart
    document.getElementById('chartWake').textContent = userData.wakeTime;
    document.getElementById('chartSleep').textContent = userData.sleepTime;

    // Calculate and display metrics
    displayMetrics();

    // Generate time slots
    generateTimeSlots();

    // Draw chart
    drawChart();
}

function displayMetrics() {
    // Calculate APM potential based on genre and optimal performance
    const optimalPerformance = userData.cycles[userData.peakWindows.indexOf(userData.optimalWindow)].performance;
    const baseAPM = {
        'FPS': 180,
        'MOBA': 200,
        'Battle Royale': 170,
        'Fighting': 250,
        'RTS': 300,
        'Racing': 150
    };

    const apm = Math.round((baseAPM[userData.genre] || 200) * (optimalPerformance / 100));
    document.getElementById('apmScore').textContent = apm;

    // Metabolic flush rate based on cycle count and rest periods
    const flushRates = ['LOW', 'MEDIUM', 'HIGH', 'VERY HIGH'];
    const cycleCount = userData.cycles.length;
    let flushIndex = Math.min(3, Math.floor(cycleCount / 2));
    
    const flushRate = flushRates[flushIndex];
    document.getElementById('flushRate').textContent = flushRate;

    // Set progress bar
    const flushPercentage = ((flushIndex + 1) / 4) * 100;
    document.getElementById('flushBar').style.width = flushPercentage + '%';
}

function generateTimeSlots() {
    const container = document.getElementById('timeSlots');
    container.innerHTML = '';

    const wake = parseTime(userData.wakeTime);
    const sleep = parseTime(userData.sleepTime);

    // Phase names for different parts of the cycle
    const phaseNames = [
        {title: 'BIOLOGICAL CALIBRATION', desc: 'CORTISOL SPIKE', type: 'prep'},
        {title: 'ARENA ENTRY #', desc: 'DOPAMINE / NOREPINEPHRINE', type: 'peak'},
        {title: 'NEURAL DESENSITIZATION', desc: 'GABA RESYNTHESIS', type: 'rest'},
        {title: 'ARENA ENTRY #', desc: 'DOPAMINE / NOREPINEPHRINE', type: 'peak'},
        {title: 'NEURAL DESENSITIZATION', desc: 'GABA RESYNTHESIS', type: 'rest'},
        {title: 'ARENA ENTRY #', desc: 'DOPAMINE / NOREPINEPHRINE', type: 'peak'},
        {title: 'NEURAL DESENSITIZATION', desc: 'GABA RESYNTHESIS', type: 'rest'},
        {title: 'ARENA ENTRY #', desc: 'DOPAMINE / NOREPINEPHRINE', type: 'peak'}
    ];

    let arenaCount = 1;

    // Create slots for each cycle
    userData.cycles.forEach((cycle, index) => {
        // Peak phase slot
        const peakSlot = document.createElement('div');
        peakSlot.className = 'time-slot';
        
        // Check if this is the optimal window
        if (index === userData.peakWindows.indexOf(userData.optimalWindow)) {
            peakSlot.classList.add('peak');
        }

        let phaseTitle = index === 0 ? phaseNames[0].title : phaseNames[1].title.replace('#', `#${arenaCount}`);
        let phaseDesc = index === 0 ? phaseNames[0].desc : phaseNames[1].desc;
        
        if (index > 0) arenaCount++;

        peakSlot.innerHTML = `
            <div class="slot-time">${formatTime(cycle.peakStart)}</div>
            <div class="slot-title">${phaseTitle}</div>
            <div class="slot-description">${phaseDesc}</div>
        `;
        container.appendChild(peakSlot);

        // Rest phase slot
        if (cycle.restEnd <= sleep) {
            const restSlot = document.createElement('div');
            restSlot.className = 'time-slot';
            restSlot.innerHTML = `
                <div class="slot-time">${formatTime(cycle.peakEnd)}</div>
                <div class="slot-title">NEURAL DESENSITIZATION</div>
                <div class="slot-description">GABA RESYNTHESIS</div>
            `;
            container.appendChild(restSlot);
        }
    });
}

function drawChart() {
    const canvas = document.getElementById('rhythmChart');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate data points for all cycles
    const wake = parseTime(userData.wakeTime);
    const sleep = parseTime(userData.sleepTime);
    let totalMinutes = sleep > wake ? sleep - wake : (1440 - wake) + sleep;

    const dataPoints = [];
    
    // Create smooth curve through cycles
    userData.cycles.forEach((cycle, index) => {
        const cycleStart = cycle.peakStart - wake;
        const cycleEnd = cycle.peakEnd - wake;
        const restEnd = cycle.restEnd - wake;

        // Peak phase - high performance
        for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            const time = cycleStart + (cycleEnd - cycleStart) * t;
            dataPoints.push({
                time: time,
                value: cycle.performance
            });
        }

        // Rest phase - low performance
        for (let i = 0; i <= 5; i++) {
            const t = i / 5;
            const time = cycleEnd + (restEnd - cycleEnd) * t;
            const restValue = cycle.performance * 0.4; // Drop to 40% during rest
            dataPoints.push({
                time: time,
                value: restValue
            });
        }
    });

    // Find min/max for scaling
    const maxValue = Math.max(...dataPoints.map(p => p.value));
    const minValue = Math.min(...dataPoints.map(p => p.value));

    // Draw bars
    const barCount = dataPoints.length;
    const barWidth = graphWidth / barCount;

    ctx.fillStyle = '#00d9ff';
    ctx.strokeStyle = '#00d9ff';
    ctx.lineWidth = 1;

    dataPoints.forEach((point, index) => {
        const x = padding + (index * barWidth);
        const normalizedValue = (point.value - minValue) / (maxValue - minValue);
        const barHeight = normalizedValue * graphHeight;
        const y = padding + graphHeight - barHeight;

        // Draw bar with glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00d9ff';
        ctx.fillRect(x, y, Math.max(2, barWidth - 1), barHeight);
    });

    // Reset shadow
    ctx.shadowBlur = 0;
}

function exportImage() {
    const exportCanvas = document.getElementById('exportCanvas');
    const ctx = exportCanvas.getContext('2d');

    // Set canvas size (landscape format, good for desktop wallpaper)
    const width = 1920;
    const height = 1080;
    exportCanvas.width = width;
    exportCanvas.height = height;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(1, '#1a0a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add grid pattern
    ctx.strokeStyle = 'rgba(0, 217, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
    }
    for (let i = 0; i < height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
    }

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('APEX RHYTHM', width / 2, 120);

    ctx.fillStyle = '#888888';
    ctx.font = '30px Arial';
    ctx.fillText('NEURAL-SYNC PROTOCOL', width / 2, 170);

    // Username
    ctx.fillStyle = '#00d9ff';
    ctx.font = 'bold 60px Arial';
    ctx.fillText(userData.username.toUpperCase(), width / 2, 260);

    ctx.fillStyle = '#555555';
    ctx.font = '25px Arial';
    ctx.fillText(`${userData.genre} • ${userData.intensity}`, width / 2, 310);

    // Peak Window Box
    const boxY = 380;
    ctx.fillStyle = 'rgba(255, 0, 128, 0.1)';
    ctx.strokeStyle = '#ff0080';
    ctx.lineWidth = 3;
    const boxWidth = 600;
    const boxHeight = 150;
    ctx.fillRect((width - boxWidth) / 2, boxY, boxWidth, boxHeight);
    ctx.strokeRect((width - boxWidth) / 2, boxY, boxWidth, boxHeight);

    ctx.fillStyle = '#ff0080';
    ctx.font = '25px Arial';
    ctx.fillText('PEAK PERFORMANCE WINDOW', width / 2, boxY + 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 70px Arial';
    const peakStart = formatTime(userData.optimalWindow.start);
    const peakEnd = formatTime(userData.optimalWindow.end);
    ctx.fillText(`${peakStart} - ${peakEnd}`, width / 2, boxY + 110);

    // Draw mini rhythm chart
    const chartY = 580;
    const chartHeight = 200;
    const chartWidth = 1200;
    const chartX = (width - chartWidth) / 2;

    // Chart bars
    const wake = parseTime(userData.wakeTime);
    userData.cycles.forEach((cycle, index) => {
        const barWidth = chartWidth / (userData.cycles.length * 1.5);
        const x = chartX + (index * barWidth * 1.5);
        const barHeight = (cycle.performance / 150) * chartHeight;
        const y = chartY + chartHeight - barHeight;

        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00d9ff';
        ctx.fillStyle = '#00d9ff';
        ctx.fillRect(x, y, barWidth, barHeight);
    });

    ctx.shadowBlur = 0;

    // Chart label
    ctx.fillStyle = '#666666';
    ctx.font = '22px Arial';
    ctx.fillText('NEURAL ENGAGEMENT CURVE', width / 2, chartY + chartHeight + 40);

    ctx.textAlign = 'left';
    ctx.fillText(`WAKE: ${userData.wakeTime}`, chartX, chartY + chartHeight + 40);
    ctx.textAlign = 'right';
    ctx.fillText(`SLEEP: ${userData.sleepTime}`, chartX + chartWidth, chartY + chartHeight + 40);
    ctx.textAlign = 'center';

    // Key Phases
    const phasesY = 870;
    ctx.fillStyle = '#00d9ff';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('KEY PHASES', width / 2, phasesY);

    ctx.fillStyle = '#cccccc';
    ctx.font = '24px Arial';
    const phases = [
        '90-MIN DEEP GAMING • 20-MIN NEURAL REST',
        'PEAK FOCUS & REACTION TIME',
        'OPTIMAL HORMONE SYNCHRONIZATION'
    ];

    phases.forEach((phase, index) => {
        ctx.fillText(phase, width / 2, phasesY + 45 + (index * 35));
    });

    // Footer
    ctx.fillStyle = '#444444';
    ctx.font = '20px Arial';
    ctx.fillText('APEXRHYTHM BIO-SYNC PROTOCOL V4.0.2', width / 2, height - 40);

    // Convert to image and download
    exportCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `apex-rhythm-${userData.username.toLowerCase()}-protocol.png`;
        link.click();
        URL.revokeObjectURL(url);
    });
}

function resetApp() {
    // Clear data
    userData = {
        username: '',
        wakeTime: '',
        sleepTime: '',
        genre: '',
        intensity: '',
        peakWindows: [],
        cycles: []
    };

    // Reset form
    document.getElementById('username').value = '';
    document.getElementById('wakeTime').value = '06:00';
    document.getElementById('sleepTime').value = '22:30';
    document.getElementById('gameGenre').value = 'FPS';
    document.getElementById('intensity').value = 'Casual';

    // Show setup screen
    document.getElementById('resultsScreen').classList.remove('active');
    document.getElementById('setupScreen').classList.add('active');
}

// Helper functions
function parseTime(timeStr) {
    // Convert HH:MM to minutes from midnight
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function formatTime(minutes) {
    // Convert minutes from midnight to HH:MM
    let totalMinutes = Math.round(minutes);
    
    // Handle wrap around midnight
    while (totalMinutes >= 1440) {
        totalMinutes -= 1440;
    }
    while (totalMinutes < 0) {
        totalMinutes += 1440;
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
