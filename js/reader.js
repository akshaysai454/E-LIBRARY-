// js/reader.js
// Digital Reader with clean UI, proper page indicator logic, and full search functionality

(function () {
  // Read PDF URL from query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const pdfUrl = urlParams.get('file');

  // Extract filename from URL for download, or use a default
  let pdfFileName = pdfUrl ? pdfUrl.split('/').pop().replace(/%20/g, ' ') : 'document.pdf';

  // UI Elements
  const pdfContainer = document.getElementById('pdfContainer');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const errorOverlay = document.getElementById('errorOverlay');
  const errorMessage = document.getElementById('errorMessage');

  // Check if PDF URL is provided, otherwise show upload UI
  if (!pdfUrl) {
    showUploadUI();
  }

  const downloadBtn = document.getElementById('downloadBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  
  // Navigation controls
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const pageInput = document.getElementById('pageInput');
  const goPageBtn = document.getElementById('goPageBtn');
  const pageIndicator = document.getElementById('pageIndicator');

  // Search controls
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const prevMatchBtn = document.getElementById('prevMatchBtn');
  const nextMatchBtn = document.getElementById('nextMatchBtn');
  const searchResultsSpan = document.getElementById('searchResults');

  let currentScale = 1.5;
  const scaleStep = 0.2;
  const minScale = 0.5;
  const maxScale = 3.0;

  let pdfDoc = null;
  let currentPage = 1;
  let totalPages = 0;
  
  // Search state
  let searchMatches = []; // Array of {pageNum, spanElement, textContent}
  let currentMatchIndex = -1;
  let currentSearchTerm = '';
  let pageTextLayers = {}; // Store text layer references for each page

  // Intersection Observer for automatic page tracking
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1 // Trigger when even a small part is visible
  };

  const observer = new IntersectionObserver((entries) => {
    // Find the most visible page
    let maxRatio = 0;
    let mostVisiblePage = -1;

    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
        maxRatio = entry.intersectionRatio;
        const id = entry.target.id; // page-container-X
        const parts = id.split('-');
        if (parts.length === 3) {
          mostVisiblePage = parseInt(parts[2], 10);
        }
      }
    });

    if (mostVisiblePage > 0 && mostVisiblePage !== currentPage) {
      currentPage = mostVisiblePage;
      updatePageIndicator();
    }
  }, observerOptions);

  // Update page indicator with proper format: Page X of Y
  function updatePageIndicator() {
    if (pageIndicator && totalPages > 0) {
      pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    }
  }

  function showLoading(show) {
      if (loadingOverlay) {
          loadingOverlay.style.display = show ? 'flex' : 'none';
      }
  }

  function showError(msg) {
      if (errorOverlay && errorMessage) {
          errorMessage.textContent = msg;
          errorOverlay.style.display = 'flex';
      } else {
          alert(msg);
      }
      showLoading(false);
  }

  async function renderAllPagesStacked() {
    if (!pdfDoc) return;
    pdfContainer.innerHTML = '';

    // Disconnect old observers
    observer.disconnect();

    // Clear search state
    clearSearchHighlights();
    pageTextLayers = {};

    // Render each page sequentially
    for (let i = 1; i <= totalPages; i++) {
      try {
        await renderPageWithTextLayer(i);
      } catch (error) {
        console.error(`Error rendering page ${i}:`, error);
      }
    }

    // After re-rendering, restore view to current page
    scrollToPage(currentPage);
    
    // Re-apply search if active
    if (currentSearchTerm) {
      performSearch(currentSearchTerm);
    }
  }

  async function renderPageWithTextLayer(pageNum) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: currentScale });

    // Create page container
    const pageContainer = document.createElement('div');
    pageContainer.className = 'page-container';
    pageContainer.id = `page-container-${pageNum}`;
    pageContainer.style.width = viewport.width + 'px';
    pageContainer.style.height = viewport.height + 'px';

    // Create canvas for PDF rendering
    const canvas = document.createElement('canvas');
    canvas.id = `page-${pageNum}`;
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Create text layer div
    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'textLayer';
    textLayerDiv.style.width = viewport.width + 'px';
    textLayerDiv.style.height = viewport.height + 'px';
    // Essential for PDF.js text layer to work correctly
    textLayerDiv.style.setProperty('--scale-factor', currentScale);

    // Append canvas and text layer to container
    pageContainer.appendChild(canvas);
    pageContainer.appendChild(textLayerDiv);
    pdfContainer.appendChild(pageContainer);

    // Add container to observer
    observer.observe(pageContainer);

    // Render PDF page to canvas
    const renderContext = { canvasContext: context, viewport: viewport };
    await page.render(renderContext).promise;

    // Render text layer
    const textContent = await page.getTextContent();
    
    // FIX: Use pdfjsLib.renderTextLayer instead of TextLayerBuilder
    await pdfjsLib.renderTextLayer({
        textContent: textContent,
        container: textLayerDiv,
        viewport: viewport,
        textDivs: []
    }).promise;

    // Store text layer reference for search functionality
    pageTextLayers[pageNum] = textLayerDiv;
  }

  // Scroll to specific page
  function scrollToPage(pageNum) {
    const elem = document.getElementById(`page-container-${pageNum}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function updatePageIndicator() {
    if (pageIndicator) {
      pageIndicator.textContent = `Page ${currentPage} / ${totalPages}`;
    }
    
    // Save progress
    if (currentPage > 0) {
        localStorage.setItem(`reader_progress_${pdfFileName}`, currentPage);
    }
    if (pageInput) {
        pageInput.value = currentPage; // Keep input synced
    }
    updatePageIndicator();
    updateNavigationButtons();
  }

  // ----- Event listeners -----
  
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function () {
        if (!pdfDoc) return;
        // If it's a blob URL (local file), we need to handle it carefully
        // For now, simple download attribute works for both if the browser supports it
        const link = document.createElement('a');
        link.href = pdfUrl || '#';
        link.download = pdfFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
  }

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', function () {
        if (currentScale + scaleStep <= maxScale) {
        currentScale += scaleStep;
        renderAllPagesStacked();
        }
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', function () {
        if (currentScale - scaleStep >= minScale) {
        currentScale -= scaleStep;
        renderAllPagesStacked();
        }
    });
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', function () {
        if (currentPage > 1) {
        currentPage--; 
        scrollToPage(currentPage);
        updatePageIndicator();
        }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', function () {
        if (currentPage < totalPages) {
        currentPage++; 
        scrollToPage(currentPage);
        updatePageIndicator();
        }
    });
  }

  if (goPageBtn && pageInput) {
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
    
    // Also allow Enter key in page input
    pageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            goPageBtn.click();
        }
    });
  }

  // ----- Search functionality -----

  function clearSearchHighlights() {
    searchMatches = [];
    currentMatchIndex = -1;
    // currentSearchTerm = ''; // Don't clear term, allows re-search on zoom

    // Remove highlight classes
    Object.values(pageTextLayers).forEach(textLayer => {
      const spans = textLayer.querySelectorAll('span');
      spans.forEach(span => {
        span.classList.remove('highlight', 'selected');
      });
    });

    updateSearchResults();
  }

  function performSearch(searchTerm) {
    if (!searchTerm || !pdfDoc) {
      clearSearchHighlights();
      currentSearchTerm = '';
      return;
    }

    clearSearchHighlights(); // Clear visual highlights but keep existing match array clean
    searchMatches = []; // Reset matches
    currentSearchTerm = searchTerm.toLowerCase();

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const textLayer = pageTextLayers[pageNum];
      if (!textLayer) continue;

      const spans = textLayer.querySelectorAll('span');
      spans.forEach((span) => {
        const text = span.textContent.toLowerCase();
        if (text.includes(currentSearchTerm)) {
          searchMatches.push({
            pageNum: pageNum,
            span: span,
            text: span.textContent
          });
          span.classList.add('highlight');
        }
      });
    }

    updateSearchResults();

    if (searchMatches.length > 0) {
      currentMatchIndex = 0;
      highlightCurrentMatch();
    }
  }

  function updateSearchResults() {
    if (searchResultsSpan) {
        if (searchMatches.length > 0) {
        searchResultsSpan.textContent = `${currentMatchIndex + 1} / ${searchMatches.length}`;
        } else if (currentSearchTerm) {
        searchResultsSpan.textContent = 'No matches found';
        } else {
        searchResultsSpan.textContent = '';
        }
    }
  }

  function highlightCurrentMatch() {
    if (currentMatchIndex < 0 || currentMatchIndex >= searchMatches.length) return;

    searchMatches.forEach(match => {
      match.span.classList.remove('selected');
    });

    const currentMatch = searchMatches[currentMatchIndex];
    currentMatch.span.classList.add('selected');

    if (currentPage !== currentMatch.pageNum) {
        currentPage = currentMatch.pageNum;
        scrollToPage(currentPage);
        updatePageIndicator();
    } else {
        // If on same page, ensure the element is visible
        currentMatch.span.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    updateSearchResults();
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', function() {
        performSearch(searchInput.value.trim());
    });
  }

  if (searchInput) {
    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
        performSearch(searchInput.value.trim());
        }
    });
    
    searchInput.addEventListener('input', function() {
        if (!searchInput.value.trim()) {
        clearSearchHighlights();
        currentSearchTerm = '';
        }
    });
  }

  if (nextMatchBtn) {
    nextMatchBtn.addEventListener('click', function() {
        if (searchMatches.length === 0) return;
        currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
        highlightCurrentMatch();
    });
  }

  if (prevMatchBtn) {
    prevMatchBtn.addEventListener('click', function() {
        if (searchMatches.length === 0) return;
        currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
        highlightCurrentMatch();
    });
  }

  // Keyboard Shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT') return; // Don't trigger when typing in inputs

    switch(e.key) {
      case 'ArrowLeft':
        if (currentPage > 1) {
          currentPage--;
          scrollToPage(currentPage);
          updatePageIndicator();
        }
        break;
      case 'ArrowRight':
        if (currentPage < totalPages) {
          currentPage++;
          scrollToPage(currentPage);
          updatePageIndicator();
        }
        break;
      case '+':
      case '=':
        if (currentScale + scaleStep <= maxScale) {
          currentScale += scaleStep;
          renderAllPagesStacked();
        }
        break;
      case '-':
        if (currentScale - scaleStep >= minScale) {
          currentScale -= scaleStep;
          renderAllPagesStacked();
        }
        break;
      case 'Home':
        currentPage = 1;
        scrollToPage(currentPage);
        updatePageIndicator();
        break;
      case 'End':
        currentPage = totalPages;
        scrollToPage(currentPage);
        updatePageIndicator();
        break;
      case 'f':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (searchInput) searchInput.focus();
        }
        break;
    }
  });

    // ----- File Upload Logic -----
  function showUploadUI() {
    if (!pdfContainer) return;
    
    pdfContainer.innerHTML = '';
    pdfContainer.style.display = 'flex';
    pdfContainer.style.justifyContent = 'center';
    pdfContainer.style.alignItems = 'center';
    pdfContainer.style.height = '60vh';

    const uploadBox = document.createElement('div');
    uploadBox.style.textAlign = 'center';
    uploadBox.style.padding = '40px';
    uploadBox.style.border = '2px dashed var(--border-color)';
    uploadBox.style.borderRadius = '10px';
    uploadBox.style.background = 'var(--bg-card)';
    
    uploadBox.innerHTML = `
        <h2 style='color:var(--text-heading)'>Open Local PDF</h2>
        <p style='color:var(--text-main); margin-bottom:20px'>Select a PDF file from your device to read</p>
        <input type='file' id='fileInput' accept='.pdf' style='display:none'>
        <button id='uploadTriggerBtn' style='font-size:1.1rem; padding:10px 20px;'>Choose File</button>
    `;

    pdfContainer.appendChild(uploadBox);

    // Event Delegation for dynamically created elements
    uploadBox.addEventListener('click', (e) => {
        if (e.target.id === 'uploadTriggerBtn') {
            const fileInput = document.getElementById('fileInput');
            if (fileInput) fileInput.click();
        }
    });

    // We need to attach the change event listener to the file input
    // Since it's created via innerHTML, we need to find it first
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.type === 'application/pdf') {
                    const fileUrl = URL.createObjectURL(file);
                    // Update global pdfFileName for saving progress
                    pdfFileName = file.name; 
                    document.title = pdfFileName;
                    loadPDF(fileUrl, pdfFileName);
                } else {
                    alert('Please select a valid PDF file.');
                }
            }
        });
    }
  }

  function loadPDF(url, filename) {
    showLoading(true);
    
    // Reset container style
    pdfContainer.style.display = 'block';
    pdfContainer.style.height = 'auto';
    pdfContainer.innerHTML = ''; // Clear upload UI

    // Update title
    document.title = filename;
    // Also update the header if we want to show filename there
    const headerTitle = document.querySelector('.reader-header h1');
    if (headerTitle) headerTitle.textContent = filename;

    // Load PDF
    const loadingTask = pdfjsLib.getDocument({ url: url, withCredentials: false });
    
    loadingTask.onProgress = function(progress) {
        if (progress.total > 0) {
            const percent = (progress.loaded / progress.total * 100).toFixed(0);
            const progressElem = document.getElementById('loadingProgress');
            if (progressElem) {
                progressElem.textContent = `${percent}%`;
            }
        }
    };

    loadingTask.promise
        .then(function (pdf) {
        pdfDoc = pdf;
        totalPages = pdfDoc.numPages;
        
        // Restore progress for local file
        const savedPage = localStorage.getItem('reader_progress_' + filename);
        if (savedPage) {
            currentPage = parseInt(savedPage, 10);
        } else {
            currentPage = 1;
        }

        updatePageIndicator();
        return renderAllPagesStacked();
        })
        .then(() => {
            showLoading(false);
        })
        .catch(function (err) {
            console.error('Error loading PDF:', err);
            showError('Failed to load PDF. ' + err.message);
        });
  }

  // ----- Load PDF -----
  if (pdfUrl) {
      loadPDF(pdfUrl, pdfFileName);
  }
})();
