// js/reader.js
// Loads a PDF from a Google Drive direct download link using PDF.js and provides a download button.
// The previous version failed because Google Drive does not send CORS headers, causing PDF.js to block the request.
// We configure PDF.js to request the file without credentials, which works for public URLs.

(function () {
  // Direct download URL for the Google Drive PDF (file ID extracted from the provided link)
  const pdfUrl = 'https://raw.githubusercontent.com/akshaysai454/E-LIBRARY-/main/FWD%20QB%20MID%202%20Descriptive%20(1).pdf';
  const pdfFileName = 'sample-book.pdf'; // filename for the download attribute

  const pdfContainer = document.getElementById('pdfContainer');
  const downloadBtn = document.getElementById('downloadBtn');

  // Set up download button to download the same PDF
  downloadBtn.addEventListener('click', function () {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = pdfFileName;
    link.click();
  });

  // Load PDF using PDF.js with options suitable for external URLs
  const loadingTask = pdfjsLib.getDocument({ url: pdfUrl, withCredentials: false });
  loadingTask.promise
    .then(function (pdf) {
      const pageCount = pdf.numPages;
      const renderPage = function (pageNum) {
        pdf.getPage(pageNum).then(function (page) {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          page.render(renderContext).promise.then(function () {
            pdfContainer.appendChild(canvas);
            if (pageNum < pageCount) {
              renderPage(pageNum + 1);
            }
          });
        });
      };
      renderPage(1);
    })
    .catch(function (err) {
      console.error('Error loading PDF (possible CORS issue):', err);
      pdfContainer.innerText = 'Failed to load PDF.';
    });
})();
