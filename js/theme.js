// js/theme.js
(function() {
    // 1. Check LocalStorage and apply theme immediately
    const savedTheme = localStorage.getItem('theme');
    const isLight = savedTheme === 'light';
    
    if (isLight) {
        document.body.classList.add('light-mode');
    }

    // 2. Create and inject Toggle Button
    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.innerHTML = isLight ? '☀️' : '🌙';
    btn.title = "Toggle Light/Dark Mode";
    
    // Add to body
    document.body.appendChild(btn);

    // 3. Toggle Logic
    btn.addEventListener('click', function() {
        document.body.classList.toggle('light-mode');
        const currentIsLight = document.body.classList.contains('light-mode');
        
        // Update Icon
        btn.innerHTML = currentIsLight ? '☀️' : '🌙';
        
        // Save Preference
        localStorage.setItem('theme', currentIsLight ? 'light' : 'dark');
    });
})();