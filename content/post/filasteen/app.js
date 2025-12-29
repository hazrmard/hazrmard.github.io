// State
let allEvents = [];
let activeFilters = new Set();
let searchQuery = '';
let allExpanded = false;

// DOM Elements
const container = document.getElementById('timeline-container');
const searchInput = document.getElementById('search-input');
const filtersContainer = document.getElementById('taxonomy-filters');
const bgLayer = document.getElementById('background-layer');
const toggleAllBtn = document.getElementById('toggle-all-btn');

// Helpers
function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
}

// Adjust color brightness for duration lines
function adjustColor(color, amount) {
    return color; // Simple pass-through for now, can implement darkening if needed
}

// Intersection Observer for active state & background
const observerOptions = {
    root: null,
    rootMargin: '-40% 0px -40% 0px', // Activate when element is in the middle 20% of screen
    threshold: 0
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Remove active class from all
            document.querySelectorAll('.timeline-item').forEach(el => el.classList.remove('active'));
            // Add active class to current
            entry.target.classList.add('active');
            
            // Update background
            try {
                const bgData = JSON.parse(entry.target.dataset.bg);
                if (bgData) {
                    bgLayer.style.backgroundColor = bgData;
                } else {
                    bgLayer.style.backgroundColor = 'transparent';
                }
            } catch (e) {
                console.error('Error parsing bg data', e);
            }
        }
    });
}, observerOptions);

function drawDurationLines() {
    // Clear existing lines
    document.querySelectorAll('.duration-line').forEach(el => el.remove());

    const items = Array.from(document.querySelectorAll('.timeline-item'));
    if (items.length === 0) return;

    // Palette for distinct colors
    const palette = ['#e57373', '#81c784', '#64b5f6', '#f06292', '#ffb74d', '#4db6ac', '#ba68c8'];
    
    // Track occupied lanes. Each lane contains the end date (Date object) of the last event in that lane.
    const lanes = [];

    items.forEach((item, index) => {
        const startStr = item.dataset.start;
        const endStr = item.dataset.end;
        
        if (!startStr || !endStr || endStr === 'null') return;

        const startDate = new Date(startStr);
        const endDate = new Date(endStr);
        
        // Find end point
        let nextItemIndex = -1;
        for (let i = index + 1; i < items.length; i++) {
            const nextStart = new Date(items[i].dataset.start);
            if (nextStart > endDate) {
                nextItemIndex = i;
                break;
            }
        }

        const startTop = item.offsetTop + 8; // Offset to align with dot center (approx)
        let endTop;

        if (nextItemIndex !== -1) {
             endTop = items[nextItemIndex].offsetTop;
        } else {
            const lastItem = items[items.length - 1];
            endTop = lastItem.offsetTop + lastItem.offsetHeight;
        }

        const height = endTop - startTop;
        if (height <= 0) return;

        // Assign Lane
        let assignedLane = -1;
        for (let i = 0; i < lanes.length; i++) {
            // Check if this lane is free (last event in this lane ended before current event starts)
            // We use a small buffer if needed, but strict comparison is fine
            if (lanes[i] <= startDate) {
                assignedLane = i;
                lanes[i] = endDate;
                break;
            }
        }
        
        if (assignedLane === -1) {
            assignedLane = lanes.length;
            lanes.push(endDate);
        }

        const line = document.createElement('div');
        line.className = 'duration-line';
        line.style.top = `${startTop}px`;
        line.style.height = `${height}px`;
        
        // Calculate dynamic left offset
        // Base offset is just to the right of the vertical border.
        // Item padding-left is 2rem (32px).
        // Border is at 0 (relative to item content box? No, relative to item box).
        // Let's assume the border is the anchor.
        // We want to start slightly offset from the border.
        // Lane width: 8px, Gap: 4px.
        const laneWidth = 8;
        const laneGap = 4;
        const baseOffset = 6; // Start 6px to the right of the border
        
        // Position relative to the ITEM, but line is appended to CONTAINER.
        // Item.offsetLeft is relative to CONTAINER (assuming container is positioned).
        const leftPos = item.offsetLeft + baseOffset + (assignedLane * (laneWidth + laneGap));
        
        line.style.left = `${leftPos}px`;
        
        // Color
        line.style.backgroundColor = palette[assignedLane % palette.length];
        
        // Add tooltip or title for debug/ux
        line.title = `${item.querySelector('.timeline-header').textContent} (${formatDate(startStr)} - ${formatDate(endStr)})`;

        container.appendChild(line);
    });
}

