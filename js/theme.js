(function() {
    // Icons
    const sunIcon = `<svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    
    const moonIcon = `<svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

    // 1. Check LocalStorage and apply theme immediately
    const savedTheme = localStorage.getItem('theme');
    const isLight = savedTheme === 'light';
    
    if (isLight) {
        document.body.classList.add('light-mode');
    }

    // 2. Create and inject Toggle Button
    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.innerHTML = isLight ? sunIcon : moonIcon;
    btn.title = "Toggle Light/Dark Mode";
    btn.setAttribute('aria-label', 'Toggle theme');
    
    // Add to body
    document.body.appendChild(btn);

    // 3. Toggle Logic
    btn.addEventListener('click', function() {
        document.body.classList.toggle('light-mode');
        const currentIsLight = document.body.classList.contains('light-mode');
        
        // Update Icon
        btn.innerHTML = currentIsLight ? sunIcon : moonIcon;
        
        // Save Preference
        localStorage.setItem('theme', currentIsLight ? 'light' : 'dark');
    });
})();
