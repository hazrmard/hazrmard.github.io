import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

// State
let allEntries = [];
let activeFilters = new Set();
let searchQuery = '';
let allExpanded = false;
let isSpaced = false;

// DOM Elements
const container = document.getElementById('timeline-container');
const searchInput = document.getElementById('search-input');
const filtersContainer = document.getElementById('taxonomy-filters');
const bgLayer = document.getElementById('background-layer');
const toggleAllBtn = document.getElementById('toggle-all-btn');
const toggleSpacingBtn = document.getElementById('toggle-spacing-btn');

// Constants for Spacing
const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;
const PIXELS_PER_YEAR = 50;
const MIN_MARGIN = 32; // 2rem approx

// Helpers
function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
}

function splitContent(html) {
    const closingP = '</p>';
    const index = html.indexOf(closingP);
    if (index === -1) {
        return { intro: html, rest: '' };
    }
    return {
        intro: html.slice(0, index + closingP.length),
        rest: html.slice(index + closingP.length)
    };
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

function setActiveItem(item) {
    // Remove active class from all
    document.querySelectorAll('.timeline-item').forEach(el => el.classList.remove('active'));
    // Add active class to current
    item.classList.add('active');
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
           setActiveItem(entry.target);
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
    
    // Track occupied lanes. Each lane contains the end date (Date object) of the last entry in that lane.
    const lanes = [];

    items.forEach((item, index) => {
        const startStr = item.dataset.start;
        const endStr = item.dataset.end;
        const bgColor = item.dataset.bg ? JSON.parse(item.dataset.bg) : null;
        
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
            // Check if this lane is free (last entry in this lane ended before current entry starts)
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
        line.style.backgroundColor = bgColor;
        
        // Add tooltip or title for debug/ux
        line.title = `${item.querySelector('.timeline-header').textContent} (${formatDate(startStr)} - ${formatDate(endStr)})`;

        container.appendChild(line);
    });
}

function render() {
    container.innerHTML = '';
    
    const filtered = allEntries.filter(entry => {
        // Search filter
        const matchesSearch = (entry.header.toLowerCase().includes(searchQuery) || 
                               entry.content.toLowerCase().includes(searchQuery));
        
        // Taxonomy filter
        let matchesFilter = true;
        if (activeFilters.size > 0) {
            const taxes = entry.taxonomies || [];
            const hasMatch = taxes.some(tax => {
                const key = `${tax.name}:${tax.value}`;
                return activeFilters.has(key);
            });
            matchesFilter = hasMatch;
        }
        
        return matchesSearch && matchesFilter;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 2rem;">No entrys found.</p>';
        return;
    }

    filtered.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.dataset.index = index;
        item.dataset.bg = JSON.stringify(entry.bgRender.color || null);
        item.dataset.start = entry.datetime_start;
        item.dataset.end = entry.datetime_end;

        const taxes = entry.taxonomies || [];
        const taxBadges = taxes
            .filter(t => !t.hidden)
            .map(t => `<span class="taxonomy-badge">${t.icon || ''} ${t.value}</span>`)
            .join(' ');

        const dateStr = formatDate(entry.datetime_start);
        const dateEndStr = entry.datetime_end ? ` - ${formatDate(entry.datetime_end)}` : '';

        // Calculate Spacing
        if (index > 0 && isSpaced) {
            const prevDate = new Date(filtered[index - 1].datetime_start);
            const currDate = new Date(entry.datetime_start);
            const diffTime = currDate - prevDate;
            const diffYears = diffTime / MS_PER_YEAR;
            const margin = Math.max(MIN_MARGIN, diffYears * PIXELS_PER_YEAR);
            item.style.marginTop = `${margin}px`;
        } else {
             item.style.marginTop = '';
        }

        const { intro, rest } = splitContent(entry.contentHtml);
        const hasImages = entry.images && entry.images.length > 0;
        const hasExtra = rest.trim().length > 0 || hasImages;
        
        const imagesHtml = hasImages ? 
            `<div class="timeline-images">
                ${entry.images.map(src => `<img src="${src}" alt="${entry.header}" style="max-width:100%; margin-top:10px; border-radius:4px;">`).join('')}
            </div>` : '';

        const detailsHtml = (entry.detailsData || []).map(d => `
            <details class="timeline-details" ${allExpanded ? 'open' : ''}>
                <summary class="timeline-summary-trigger">${d.title}</summary>
                <div class="timeline-extra-content">
                    ${d.html}
                </div>
            </details>
        `).join('');

        item.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-date">${dateStr}${dateEndStr}</div>
            <h3 class="timeline-header">${entry.header}</h3>
            <div class="timeline-meta">${taxBadges}</div>
            <div class="timeline-content">
                <div class="timeline-intro">${intro}</div>
                ${hasExtra ? `
                <details class="timeline-details" ${allExpanded ? 'open' : ''}>
                    <summary class="timeline-summary-trigger">Read more...</summary>
                    <div class="timeline-extra-content">
                        ${rest}
                        ${imagesHtml}
                    </div>
                </details>
                ` : ''}
                ${detailsHtml}
            </div>
        `;

        // Event listeners for details toggling (redraw lines)
        const allDetails = item.querySelectorAll('.timeline-details');
        const header = item.querySelector('.timeline-header');
        
        allDetails.forEach(det => {
            det.addEventListener('toggle', () => {
                requestAnimationFrame(drawDurationLines);
            });
        });
        
        // Click on header toggles the first details block found (if any)
        if (allDetails.length > 0) {
            header.addEventListener('click', () => {
                const first = allDetails[0];
                first.open = !first.open;
            });
        }
        
        // Mouseover/Click to override active state
        item.addEventListener('mouseenter', () => setActiveItem(item));
        item.addEventListener('click', () => setActiveItem(item));

        container.appendChild(item);
        observer.observe(item);
    });
    
    drawDurationLines();
}

function setupFilters() {
    const taxes = new Map(); // Key: "name:value", Value: {name, value, icon}

    allEntries.forEach(entry => {
        const entryTaxes = entry.taxonomies || [];
        entryTaxes.forEach(tax => {
            if (tax && !tax.hidden) {
                const key = `${tax.name}:${tax.value}`;
                if (!taxes.has(key)) {
                    taxes.set(key, tax);
                }
            }
        });
    });

    // Group taxes by name
    const grouped = new Map();
    taxes.forEach((tax, key) => {
        if (!grouped.has(tax.name)) {
            grouped.set(tax.name, []);
        }
        grouped.get(tax.name).push({ key, tax });
    });

    filtersContainer.innerHTML = '';
    
    grouped.forEach((groupItems, groupName) => {
        const groupWrapper = document.createElement('div');
        groupWrapper.className = 'filter-group';
        
        const title = document.createElement('div');
        title.className = 'filter-group-title';
        title.textContent = groupName.charAt(0).toUpperCase() + groupName.slice(1);
        groupWrapper.appendChild(title);
        
        const chipsContainer = document.createElement('div');
        chipsContainer.className = 'filter-group-chips';
        
        // Sort alphabetically by value
        groupItems.sort((a, b) => a.tax.value.localeCompare(b.tax.value));

        groupItems.forEach(({ key, tax }) => {
            const chip = document.createElement('div');
            chip.className = 'filter-chip';
            chip.textContent = `${tax.icon || ''} ${tax.value}`;
            
            if (activeFilters.has(key)) {
                chip.classList.add('active');
            }

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
            chipsContainer.appendChild(chip);
        });
        
        groupWrapper.appendChild(chipsContainer);
        filtersContainer.appendChild(groupWrapper);
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

toggleSpacingBtn.addEventListener('click', () => {
    isSpaced = !isSpaced;
    toggleSpacingBtn.textContent = isSpaced ? 'Spacing: Time-Scaled' : 'Spacing: Compressed';
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
        const taxonomiesResponse = await fetch('./taxonomies.json');
        if (!taxonomiesResponse.ok) throw new Error(`HTTP error! status: ${taxonomiesResponse.status}`);
        const data = await response.json();
        const taxonomies = await taxonomiesResponse.json();

        // Process content (Markdown or File)
        const processedData = await Promise.all(data.map(async (entry) => {
            // Dereference taxonomies
            if (entry.taxonomies) {
                entry.taxonomies = entry.taxonomies.map(taxRef => {
                    return taxonomies[taxRef] || { name: 'unknown', value: taxRef, hidden: false };
                });
            }

            // Content is strictly text now
            // Render HTML using marked
            entry.contentHtml = marked.parse(entry.content || '');
            
            // Update content to be the raw text for search purposes
            entry.content = entry.content || ''; 

            // Process details
            entry.detailsData = [];
            if (entry.details && Array.isArray(entry.details)) {
                entry.detailsData = await Promise.all(entry.details.map(async (url) => {
                    try {
                        const res = await fetch(url);
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const text = await res.text();
                        
                        // Extract title (First H1 #)
                        // Use regex to find first line starting with #
                        const titleMatch = text.match(/^#+\s+(.*)/m);
                        const title = titleMatch ? titleMatch[1].trim() : 'Details';
                        
                        // Render full content
                        const html = marked.parse(text);
                        return { title, html };
                    } catch (e) {
                        console.warn(`Failed to load details from ${url}`, e);
                        return { title: 'Error', html: '<p>Failed to load content.</p>' };
                    }
                }));
            }

            return entry;
        }));

        // Normalize and sort
        allEntries = processedData.sort((a, b) => new Date(a.datetime_start) - new Date(b.datetime_start));
        
        setupFilters();
        render();
    } catch (e) {
        console.error('Failed to init timeline:', e);
        container.innerHTML = `<p style="color:red; text-align:center;">Failed to load timeline data. (${e.message})</p>`;
    }
}

init();