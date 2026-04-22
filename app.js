// ============================
// DATA MANAGEMENT
// ============================

// Category colors
const CATEGORY_COLORS = {
    Waste: '#f59e0b',
    Water: '#3b82f6',
    Road: '#6b7280',
    Safety: '#ef4444',
    Health: '#10b981',
    Other: '#8b5cf6'
};

// Data storage object
let appData = {
    reports: [],
    categoryCounts: {
        Waste: 0,
        Water: 0,
        Road: 0,
        Safety: 0,
        Health: 0,
        Other: 0
    },
    isAdminLoggedIn: false
};
 
const OPENAI_API_KEY = 'https://api.openai.com/v1/chat/completions';

// ============================
// LOCAL STORAGE FUNCTIONS
// ============================

function loadData() {
    const savedReports = localStorage.getItem('octoReports');
    const savedCounts = localStorage.getItem('octoCategoryCounts');
    const adminAuth = localStorage.getItem('octoAdminAuth');

    if (savedReports) {
        appData.reports = JSON.parse(savedReports);
    }

    if (savedCounts) {
        appData.categoryCounts = JSON.parse(savedCounts);
    }

    if (adminAuth === 'true') {
        appData.isAdminLoggedIn = true;
    }
}

function saveData() {
    localStorage.setItem('octoReports', JSON.stringify(appData.reports));
    localStorage.setItem('octoCategoryCounts', JSON.stringify(appData.categoryCounts));
}

// ============================
// PAGE NAVIGATION
// ============================

function showPage(pageId) {
  
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));

   
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

 
    if (pageId === 'report-page') {
        updateReportPageDisplay();
    } else if (pageId === 'admin-dashboard') {
        if (!appData.isAdminLoggedIn) {
            showPage('admin-login');
            return;
        }
        updateAdminDashboard();
    }

    
    window.scrollTo(0, 0);
}

// ============================
// AI CATEGORIZATION
// ============================

async function categorizeWithOpenAI(text) {
    const prompt = `Categorize the following problem into exactly one of these categories: Waste, Water, Road, Safety, Health, Other.

Problem: "${text}"

Respond with only the category name.`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that categorizes community problems. Always respond with only one word: either Waste, Water, Road, Safety, Health, or Other.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 10
            })
        });

        if (!response.ok) {
            throw new Error('OpenAI API request failed');
        }

        const data = await response.json();
        const category = data.choices[0].message.content.trim();

     
        if (Object.keys(appData.categoryCounts).includes(category)) {
            return category;
        } else {
            return 'Other';
        }
    } catch (error) {
        console.error('OpenAI API Error:', error);
       
        return categorizeWithKeywords(text);
    }
}

// Fallback keyword-based categorization
function categorizeWithKeywords(text) {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('garbage') || lowerText.includes('trash') || lowerText.includes('waste') ||
        lowerText.includes('dump') || lowerText.includes('litter') || lowerText.includes('rubbish')) {
        return 'Waste';
    } else if (lowerText.includes('water') || lowerText.includes('leak') || lowerText.includes('pipe') ||
        lowerText.includes('drainage') || lowerText.includes('flood') || lowerText.includes('supply')) {
        return 'Water';
    } else if (lowerText.includes('road') || lowerText.includes('pothole') || lowerText.includes('street') ||
        lowerText.includes('highway') || lowerText.includes('traffic') || lowerText.includes('pavement')) {
        return 'Road';
    } else if (lowerText.includes('safety') || lowerText.includes('crime') || lowerText.includes('danger') ||
        lowerText.includes('theft') || lowerText.includes('security') || lowerText.includes('violence') ||
        lowerText.includes('light') || lowerText.includes('dark')) {
        return 'Safety';
    } else if (lowerText.includes('health') || lowerText.includes('hospital') || lowerText.includes('clinic') ||
        lowerText.includes('doctor') || lowerText.includes('medical') || lowerText.includes('disease') ||
        lowerText.includes('sick') || lowerText.includes('hygiene')) {
        return 'Health';
    } else {
        return 'Other';
    }
}

// ============================
// REPORT SUBMISSION
// ============================

