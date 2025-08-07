// Clean up old Home page data from localStorage
(function() {
    try {
        // Get existing data
        const pages = JSON.parse(localStorage.getItem('wiki-pages') || '{}');
        const recent = JSON.parse(localStorage.getItem('wiki-recent') || '[]');
        const history = JSON.parse(localStorage.getItem('wiki-history') || '{}');
        
        // Remove Home page if it exists
        if (pages['Home']) {
            delete pages['Home'];
            console.log('Removed Home page');
        }
        
        // Remove Home from recent list
        const updatedRecent = recent.filter(item => item !== 'Home');
        console.log('Updated recent list, removed Home');
        
        // Remove Home from history
        if (history['Home']) {
            delete history['Home'];
            console.log('Removed Home history');
        }
        
        // Update localStorage
        localStorage.setItem('wiki-pages', JSON.stringify(pages));
        localStorage.setItem('wiki-recent', JSON.stringify(updatedRecent));
        localStorage.setItem('wiki-history', JSON.stringify(history));
        
        console.log('Cleanup completed successfully');
        console.log('Current pages:', Object.keys(pages));
        console.log('Current recent:', updatedRecent);
        
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
})();