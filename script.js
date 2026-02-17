const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const grid = document.getElementById('translationGrid');
const searchInput = document.getElementById('searchInput');

let translations = []; 

async function loadData() {
    try {
        // Adding './' tells the browser: "Look in the exact same folder as index.html"
        const response = await fetch('./data.json'); 
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        translations = await response.json();
        displayTranslations(); 
        console.log("Data loaded successfully!");
    } catch (error) {
        console.error("Fetch Error:", error);
        grid.innerHTML = `<p style="color:red;">404: data.json not found in this directory.</p>`;
    }
}

// 2. Display Cards
function displayTranslations(filter = "", category = "All") {
    grid.innerHTML = "";
    
    const filtered = translations.filter(item => {
        const matchesSearch = item.jp.includes(filter) || 
                              item.en.toLowerCase().includes(filter.toLowerCase());
        const matchesCategory = category === "All" || item.tag === category;
        return matchesSearch && matchesCategory;
    });

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-top">
                <h3>${item.jp}</h3>
                <button class="copy-btn" data-text="${item.en}">📋 コピー</button>
            </div>
            <div class="en-text">${item.en}</div>
            <div class="context">${item.context}</div>
        `;
        grid.appendChild(card);
    });
}

// 3. Event Listeners (Fixes CSP errors)

// Theme Toggle
themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
});

// Category Filtering
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-tag');
        searchInput.value = "";
        displayTranslations("", tag);
    });
});

// Search
searchInput.addEventListener('input', (e) => {
    displayTranslations(e.target.value);
});

// Copy logic (Event Delegation)
grid.addEventListener('click', (e) => {
    if (e.target.classList.contains('copy-btn')) {
        const text = e.target.getAttribute('data-text');
        navigator.clipboard.writeText(text).then(() => {
            const originalText = e.target.innerText;
            e.target.innerText = "✅ OK!";
            setTimeout(() => e.target.innerText = originalText, 1500);
        });
    }
});

// Initialize
if (localStorage.getItem('theme') === 'dark') body.classList.add('dark-mode');
loadData();