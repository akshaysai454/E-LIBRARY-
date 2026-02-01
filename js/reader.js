// js/reader.js
// Simple PDF reader with working text search

(function () {
  console.log('PDF Reader starting...');
  
  // PDF URL
  const pdfUrl = 'https://raw.githubusercontent.com/akshaysai454/E-LIBRARY-/main/FWD%20QB%20MID%202%20Descriptive%20(1).pdf';
  const pdfFileName = 'sample-book.pdf';

  // Get DOM elements
  const pdfContainer = document.getElementById('pdfContainer');
  const downloadBtn = document.getElementById('downloadBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const pdfSearchInput = document.getElementById('pdfSearchInput');
  const searchInPdfBtn = document.getElementById('searchInPdfBtn');
  const prevSearchBtn = document.getElementById('prevSearchBtn');
  const nextSearchBtn = document.getElementById('nextSearchBtn');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const searchResults = document.getElementById('searchResults');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const pageInput = document.getElementById('pageInput');
  const goPageBtn = document.getElementById('goPageBtn');

  // Check if elements exist
  if (!pdfContainer) {
    console.error('pdfContainer not found');
    return;
  }

  // Variables
  let currentScale = 1.5;
  const scaleStep = 0.2;
  const minScale = 0.5;
  const maxScale = 3.0;

  let pdfDoc = null;
  let currentPage = 1;
  let totalPages = 0;
  let pageTextData = []; // Store text data for each page
  let searchMatches = [];
  let currentMatchIndex = -1;

  // Initialize
  async function init() {
    try {
      console.log('Loading PDF from:', pdfUrl);
      pdfContainer.innerHTML = '<div style="text-align: center; padding: 50px;">Loading PDF...</div>';
      
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      pdfDoc = await loadingTask.promise;
      totalPages = pdfDoc.numPages;
      
      console.log('PDF loaded successfully, total pages:', totalPages);
      
      await renderAllPages();
      updatePageIndicator();
      
      console.log('PDF reader initialized successfully');
      
    } catch (error) {
      console.error('Error loading PDF:', error);
      pdfContainer.innerHTML = '<div style="text-align: center; color: red; padding: 50px;">Failed to load PDF. Check console for details.</div>';
    }
  }

  // Render all pages
  async function renderAllPages() {
    console.log('Rendering all pages...');
    pdfContainer.innerHTML = '';
    pageTextData = [];
    
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: currentScale });
        
        // Create page container
        const pageDiv = document.createElement('div');
        pageDiv.className = 'pdf-page';
        pageDiv.id = `page-${pageNum}`;
        pageDiv.style.margin = '20px auto';
        pageDiv.style.position = 'relative';
        pageDiv.style.display = 'block';
        pageDiv.style.width = viewport.width + 'px';
        pageDiv.style.height = viewport.height + 'px';
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.display = 'block';
        canvas.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
        
        // Create text layer container
        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        textLayerDiv.style.position = 'absolute';
        textLayerDiv.style.left = '0px';
        textLayerDiv.style.top = '0px';
        textLayerDiv.style.right = '0px';
        textLayerDiv.style.bottom = '0px';
        textLayerDiv.style.overflow = 'hidden';
        textLayerDiv.style.opacity = '0.2';
        textLayerDiv.style.lineHeight = '1.0';
        
        pageDiv.appendChild(canvas);
        pageDiv.appendChild(textLayerDiv);
        pdfContainer.appendChild(pageDiv);
        
        // Render PDF page
        const renderContext = {
          canvasContext: canvas.getContext('2d'),
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Get text content and render text layer
        const textContent = await page.getTextContent();
        const textLayerFactory = new pdfjsLib.TextLayerBuilder({
          textLayerDiv: textLayerDiv,
          pageIndex: pageNum - 1,
          viewport: viewport
        });
        
        textLayerFactory.setTextContent(textContent);
        textLayerFactory.render();
        
        // Store text for searching
        let pageText = '';
        textContent.items.forEach(item => {
          if (item.str && item.str.trim()) {
            pageText += item.str + ' ';
          }
        });
        
        pageTextData[pageNum - 1] = {
          text: pageText.trim(),
          textContent: textContent,
          textLayerDiv: textLayerDiv
        };
        
        console.log(`Page ${pageNum} rendered with ${pageText.length} characters of text`);
        
      } catch (error) {
        console.error(`Error rendering page ${pageNum}:`, error);
      }
    }
    
    console.log('All pages rendered successfully');
  }

  // Search function
  function performSearch() {
    const searchTerm = pdfSearchInput.value.trim();
    
    if (!searchTerm) {
      clearSearch();
      return;
    }
    
    console.log('Searching for:', searchTerm);
    
    // Clear previous search
    clearHighlights();
    searchMatches = [];
    currentMatchIndex = -1;
    
    const searchTermLower = searchTerm.toLowerCase();
    
    // Search through all pages
    for (let pageIndex = 0; pageIndex < pageTextData.length; pageIndex++) {
      const pageData = pageTextData[pageIndex];
      if (!pageData || !pageData.text) continue;
      
      const pageTextLower = pageData.text.toLowerCase();
      let startPos = 0;
      let foundPos;
      
      while ((foundPos = pageTextLower.indexOf(searchTermLower, startPos)) !== -1) {
        searchMatches.push({
          pageNumber: pageIndex + 1,
          position: foundPos,
          text: searchTerm,
          pageData: pageData
        });
        startPos = foundPos + 1;
      }
    }
    
    console.log('Search complete. Found', searchMatches.length, 'matches');
    
    updateSearchResults();
    
    if (searchMatches.length > 0) {
      highlightAllMatches(searchTerm);
      currentMatchIndex = 0;
      goToMatch(0);
    }
  }

  // Highlight all matches
  function highlightAllMatches(searchTerm) {
    console.log('Highlighting all matches for:', searchTerm);
    
    searchMatches.forEach((match, index) => {
      const pageDiv = document.getElementById(`page-${match.pageNumber}`);
      if (pageDiv) {
        const textLayerDiv = pageDiv.querySelector('.textLayer');
        if (textLayerDiv) {
          highlightTextInLayer(textLayerDiv, searchTerm, index === currentMatchIndex);
        }
      }
    });
  }

  // Highlight text in text layer
  function highlightTextInLayer(textLayerDiv, searchTerm, isCurrent = false) {
    const textDivs = textLayerDiv.querySelectorAll('span');
    const searchTermLower = searchTerm.toLowerCase();
    
    textDivs.forEach(span => {
      const text = span.textContent;
      if (text && text.toLowerCase().includes(searchTermLower)) {
        span.style.backgroundColor = isCurrent ? 'orange' : 'yellow';
        span.style.color = isCurrent ? 'white' : 'black';
        span.style.textDecoration = 'underline';
        span.style.textDecorationColor = isCurrent ? 'white' : 'red';
        span.style.textDecorationThickness = '2px';
        span.classList.add('search-highlight');
        if (isCurrent) {
          span.classList.add('current-highlight');
        }
      }
    });
  }

  // Clear search
  function clearSearch() {
    pdfSearchInput.value = '';
    searchMatches = [];
    currentMatchIndex = -1;
    clearHighlights();
    updateSearchResults();
  }

  // Clear highlights
  function clearHighlights() {
    const highlights = document.querySelectorAll('.search-highlight');
    highlights.forEach(span => {
      span.style.backgroundColor = '';
      span.style.color = '';
      span.style.textDecoration = '';
      span.classList.remove('search-highlight', 'current-highlight');
    });
  }

  // Go to specific match
  function goToMatch(index) {
    if (index < 0 || index >= searchMatches.length) return;
    
    currentMatchIndex = index;
    const match = searchMatches[index];
    
    // Navigate to page
    currentPage = match.pageNumber;
    scrollToPage(currentPage);
    
    // Update highlighting
    clearHighlights();
    highlightAllMatches(match.text);
    
    updateSearchResults();
    updatePageIndicator();
  }

  // Navigation functions
  function nextMatch() {
    if (searchMatches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % searchMatches.length;
    goToMatch(nextIndex);
  }

  function prevMatch() {
    if (searchMatches.length === 0) return;
    const prevIndex = currentMatchIndex === 0 ? searchMatches.length - 1 : currentMatchIndex - 1;
    goToMatch(prevIndex);
  }

  function scrollToPage(pageNum) {
    const pageElement = document.getElementById(`page-${pageNum}`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function updatePageIndicator() {
    const indicator = document.getElementById('pageIndicator');
    if (indicator) {
      indicator.textContent = `Page ${currentPage} / ${totalPages}`;
    }
  }

  function updateSearchResults() {
    if (searchMatches.length === 0) {
      const searchTerm = pdfSearchInput.value.trim();
      searchResults.textContent = searchTerm ? 'Not found' : '';
      searchResults.style.color = '#ff6b6b';
    } else {
      searchResults.textContent = `${currentMatchIndex + 1} of ${searchMatches.length}`;
      searchResults.style.color = '#4a90e2';
    }
  }

  // Event listeners
  if (searchInPdfBtn) {
    searchInPdfBtn.addEventListener('click', performSearch);
  }
  
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', clearSearch);
  }
  
  if (nextSearchBtn) {
    nextSearchBtn.addEventListener('click', nextMatch);
  }
  
  if (prevSearchBtn) {
    prevSearchBtn.addEventListener('click', prevMatch);
  }

  if (pdfSearchInput) {
    pdfSearchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        performSearch();
      }
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = pdfFileName;
      link.click();
    });
  }

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', async function() {
      if (currentScale + scaleStep <= maxScale) {
        currentScale += scaleStep;
        await renderAllPages();
        scrollToPage(currentPage);
      }
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', async function() {
      if (currentScale - scaleStep >= minScale) {
        currentScale -= scaleStep;
        await renderAllPages();
        scrollToPage(currentPage);
      }
    });
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', function() {
      if (currentPage > 1) {
        currentPage--;
        scrollToPage(currentPage);
        updatePageIndicator();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', function() {
      if (currentPage < totalPages) {
        currentPage++;
        scrollToPage(currentPage);
        updatePageIndicator();
      }
    });
  }

  if (goPageBtn && pageInput) {
    goPageBtn.addEventListener('click', function() {
      const pageNum = parseInt(pageInput.value, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        currentPage = pageNum;
        scrollToPage(currentPage);
        updatePageIndicator();
      } else {
        alert(`Please enter a valid page number between 1 and ${totalPages}`);
      }
    });
  }

  // Start the application
  console.log('Starting PDF reader initialization...');
  init();
})();