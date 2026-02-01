// js/search.js
// Book search functionality for the E-Library home page

(function() {
    const bookSearch = document.getElementById('bookSearch');
    const searchBtn = document.getElementById('searchBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const noResults = document.getElementById('noResults');
    
    let allBooks = [];
    
    // Initialize search functionality
    function initializeSearch() {
        // Get all book items
        allBooks = Array.from(document.querySelectorAll('.book-item'));
        
        // Add event listeners
        searchBtn.addEventListener('click', performSearch);
        clearSearchBtn.addEventListener('click', clearSearch);
        bookSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        
        // Real-time search as user types
        bookSearch.addEventListener('input', function() {
            if (this.value.trim() === '') {
                clearSearch();
            } else {
                performSearch();
            }
        });
    }
    
    // Perform search based on input
    function performSearch() {
        const searchTerm = bookSearch.value.trim().toLowerCase();
        
        if (searchTerm === '') {
            clearSearch();
            return;
        }
        
        let visibleCount = 0;
        
        allBooks.forEach(book => {
            const title = book.getAttribute('data-title').toLowerCase();
            const author = book.getAttribute('data-author').toLowerCase();
            const keywords = book.getAttribute('data-keywords').toLowerCase();
            
            // Check if search term matches title, author, or keywords
            const matches = title.includes(searchTerm) || 
                          author.includes(searchTerm) || 
                          keywords.includes(searchTerm);
            
            if (matches) {
                book.classList.remove('hidden');
                book.style.display = 'block';
                visibleCount++;
                
                // Highlight matching text
                highlightSearchTerm(book, searchTerm);
            } else {
                book.classList.add('hidden');
                book.style.display = 'none';
            }
        });
        
        // Show/hide no results message
        if (visibleCount === 0) {
            noResults.style.display = 'block';
        } else {
            noResults.style.display = 'none';
        }
    }
    
    // Clear search and show all books
    function clearSearch() {
        bookSearch.value = '';
        
        allBooks.forEach(book => {
            book.classList.remove('hidden');
            book.style.display = 'block';
            
            // Remove highlights
            removeHighlights(book);
        });
        
        noResults.style.display = 'none';
    }
    
    // Highlight search term in book elements
    function highlightSearchTerm(bookElement, searchTerm) {
        // Remove existing highlights first
        removeHighlights(bookElement);
        
        const titleElement = bookElement.querySelector('p');
        const authorElement = bookElement.querySelector('.book-author');
        
        if (titleElement) {
            highlightText(titleElement, searchTerm);
        }
        
        if (authorElement) {
            highlightText(authorElement, searchTerm);
        }
    }
    
    // Remove highlights from book element
    function removeHighlights(bookElement) {
        const highlightedElements = bookElement.querySelectorAll('.search-highlight');
        highlightedElements.forEach(element => {
            const parent = element.parentNode;
            parent.replaceChild(document.createTextNode(element.textContent), element);
            parent.normalize();
        });
    }
    
    // Highlight specific text within an element
    function highlightText(element, searchTerm) {
        const text = element.textContent;
        const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
        
        if (regex.test(text)) {
            const highlightedHTML = text.replace(regex, '<span class="search-highlight">$1</span>');
            element.innerHTML = highlightedHTML;
        }
    }
    
    // Escape special regex characters
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Initialize when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSearch);
    } else {
        initializeSearch();
    }
})();