async function submitReport(event) {
    event.preventDefault();

    const problemText = document.getElementById('problem').value.trim();
    const city = document.getElementById('city').value.trim();
    
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');
    const loadingDiv = document.getElementById('loading-message');
    const submitBtn = document.getElementById('submit-btn');
 
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    loadingDiv.style.display = 'none';
 
    if (!problemText) {
        errorDiv.textContent = 'Please describe the problem';
        errorDiv.style.display = 'block';
        return;
    }

   
    loadingDiv.style.display = 'block';
    submitBtn.disabled = true;

    try {
    
        const category = await categorizeWithOpenAI(problemText);

     
        const report = {
            id: Date.now().toString(),
            text: problemText,
            category: category,
            city: city || null,
            timestamp: new Date().toISOString()
        };

        appData.reports.unshift(report);
        appData.categoryCounts[category]++;

        // Save to localStorage
        saveData();

        // Show success
        loadingDiv.style.display = 'none';
        successDiv.innerHTML = `✅ Successfully submitted!<br>Category detected: <strong>${category}</strong>`;
        successDiv.style.display = 'block';

        // Update display
        updateReportPageDisplay();

        // Reset form after 3 seconds
        setTimeout(() => {
            document.getElementById('problem').value = '';
            document.getElementById('city').value = '';
            successDiv.style.display = 'none';
        }, 3000);

    } catch (error) {
        loadingDiv.style.display = 'none';
        errorDiv.textContent = 'Failed to submit report. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
    }
}

// ============================
// REPORT PAGE DISPLAY
// ============================

let reportChart = null;

function updateReportPageDisplay() {
 
    const totalReports = Object.values(appData.categoryCounts).reduce((sum, count) => sum + count, 0);
    document.getElementById('total-reports').textContent = totalReports;
 
    const categoryCountsDiv = document.getElementById('category-counts');
    categoryCountsDiv.innerHTML = '';

    Object.entries(appData.categoryCounts).forEach(([category, count]) => {
        const div = document.createElement('div');
        div.className = 'category-count-item';
        div.style.borderLeftColor = CATEGORY_COLORS[category];
        div.innerHTML = `
            <div class="category-count-number">${count}</div>
            <div class="category-count-label">${category}</div>
        `;
        categoryCountsDiv.appendChild(div);
    });

   
    updateReportChart();
}

function updateReportChart() {
    const canvas = document.getElementById('category-chart');
    const ctx = canvas.getContext('2d');

    const chartData = {
        labels: Object.keys(appData.categoryCounts),
        datasets: [{
            label: 'Reports',
            data: Object.values(appData.categoryCounts),
            backgroundColor: Object.keys(appData.categoryCounts).map(cat => CATEGORY_COLORS[cat]),
            borderWidth: 0,
            borderRadius: 8
        }]
    };

    if (reportChart) {
        reportChart.destroy();
    }

    reportChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'white',
                    titleColor: '#111827',
                    bodyColor: '#6B7280',
                    borderColor: '#E5E7EB',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// ============================
// ADMIN LOGIN
// ============================

function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

    errorDiv.style.display = 'none';

    if (!username || !password) {
        errorDiv.textContent = 'Please enter both username and password';
        errorDiv.style.display = 'block';
        return;
    }
 
    if (username === 'admin' && password === 'admin123') {
        appData.isAdminLoggedIn = true;
        localStorage.setItem('octoAdminAuth', 'true');
        showPage('admin-dashboard');
    } else {
        errorDiv.textContent = 'Invalid credentials. Please try again.';
        errorDiv.style.display = 'block';
    }
}

function logout() {
    appData.isAdminLoggedIn = false;
    localStorage.removeItem('octoAdminAuth');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
 
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }

    showPage('landing-page');
}

// ============================
// ADMIN DASHBOARD
// ============================

let adminBarChart = null;
let adminPieChart = null;

function updateAdminDashboard() {
    const totalReports = Object.values(appData.categoryCounts).reduce((sum, count) => sum + count, 0);

    // Update metrics
    document.getElementById('admin-total-reports').textContent = totalReports;

    // Top category
    const topCategory = Object.entries(appData.categoryCounts).reduce((max, [cat, count]) =>
        count > max.count ? { category: cat, count } : max
    , { category: 'None', count: 0 });

    document.getElementById('admin-top-category').textContent = topCategory.category;
    document.getElementById('admin-top-count').textContent = `${topCategory.count} reports`;

    // Latest report
    if (appData.reports.length > 0) {
        const latest = new Date(appData.reports[0].timestamp);
        document.getElementById('admin-latest-date').textContent = 'Today';
        document.getElementById('admin-latest-time').textContent = latest.toLocaleTimeString();
    } else {
        document.getElementById('admin-latest-date').textContent = '-';
        document.getElementById('admin-latest-time').textContent = 'No reports';
    }
 
    updateAdminCharts();
 
    updateCategoryDetails();
 
    updateRecentReports();
}

