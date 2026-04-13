window.addEventListener('DOMContentLoaded', () => {
    const panel = document.getElementById('menu-screen');
    const btn = document.getElementById('menu-button');
    if (!panel || !btn) return;

    const closeAfterMs = 520;

    function open() {
        panel.classList.remove('hidden', 'menu-screen--closing');
        panel.style.animation = 'none';
        void panel.offsetWidth;
        panel.style.animation = '';
        btn.classList.add('active');
    }

    function close() {
        if (panel.classList.contains('hidden') || panel.classList.contains('menu-screen--closing')) return;
        panel.classList.add('menu-screen--closing');
        btn.classList.remove('active');
        setTimeout(() => {
            panel.classList.add('hidden');
            panel.classList.remove('menu-screen--closing');
        }, closeAfterMs);
    }

    btn.addEventListener('click', () => (
        panel.classList.contains('hidden') ? open() : close()
    ));
    panel.querySelectorAll('a[href]').
    forEach((a) => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !panel.classList.contains('hidden')) {
            close();
        }
    });
});
