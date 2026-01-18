// js/reader.js
// Loads a PDF from a GitHub raw link using PDF.js, provides download and zoom controls.

(function () {
  // Read PDF URL from query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const pdfUrl = urlParams.get('file');

  // Extract filename from URL for download, or use a default
  const pdfFileName = pdfUrl ? pdfUrl.split('/').pop().replace(/%20/g, ' ') : 'document.pdf';

  // Check if PDF URL is provided
  if (!pdfUrl) {
    document.getElementById('pdfContainer').innerText = 'No PDF file specified.';
    return;
  }

  const pdfContainer = document.getElementById('pdfContainer');
  const downloadBtn = document.getElementById('downloadBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');

  // Shared zoom scale
  let currentScale = 1.5;
  const scaleStep = 0.2;
  const minScale = 0.5;
  const maxScale = 3.0;

  // PDF.js document reference
  let pdfDoc = null;
  let currentPage = 1;
  let totalPages = 0;
  let pageRenderingQueue = Promise.resolve();

  // Search state
  let searchResults = []; // Array of page numbers with matches
  let currentMatchIndex = -1; // Current position in searchResults array

  // Intersection Observer for scroll tracking
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.5 // Trigger when 50% valid
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id; // page-X
        const parts = id.split('-');
        if (parts.length === 2) {
          const num = parseInt(parts[1], 10);
          if (num > 0) {
            currentPage = num;
            updatePageIndicator();
          }
        }
      }
    });
  }, observerOptions);

  // ----- Helper functions -----


  function renderAllPagesStacked() {
    if (!pdfDoc) return;
    pdfContainer.innerHTML = '';

    // Disconnect old observers to avoid memory leaks or duplicate triggers
    observer.disconnect();

    // Render each page sequentially
    let chain = Promise.resolve();
    for (let i = 1; i <= totalPages; i++) {
      chain = chain.then(() => {
        return pdfDoc.getPage(i).then(function (page) {
          const viewport = page.getViewport({ scale: currentScale });

          // Create page container
          const pageContainer = document.createElement('div');
          pageContainer.className = 'page-container';
          pageContainer.id = `page-${i}`;
          pageContainer.style.position = 'relative';
          pageContainer.style.margin = '10px auto';
          pageContainer.style.width = viewport.width + 'px';
          pageContainer.style.height = viewport.height + 'px';

          // Create canvas
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          // Create text layer container
          const textLayerDiv = document.createElement('div');
          textLayerDiv.className = 'textLayer';

          // Add canvas and text layer to container
          pageContainer.appendChild(canvas);
          pageContainer.appendChild(textLayerDiv);
          pdfContainer.appendChild(pageContainer);

          // Add to observer
          observer.observe(pageContainer);

          // Render canvas
          const renderContext = { canvasContext: context, viewport: viewport };
          return page.render(renderContext).promise.then(() => {
            // Render text layer
            return page.getTextContent().then(textContent => {
              // Manual text layer rendering for PDF.js 2.14.305
              textContent.items.forEach(item => {
                const tx = pdfjsLib.Util.transform(
                  viewport.transform,
                  item.transform
                );
                const span = document.createElement('span');
                span.textContent = item.str;
                span.style.left = tx[4] + 'px';
                span.style.top = (tx[5] - item.height) + 'px';
                span.style.fontSize = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]) + 'px';
                span.style.fontFamily = item.fontName;
                textLayerDiv.appendChild(span);
              });
            });
          });
        });
      });
    }

    chain.then(() => {
      // After re-rendering (e.g. zoom), restore view to current page
      scrollToPage(currentPage);
    });
  }

  function scrollToPage(pageNum) {
    const elem = document.getElementById(`page-${pageNum}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function updatePageIndicator() {
    const indicator = document.getElementById('pageIndicator');
    if (indicator) {
      indicator.textContent = `Page ${currentPage} / ${totalPages}`;
    }
  }

  // ----- Event listeners -----
  downloadBtn.addEventListener('click', function () {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = pdfFileName;
    link.click();
  });

  zoomInBtn.addEventListener('click', function () {
    if (currentScale + scaleStep <= maxScale) {
      currentScale += scaleStep;
      renderAllPagesStacked();
    }
  });

  zoomOutBtn.addEventListener('click', function () {
    if (currentScale - scaleStep >= minScale) {
      currentScale -= scaleStep;
      renderAllPagesStacked();
    }
  });

  // Previous and Next page buttons
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');

  prevPageBtn.addEventListener('click', function () {
    if (currentPage > 1) {
      currentPage--; // Explicitly change pages
      scrollToPage(currentPage);
      // Indicator updates via observer automatically, but good to force it in case of small scroll
      updatePageIndicator();
    }
  });

  nextPageBtn.addEventListener('click', function () {
    if (currentPage < totalPages) {
      currentPage++; // Explicitly change pages
      scrollToPage(currentPage);
      updatePageIndicator();
    }
  });

  // Page jump input and button
  const pageInput = document.getElementById('pageInput');
  const goPageBtn = document.getElementById('goPageBtn');

  goPageBtn.addEventListener('click', function () {
    const pageNum = parseInt(pageInput.value, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      currentPage = pageNum;
      scrollToPage(currentPage);
      updatePageIndicator();
    } else {
      alert("Please enter a valid page number between 1 and " + totalPages);
    }
  });

  // ----- Search functionality (Rebuilt) -----
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const prevMatchBtn = document.getElementById('prevMatchBtn');
  const nextMatchBtn = document.getElementById('nextMatchBtn');
  const searchResultsSpan = document.getElementById('searchResults');

  // Search State
  let matchedElements = []; // Stores { element: DOMNode, page: number }
  let currentMatchIdx = -1;

  function clearHighlights() {
    document.querySelectorAll('.highlight').forEach(el => {
      // Check if this is a positioning span (direct child of textLayer)
      if (el.parentElement.classList.contains('textLayer')) {
        el.classList.remove('highlight');
        el.classList.remove('active');
      } else {
        // It's a nested highlight word - unwrap it
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent), el);
          parent.normalize();
        }
      }
    });
    matchedElements = [];
    currentMatchIdx = -1;
    searchResultsSpan.textContent = '';
  }

  function searchInPDF() {
    clearHighlights();

    const rawQuery = searchInput.value.trim();
    if (!rawQuery) return;

    const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapeRegExp(rawQuery), 'gi');

    // Get all text spans from the text layers of all pages
    const allSpans = document.querySelectorAll('.textLayer span');

    // Find matches
    allSpans.forEach(span => {
      const text = span.textContent;
      if (regex.test(text)) {
        // Find which page this span belongs to
        const pageContainer = span.closest('.page-container');
        let pageNum = 1;
        if (pageContainer && pageContainer.id) {
          pageNum = parseInt(pageContainer.id.split('-')[1], 10);
        }

        // Replace text content with highlighted HTML
        span.innerHTML = text.replace(regex, (match) => `<span class="highlight">${match}</span>`);

        // Capture the NEWLY created highlight elements for navigation
        const newHighlights = span.querySelectorAll('.highlight');
        newHighlights.forEach(hl => {
          matchedElements.push({
            element: hl,
            page: pageNum
          });
        });
      }
    });

    // Update UI
    if (matchedElements.length > 0) {
      currentMatchIdx = 0;
      updateMatchIndicator();
      highlightActiveMatch();
    } else {
      searchResultsSpan.textContent = 'No matches found';
    }
  }

  function updateMatchIndicator() {
    searchResultsSpan.textContent = `Match ${currentMatchIdx + 1} / ${matchedElements.length}`;
  }

  function highlightActiveMatch() {
    // Clear previous active highlight
    document.querySelectorAll('.highlight.active').forEach(el => el.classList.remove('active'));

    const match = matchedElements[currentMatchIdx];
    if (match) {
      match.element.classList.add('active');

      // Scroll the MATCH (span) into view, not just the page
      match.element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });

      // Update current page variable to stay in sync
      currentPage = match.page;
      updatePageIndicator();
    }
  }

  function goToNextMatch() {
    if (matchedElements.length === 0) return;
    currentMatchIdx++;
    if (currentMatchIdx >= matchedElements.length) {
      currentMatchIdx = 0; // Wrap to start
    }
    updateMatchIndicator();
    highlightActiveMatch();
  }

  function goToPrevMatch() {
    if (matchedElements.length === 0) return;
    currentMatchIdx--;
    if (currentMatchIdx < 0) {
      currentMatchIdx = matchedElements.length - 1; // Wrap to end
    }
    updateMatchIndicator();
    highlightActiveMatch();
  }

  // Event listeners for search
  searchBtn.addEventListener('click', searchInPDF);

  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      if (matchedElements.length > 0) {
        goToNextMatch();
      } else {
        searchInPDF();
      }
    }
  });

  nextMatchBtn.addEventListener('click', goToNextMatch);
  prevMatchBtn.addEventListener('click', goToPrevMatch);

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', function (e) {
    // Ctrl + F (Focus search)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      searchInput.focus();
    }
    // Esc (Clear search)
    if (e.key === 'Escape') {
      searchInput.value = '';
      clearHighlights();
      searchInput.blur();
    }
  });


  // ----- Load PDF -----
  const loadingTask = pdfjsLib.getDocument({ url: pdfUrl, withCredentials: false });
  loadingTask.promise
    .then(function (pdf) {
      pdfDoc = pdf; // store reference for zoom rendering
      totalPages = pdfDoc.numPages;
      renderAllPagesStacked();
    })
    .catch(function (err) {
      console.error('Error loading PDF (possible CORS issue):', err);
      pdfContainer.innerText = 'Failed to load PDF.';
    });
})();