function updateAdminCharts() {
    const totalReports = Object.values(appData.categoryCounts).reduce((sum, count) => sum + count, 0);

    // Bar Chart
    const barCanvas = document.getElementById('admin-bar-chart');
    const barCtx = barCanvas.getContext('2d');

    const barData = {
        labels: Object.keys(appData.categoryCounts),
        datasets: [{
            label: 'Reports',
            data: Object.values(appData.categoryCounts),
            backgroundColor: Object.keys(appData.categoryCounts).map(cat => CATEGORY_COLORS[cat]),
            borderWidth: 0,
            borderRadius: 8
        }]
    };

    if (adminBarChart) {
        adminBarChart.destroy();
    }

    adminBarChart = new Chart(barCtx, {
        type: 'bar',
        data: barData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });

    // Pie Chart
    const pieCanvas = document.getElementById('admin-pie-chart');
    const pieCtx = pieCanvas.getContext('2d');

    const pieData = {
        labels: Object.keys(appData.categoryCounts).filter(cat => appData.categoryCounts[cat] > 0),
        datasets: [{
            data: Object.values(appData.categoryCounts).filter(count => count > 0),
            backgroundColor: Object.keys(appData.categoryCounts)
                .filter(cat => appData.categoryCounts[cat] > 0)
                .map(cat => CATEGORY_COLORS[cat]),
            borderWidth: 2,
            borderColor: '#fff'
        }]
    };

    if (adminPieChart) {
        adminPieChart.destroy();
    }

    if (totalReports > 0) {
        adminPieChart = new Chart(pieCtx, {
            type: 'pie',
            data: pieData,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

function updateCategoryDetails() {
    const totalReports = Object.values(appData.categoryCounts).reduce((sum, count) => sum + count, 0);
    const detailsDiv = document.getElementById('category-details');
    detailsDiv.innerHTML = '';

    Object.entries(appData.categoryCounts).forEach(([category, count]) => {
        const percentage = totalReports > 0 ? ((count / totalReports) * 100).toFixed(1) : '0';

        const div = document.createElement('div');
        div.className = 'category-detail-card';
        div.style.borderLeftColor = CATEGORY_COLORS[category];
        div.innerHTML = `
            <div class="category-detail-header">
                <div class="category-detail-name">${category}</div>
                <div class="category-detail-percentage">${percentage}%</div>
            </div>
            <div class="category-detail-count">${count}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%; background-color: ${CATEGORY_COLORS[category]}"></div>
            </div>
        `;
        detailsDiv.appendChild(div);
    });
}

function updateRecentReports() {
    const reportsDiv = document.getElementById('recent-reports');
    reportsDiv.innerHTML = '';

    if (appData.reports.length === 0) {
        reportsDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <p>No reports submitted yet</p>
            </div>
        `;
        return;
    }

    const recentReports = appData.reports.slice(0, 10);
    recentReports.forEach(report => {
        const date = new Date(report.timestamp);
        const div = document.createElement('div');
        div.className = 'report-item';
        div.innerHTML = `
            <div class="report-header">
                <div class="report-tags">
                    <span class="report-category-badge" style="background-color: ${CATEGORY_COLORS[report.category]}">
                        ${report.category}
                    </span>
                    ${report.city ? `<span class="report-city">📍 ${report.city}</span>` : ''}
                </div>
                <span class="report-time">${date.toLocaleString()}</span>
            </div>
            <p class="report-text">${report.text}</p>
        `;
        reportsDiv.appendChild(div);
    });
}

// ============================
// RESET FUNCTIONALITY
// ============================

function confirmReset() {
    document.getElementById('reset-modal').classList.add('active');
}

function closeResetModal() {
    document.getElementById('reset-modal').classList.remove('active');
}

function resetAllData() {
    appData.reports = [];
    appData.categoryCounts = {
        Waste: 0,
        Water: 0,
        Road: 0,
        Safety: 0,
        Health: 0,
        Other: 0
    };

    saveData();
    updateAdminDashboard();
    closeResetModal();
}

// ============================
// INITIALIZATION
// ============================

document.addEventListener('DOMContentLoaded', function() {
    
    loadData();
 
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
        reportForm.addEventListener('submit', submitReport);
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
 
    showPage('landing-page');
});
