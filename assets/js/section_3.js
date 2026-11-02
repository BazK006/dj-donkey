document.addEventListener("DOMContentLoaded", function () {
    const cards = document.querySelectorAll('.gallery-card');
    const btnPrev = document.getElementById('btnPrevGal');
    const btnNext = document.getElementById('btnNextGal');
    const track = document.querySelector('.gallery-track');

    if (cards.length === 0) return;

    let currentIndex = 0;
    const totalCards = cards.length;

    function updateGallery() {
        cards.forEach(card => {
            card.classList.remove('active', 'prev', 'next', 'prev-2', 'next-2');
        });

        const prev2Index = (currentIndex - 2 + totalCards) % totalCards;
        const prevIndex = (currentIndex - 1 + totalCards) % totalCards;
        const nextIndex = (currentIndex + 1) % totalCards;
        const next2Index = (currentIndex + 2) % totalCards;

        cards[currentIndex].classList.add('active');
        cards[prevIndex].classList.add('prev');
        cards[nextIndex].classList.add('next');

        if (totalCards >= 5) {
            cards[prev2Index].classList.add('prev-2');
            cards[next2Index].classList.add('next-2');
        }
    }

    function goNext() {
        currentIndex = (currentIndex + 1) % totalCards;
        updateGallery();
    }

    function goPrev() {
        currentIndex = (currentIndex - 1 + totalCards) % totalCards;
        updateGallery();
    }

    if (btnNext) btnNext.addEventListener('click', goNext);
    if (btnPrev) btnPrev.addEventListener('click', goPrev);

    cards.forEach((card, index) => {
        card.ondragstart = () => false;

        card.addEventListener('click', () => {
            if (!card.classList.contains('active')) {
                currentIndex = index;
                updateGallery();
            }
        });
    });

    let startX = 0;
    let endX = 0;
    let isDragging = false;
    const threshold = 50;

    track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        endX = startX;
    }, { passive: true });

    track.addEventListener('touchmove', (e) => {
        endX = e.touches[0].clientX;
    }, { passive: true });

    track.addEventListener('touchend', handleSwipe);

    track.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        endX = startX;
        track.style.cursor = 'grabbing';
    });

    track.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        endX = e.clientX;
    });

    const stopDrag = () => {
        if (isDragging) {
            handleSwipe();
            isDragging = false;
            track.style.cursor = 'grab';
        }
    };

    track.addEventListener('mouseup', stopDrag);
    track.addEventListener('mouseleave', stopDrag);

    function handleSwipe() {
        const diffX = startX - endX;
        if (diffX > threshold) {
            goNext();
        } else if (diffX < -threshold) {
            goPrev();
        }
    }

    updateGallery();
});