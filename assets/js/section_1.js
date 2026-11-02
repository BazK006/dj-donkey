
document.addEventListener('DOMContentLoaded', () => {
    const track = document.querySelector('.marquee-track');

    if (!track)
        return;

    const source = track.querySelector('.marquee-content');

    if (!source)
        return;

    const template = source.cloneNode(true);

    template.removeAttribute('aria-hidden');
    template.removeAttribute('inert');

    let resizeTimer;


    function buildMarquee() {
        track.style.animation = 'none';
        const firstGroup = document.createElement('div');
        firstGroup.className = 'marquee-loop-group';

        track.replaceChildren(firstGroup);

        let count = 0;
        const maxCopies = 50;

        while (firstGroup.scrollWidth < window.innerWidth && count < maxCopies) {

            const copy = template.cloneNode(true);

            copy.removeAttribute('aria-hidden');
            copy.removeAttribute('inert');

            firstGroup.appendChild(copy);

            count++;
        }

        const groupWidth = firstGroup.getBoundingClientRect().width;
        const secondGroup = firstGroup.cloneNode(true);

        secondGroup.setAttribute('aria-hidden', 'true');
        secondGroup.setAttribute('inert', '');

        track.appendChild(secondGroup);

        track.style.setProperty(
            '--marquee-offset',
            `${-groupWidth}px`
        );

        void track.offsetWidth;
        track.style.animation = '';
    }

    buildMarquee();

    window.addEventListener('resize', () => {

        clearTimeout(resizeTimer);

        resizeTimer = setTimeout(() => {
            buildMarquee();
        }, 150);

    });

});
