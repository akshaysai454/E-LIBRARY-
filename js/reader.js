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
          const canvas = document.createElement('canvas');
          canvas.id = `page-${i}`;
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          // Add to observer
          observer.observe(canvas);

          const renderContext = { canvasContext: context, viewport: viewport };
          pdfContainer.appendChild(canvas);
          return page.render(renderContext).promise;
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