function render() {
    container.innerHTML = '';
    
    const filtered = allEvents.filter(event => {
        // Search filter
        const matchesSearch = (event.header.toLowerCase().includes(searchQuery) || 
                               event.content.toLowerCase().includes(searchQuery));
        
        // Taxonomy filter
        let matchesFilter = true;
        if (activeFilters.size > 0) {
            const taxes = event.taxonomies || [];
            const hasMatch = taxes.some(tax => {
                const key = `${tax.name}:${tax.value}`;
                return activeFilters.has(key);
            });
            matchesFilter = hasMatch;
        }
        
        return matchesSearch && matchesFilter;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 2rem;">No events found.</p>';
        return;
    }

    filtered.forEach((event, index) => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.dataset.index = index;
        item.dataset.bg = JSON.stringify(event.bgRender);
        item.dataset.start = event.datetime_start;
        item.dataset.end = event.datetime_end;

        const taxes = event.taxonomies || [];
        const taxBadges = taxes
            .filter(t => !t.hidden)
            .map(t => `<span class="taxonomy-badge">${t.icon || ''} ${t.value}</span>`)
            .join(' ');

        const dateStr = formatDate(event.datetime_start);
        const dateEndStr = event.datetime_end ? ` - ${formatDate(event.datetime_end)}` : '';

        item.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-date">${dateStr}${dateEndStr}</div>
            <h3 class="timeline-header">${event.header}</h3>
            <div class="timeline-meta">${taxBadges}</div>
            <div class="timeline-content ${allExpanded ? '' : 'collapsed'}">
                ${event.content}
                ${event.images && event.images.length > 0 ? 
                    `<div class="timeline-images">
                        ${event.images.map(src => `<img src="${src}" alt="${event.header}" style="max-width:100%; margin-top:10px; border-radius:4px;">`).join('')}
                    </div>` 
                : ''}
            </div>
        `;

        // Click on header to toggle collapse for single item
        const header = item.querySelector('.timeline-header');
        const content = item.querySelector('.timeline-content');
        header.addEventListener('click', () => {
            content.classList.toggle('collapsed');
            requestAnimationFrame(drawDurationLines);
        });

        container.appendChild(item);
        observer.observe(item);
    });
    
    drawDurationLines();
}

function setupFilters() {
    const taxes = new Map(); // Key: "name:value", Value: {name, value, icon}

    allEvents.forEach(event => {
        const eventTaxes = event.taxonomies || [];
        eventTaxes.forEach(tax => {
            if (tax && !tax.hidden) {
                const key = `${tax.name}:${tax.value}`;
                if (!taxes.has(key)) {
                    taxes.set(key, tax);
                }
            }
        });
    });

    filtersContainer.innerHTML = '';
    taxes.forEach((tax, key) => {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        chip.textContent = `${tax.icon || ''} ${tax.value}`;
        chip.addEventListener('click', () => {
            if (activeFilters.has(key)) {
                activeFilters.delete(key);
                chip.classList.remove('active');
            } else {
                activeFilters.add(key);
                chip.classList.add('active');
            }
            render();
        });
        filtersContainer.appendChild(chip);
    });
}

// Event Listeners
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    render();
});

toggleAllBtn.addEventListener('click', () => {
    allExpanded = !allExpanded;
    toggleAllBtn.textContent = allExpanded ? 'Collapse All' : 'Expand All';
    render();
});

window.addEventListener('resize', () => {
    drawDurationLines();
});

// Init
async function init() {
    try {
        const response = await fetch('./data.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        // Normalize and sort
        allEvents = data.sort((a, b) => new Date(a.datetime_start) - new Date(b.datetime_start));
        
        setupFilters();
        render();
    } catch (e) {
        console.error('Failed to init timeline:', e);
        container.innerHTML = `<p style="color:red; text-align:center;">Failed to load timeline data. (${e.message})</p>`;
    }
}

init();