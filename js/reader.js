// js/reader.js
// Digital Reader with clean UI, proper page indicator logic, and full search functionality

(function () {
  const pdfUrl = 'https://raw.githubusercontent.com/akshaysai454/E-LIBRARY-/main/FWD%20QB%20MID%202%20Descriptive%20(1).pdf';
  const pdfFileName = 'sample-book.pdf';

  const pdfContainer = document.getElementById('pdfContainer');
  const downloadBtn = document.getElementById('downloadBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const pageInput = document.getElementById('pageInput');
  const goPageBtn = document.getElementById('goPageBtn');
  const pageIndicator = document.getElementById('pageIndicator');
  const bookTitle = document.getElementById('bookTitle');

  // Search elements
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
  let searchResults = [];
  let currentMatchIndex = -1;

  // Intersection Observer for automatic page tracking
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.5
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const pageNum = parseInt(entry.target.dataset.pageNum, 10);
        if (pageNum > 0 && pageNum !== currentPage) {
          currentPage = pageNum;
          updatePageIndicator();
          updateNavigationButtons();
        }
      }
    });
  }, observerOptions);

  // Update page indicator with proper format: Page X of Y
  function updatePageIndicator() {
    if (pageIndicator && totalPages > 0) {
      pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    }
  }

  // Update navigation button states
  function updateNavigationButtons() {
    if (prevPageBtn) {
      prevPageBtn.disabled = currentPage <= 1;
    }
    if (nextPageBtn) {
      nextPageBtn.disabled = currentPage >= totalPages;
    }
    if (pageInput) {
      pageInput.max = totalPages;
    }
  }

  // Render all pages in a stacked layout
  function renderAllPagesStacked() {
    if (!pdfDoc) return;
    pdfContainer.innerHTML = '';
    observer.disconnect();

    let chain = Promise.resolve();
    for (let i = 1; i <= totalPages; i++) {
      chain = chain.then(() => {
        return pdfDoc.getPage(i).then(function (page) {
          const viewport = page.getViewport({ scale: currentScale });
          const canvas = document.createElement('canvas');
          canvas.dataset.pageNum = i;
          canvas.id = `page-${i}`;
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          observer.observe(canvas);

          const renderContext = { canvasContext: context, viewport: viewport };
          pdfContainer.appendChild(canvas);
          return page.render(renderContext).promise;
        });
      });
    }

    chain.then(() => {
      scrollToPage(currentPage);
      updatePageIndicator();
      updateNavigationButtons();
    });
  }

  // Scroll to specific page
  function scrollToPage(pageNum) {
    // Validate page number
    if (pageNum < 1) pageNum = 1;
    if (pageNum > totalPages) pageNum = totalPages;
    
    currentPage = pageNum;
    const elem = document.getElementById(`page-${pageNum}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    updatePageIndicator();
    updateNavigationButtons();
  }

  // Search in PDF using getTextContent API
  async function searchInPDF() {
    const query = searchInput.value.trim();
    if (!query || !pdfDoc) {
      searchResultsSpan.textContent = '';
      return;
    }

    searchResults = [];
    const lowerQuery = query.toLowerCase();

    // Search through all pages
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine all text items into a single string
      const pageText = textContent.items.map(item => item.str).join(' ');

      // Case-insensitive search
      if (pageText.toLowerCase().includes(lowerQuery)) {
        searchResults.push(pageNum);
      }
    }

    // Update UI with results
    if (searchResults.length > 0) {
      searchResultsSpan.textContent = `Found ${searchResults.length} page(s)`;
      currentMatchIndex = 0;
      // Scroll to first match
      currentPage = searchResults[0];
      scrollToPage(currentPage);
      updatePageIndicator();
    } else {
      searchResultsSpan.textContent = 'No matches found';
      currentMatchIndex = -1;
    }
  }

  // Navigate to next match
  function goToNextMatch() {
    if (searchResults.length === 0) return;
    currentMatchIndex = (currentMatchIndex + 1) % searchResults.length;
    currentPage = searchResults[currentMatchIndex];
    scrollToPage(currentPage);
    updatePageIndicator();
  }

  // Navigate to previous match
  function goToPrevMatch() {
    if (searchResults.length === 0) return;
    currentMatchIndex = (currentMatchIndex - 1 + searchResults.length) % searchResults.length;
    currentPage = searchResults[currentMatchIndex];
    scrollToPage(currentPage);
    updatePageIndicator();
  }

  // Event: Download PDF
  downloadBtn.addEventListener('click', function () {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = pdfFileName;
    link.click();
  });

  // Event: Zoom In
  zoomInBtn.addEventListener('click', function () {
    if (currentScale + scaleStep <= maxScale) {
      currentScale += scaleStep;
      renderAllPagesStacked();
    }
  });

  // Event: Zoom Out
  zoomOutBtn.addEventListener('click', function () {
    if (currentScale - scaleStep >= minScale) {
      currentScale -= scaleStep;
      renderAllPagesStacked();
    }
  });

  // Event: Previous Page
  prevPageBtn.addEventListener('click', function () {
    if (currentPage > 1) {
      scrollToPage(currentPage - 1);
    }
  });

  // Event: Next Page
  nextPageBtn.addEventListener('click', function () {
    if (currentPage < totalPages) {
      scrollToPage(currentPage + 1);
    }
  });

  // Event: Go to Page
  goPageBtn.addEventListener('click', function () {
    const pageNum = parseInt(pageInput.value, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      scrollToPage(pageNum);
      pageInput.value = '';
    } else {
      alert(`Please enter a page number between 1 and ${totalPages}`);
    }
  });

  // Event: Enter key on page input
  pageInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      goPageBtn.click();
    }
  });

  // Event listeners for search
  searchBtn.addEventListener('click', searchInPDF);
  searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      searchInPDF();
    }
  });
  nextMatchBtn.addEventListener('click', goToNextMatch);
  prevMatchBtn.addEventListener('click', goToPrevMatch);

  // Load PDF
  const loadingTask = pdfjsLib.getDocument({ url: pdfUrl, withCredentials: false });
  loadingTask.promise
    .then(function (pdf) {
      pdfDoc = pdf;
      totalPages = pdfDoc.numPages;
      
      // Update title with document info
      bookTitle.textContent = 'Digital Reader';
      
      // Initial render
      renderAllPagesStacked();
    })
    .catch(function (err) {
      console.error('Error loading PDF:', err);
      pdfContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">Failed to load document. Please check your connection.</div>';
    });
})();