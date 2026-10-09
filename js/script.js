/**
 * LUXURY DIGITAL WEDDING INVITATION JAVASCRIPT
 * Vanilla JS • High Performance • Mobile First
 */

// Ensure initial scroll position is top 0 and prevent browser scroll restoration behind cover
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

document.addEventListener('DOMContentLoaded', () => {
    // Application State
    const state = {
        isOpened: false,
        isPlaying: false,
        isMuted: false,
        audioVolume: 0.28,
        synthContext: null,
        synthInterval: null,
        usingSynth: false
    };

    // Initialize all modules
    initializeSmoothScroll();
    initializeOpening();
    initializeMusic();
    initializeNavigation();
    initializeCountdown();
    initializeCalendarDownloads();
    initializePetals();
    initializeScrollAnimations();

    /**
     * MODULE 0: LUXURY SMOOTH SCROLLING ENGINE (LENIS)
     * Provides buttery inertial smooth scrolling for wheel, touch, and navigation
     */
    function initializeSmoothScroll() {
        if (typeof Lenis === 'undefined') {
            console.info('Lenis library not loaded; falling back to native scrolling.');
            document.documentElement.classList.add('no-lenis');
            return;
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.documentElement.classList.add('no-lenis');
            return;
        }

        const lenis = new Lenis({
            duration: 0.85,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 1.0,
            touchMultiplier: 1.0,
            infinite: false
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        window.lenis = lenis;

        // While opening screen is active, completely stop background scroll
        const openingScreen = document.getElementById('openingScreen');
        if (openingScreen && !openingScreen.classList.contains('opening-dismissed')) {
            lenis.stop();
            document.documentElement.classList.add('is-locked');
            document.body.classList.add('is-locked');
        }
    }

    /**
     * MODULE 1: OPENING INTERACTION
     * Manages transition from Opening Screen to Invitation Card
     * Supports Tap, Scroll Down, Swipe Up, and Key Navigation
     */
    function initializeOpening() {
        const openingScreen = document.getElementById('openingScreen');
        const btnTapOpen = document.getElementById('btnTapOpen');

        if (!openingScreen) return;

        function openInvitation() {
            if (state.isOpened) return;
            state.isOpened = true;

            // Remove strict background scroll lock
            document.documentElement.classList.remove('is-locked');
            document.body.classList.remove('is-locked');

            // Smooth fade & scale out
            openingScreen.classList.add('opening-dismissed');
            setTimeout(() => {
                openingScreen.style.display = 'none';
            }, 750);

            // Begin wedding nasheed with audio unlock
            startAudioPlayback();

            // Resume Lenis, recalculate document boundaries, and align to top
            if (window.lenis) {
                window.lenis.start();
                window.lenis.resize();
                window.lenis.scrollTo(0, { immediate: true });
                requestAnimationFrame(() => {
                    if (window.lenis) {
                        window.lenis.resize();
                    }
                });
            } else {
                window.scrollTo({ top: 0, behavior: 'instant' });
            }

            // Reveal hero elements immediately
            const heroReveals = document.querySelectorAll('#couple .reveal-on-scroll');
            heroReveals.forEach(el => el.classList.add('revealed'));
        }

        // Tap button
        if (btnTapOpen) {
            btnTapOpen.addEventListener('click', (e) => {
                e.stopPropagation();
                openInvitation();
            });
        }

        // Tap anywhere on opening cover
        openingScreen.addEventListener('click', () => {
            openInvitation();
        });

        // Mouse Wheel: Completely block scroll leakage; scroll down unlocks invitation
        openingScreen.addEventListener('wheel', (e) => {
            if (state.isOpened) return;
            // Never let wheel events reach the page underneath while cover is active
            if (e.cancelable) e.preventDefault();
            if (e.deltaY > 5) {
                openInvitation();
            }
        }, { passive: false });

        // Touch Swipe: Completely block touch leakage; swipe up unlocks invitation
        let touchStartY = null;
        let touchStartX = null;

        openingScreen.addEventListener('touchstart', (e) => {
            if (state.isOpened) return;
            if (e.touches && e.touches.length > 0) {
                touchStartY = e.touches[0].clientY;
                touchStartX = e.touches[0].clientX;
            }
        }, { passive: true });

        openingScreen.addEventListener('touchmove', (e) => {
            if (state.isOpened) return;
            // Always prevent background scroll gesture on cover
            if (e.cancelable) e.preventDefault();

            if (touchStartY === null || !e.touches || e.touches.length === 0) return;

            const currentY = e.touches[0].clientY;
            const currentX = e.touches[0].clientX;
            const diffY = touchStartY - currentY; // positive = swiping up / scrolling down
            const diffX = Math.abs(currentX - touchStartX);

            if (diffY > 15 && diffY > diffX) {
                openInvitation();
            }
        }, { passive: false });

        // Keyboard Navigation (ArrowDown, PageDown, Space, Enter)
        window.addEventListener('keydown', (e) => {
            if (!state.isOpened && ['ArrowDown', 'PageDown', 'Space', ' ', 'Enter'].includes(e.key)) {
                if (e.cancelable) e.preventDefault();
                openInvitation();
            }
        });
    }

    /**
     * MODULE 2: WEDDING NASHEED & AUDIO CONTROLS
     * Native HTML5 Audio + Web Audio API harmonic harp fallback
     */
    function initializeMusic() {
        const audio = document.getElementById('weddingAudio');
        const fab = document.getElementById('musicFab');
        const fabPlayToggle = document.getElementById('fabPlayToggle');
        const btnMusicToggle = document.getElementById('btnMusicToggle');
        const btnMusicMute = document.getElementById('btnMusicMute');
        const vinyl = document.querySelector('.section-music');

        if (!audio) return;

        audio.volume = state.audioVolume;

        // Play / Pause Toggle
        function togglePlayPause() {
            if (state.isPlaying) {
                pauseAudio();
            } else {
                startAudioPlayback();
            }
        }

        // Mute / Unmute Toggle
        function toggleMute() {
            state.isMuted = !state.isMuted;
            if (audio) {
                audio.muted = state.isMuted;
            }
            if (state.usingSynth && state.synthContext) {
                // Adjust synth master volume if using fallback
                if (state.synthMasterGain) {
                    state.synthMasterGain.gain.setValueAtTime(
                        state.isMuted ? 0 : 0.05,
                        state.synthContext.currentTime
                    );
                }
            }
            updateAudioUI();
        }

        if (fabPlayToggle) fabPlayToggle.addEventListener('click', togglePlayPause);
        if (btnMusicToggle) btnMusicToggle.addEventListener('click', togglePlayPause);
        if (btnMusicMute) btnMusicMute.addEventListener('click', toggleMute);

        // Update UI states
        function updateAudioUI() {
            const body = document.body;
            if (state.isPlaying) {
                body.classList.remove('music-paused');
                body.classList.add('music-playing');
                if (fabPlayToggle) {
                    fabPlayToggle.setAttribute('aria-label', 'Pause wedding nasheed');
                    fabPlayToggle.setAttribute('title', 'Pause Nasheed');
                }
                if (btnMusicToggle) {
                    const textSpan = btnMusicToggle.querySelector('.music-btn-text');
                    if (textSpan) textSpan.textContent = 'PAUSE MUSIC';
                }
            } else {
                body.classList.remove('music-playing');
                body.classList.add('music-paused');
                if (fabPlayToggle) {
                    fabPlayToggle.setAttribute('aria-label', 'Play wedding nasheed');
                    fabPlayToggle.setAttribute('title', 'Play Nasheed');
                }
                if (btnMusicToggle) {
                    const textSpan = btnMusicToggle.querySelector('.music-btn-text');
                    if (textSpan) textSpan.textContent = 'PLAY NASHEED';
                }
            }

            if (state.isMuted) {
                body.classList.add('music-muted');
                if (btnMusicMute) {
                    const textSpan = btnMusicMute.querySelector('.music-btn-text');
                    if (textSpan) textSpan.textContent = 'UNMUTE';
                }
            } else {
                body.classList.remove('music-muted');
                if (btnMusicMute) {
                    const textSpan = btnMusicMute.querySelector('.music-btn-text');
                    if (textSpan) textSpan.textContent = 'MUTE';
                }
            }
        }

        // Start playback
        window.startAudioPlayback = function() {
            state.isPlaying = true;
            updateAudioUI();

            audio.play().then(() => {
                state.usingSynth = false;
            }).catch(err => {
                console.warn('HTML5 Audio playback note:', err);
                // Graceful fallback to serene Web Audio harmonic chord synthesizer
                startHarmonicSynthesizer();
            });
        };

        // Pause playback
        window.pauseAudio = function() {
            state.isPlaying = false;
            audio.pause();
            stopHarmonicSynthesizer();
            updateAudioUI();
        };

        // Web Audio harmonic synthesizer fallback
        function startHarmonicSynthesizer() {
            if (state.usingSynth) return;
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;

                const ctx = new AudioCtx();
                state.synthContext = ctx;
                state.usingSynth = true;

                const masterGain = ctx.createGain();
                masterGain.gain.setValueAtTime(state.isMuted ? 0 : 0.05, ctx.currentTime);
                masterGain.connect(ctx.destination);
                state.synthMasterGain = masterGain;

                // Traditional warm melodic chords (D major pentatonic / Hijaz warmth)
                const chordSet = [
                    [146.83, 220.00, 293.66, 369.99], // D maj
                    [185.00, 220.00, 293.66, 440.00], // Bm7
                    [164.81, 196.00, 246.94, 293.66], // G maj
                    [146.83, 220.00, 293.66, 329.63]  // D sus
                ];
                let chordStep = 0;

                const playChord = () => {
                    if (!state.isPlaying || !state.synthContext || state.synthContext.state === 'closed') return;
                    const chord = chordSet[chordStep % chordSet.length];
                    chordStep++;

                    chord.forEach((freq, i) => {
                        const osc = ctx.createOscillator();
                        const noteGain = ctx.createGain();

                        osc.type = i === 0 ? 'sine' : 'triangle';
                        osc.frequency.setValueAtTime(freq, ctx.currentTime);

                        const startTime = ctx.currentTime + i * 0.16;
                        const duration = 4.2;

                        noteGain.gain.setValueAtTime(0, startTime);
                        noteGain.gain.linearRampToValueAtTime(0.04, startTime + 0.9);
                        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

                        osc.connect(noteGain);
                        noteGain.connect(masterGain);

                        osc.start(startTime);
                        osc.stop(startTime + duration + 0.1);
                    });
                };

                playChord();
                state.synthInterval = setInterval(playChord, 4000);
            } catch (e) {
                console.warn('Synthesizer unavailable:', e);
            }
        }

        function stopHarmonicSynthesizer() {
            if (state.synthInterval) {
                clearInterval(state.synthInterval);
                state.synthInterval = null;
            }
            if (state.synthContext) {
                try { state.synthContext.close(); } catch (e) {}
                state.synthContext = null;
            }
            state.usingSynth = false;
        }
    }

    /**
     * MODULE 3: NAVIGATION
     * Manages smooth scrolling and active item highlights
     */
    function initializeNavigation() {
        const navLinks = document.querySelectorAll('.fixed-nav .nav-item');
        const sections = Array.from(navLinks).map(link => {
            const href = link.getAttribute('href');
            const id = href && href.startsWith('#') ? href.slice(1) : null;
            return id ? { id, el: document.getElementById(id) } : null;
        }).filter(item => item && item.el);

        // Smooth scroll handling to exact 100vh page top
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('href');
                if (targetId && targetId.startsWith('#')) {
                    const targetEl = document.querySelector(targetId);
                    if (targetEl) {
                        e.preventDefault();
                        if (window.lenis) {
                            window.lenis.scrollTo(targetEl, {
                                offset: 0,
                                duration: 0.85
                            });
                        } else {
                            targetEl.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                            });
                        }
                    }
                }
            });
        });

        // Intersection observer to highlight current navigation item
        if ('IntersectionObserver' in window) {
            const navObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        navLinks.forEach(link => {
                            if (link.getAttribute('href') === `#${entry.target.id}`) {
                                link.classList.add('active');
                            } else {
                                link.classList.remove('active');
                            }
                        });
                    }
                });
            }, {
                threshold: 0.3,
                rootMargin: '-50px 0px -50% 0px'
            });

            sections.forEach(sec => {
                if (sec.el) navObserver.observe(sec.el);
            });
        }
    }

    /**
     * MODULE 4: COUNTDOWN
     * Target: Saturday, 12 December 2026, 5:00 PM IST (GMT+5:30)
     */
    function initializeCountdown() {
        // 12 December 2026 17:00:00 IST
        const targetDate = new Date('2026-12-12T17:00:00+05:30').getTime();

        const cdDays = document.getElementById('cdDays');
        const cdHours = document.getElementById('cdHours');
        const cdMinutes = document.getElementById('cdMinutes');
        const cdSeconds = document.getElementById('cdSeconds');

        if (!cdDays || !cdHours || !cdMinutes || !cdSeconds) return;

        function updateCountdown() {
            const now = new Date().getTime();
            const difference = targetDate - now;

            if (difference <= 0) {
                cdDays.textContent = '00';
                cdHours.textContent = '00';
                cdMinutes.textContent = '00';
                cdSeconds.textContent = '00';
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            cdDays.textContent = String(days).padStart(days > 99 ? 3 : 2, '0');
            cdHours.textContent = String(hours).padStart(2, '0');
            cdMinutes.textContent = String(minutes).padStart(2, '0');
            cdSeconds.textContent = String(seconds).padStart(2, '0');
        }

        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    /**
     * MODULE 5: CALENDAR SELECTOR & UNIFIED ACTION
     * Allows selecting range (Both Days, Saturday, Sunday)
     * Provides ONE universal "Add to Calendar" button optimized for both iPhone & Android
     */
    function initializeCalendarDownloads() {
        const pillButtons = document.querySelectorAll('.cal-pill-btn');
        const descEl = document.getElementById('calSelectionDesc');
        const btnUnified = document.getElementById('btnUnifiedCalendar');
        const smartBadge = document.getElementById('calSmartBadgeText');
        const altLink = document.getElementById('btnCalAltLink');

        let selectedRange = 'both'; // 'both' | 'saturday' | 'sunday'

        const descriptions = {
            both: 'Adds both celebrations (Saturday at K-Hills & Sunday at Residence) to your calendar.',
            saturday: 'Adds Day 1 celebration (Nikah at 5:00 PM & Walima at K-Hills Convention Centre) to your calendar.',
            sunday: 'Adds Day 2 celebration (Nikah at 1:00 PM & Walima at Residence) to your calendar.'
        };

        // Detect Apple/iOS environment
        function isAppleDevice() {
            const ua = navigator.userAgent || navigator.vendor || window.opera || '';
            const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            const isMac = /Macintosh/.test(ua) && !/Android/.test(ua);
            return isIOS || isMac;
        }

        const isApple = isAppleDevice();

        // Update device hints
        if (smartBadge) {
            smartBadge.textContent = isApple 
                ? 'One tap adds directly to Apple Calendar' 
                : 'One tap adds directly to Google Calendar';
        }
        if (altLink) {
            altLink.textContent = isApple 
                ? 'Using Google Calendar? Tap here ↗' 
                : 'Download .ICS file instead';
        }

        // Pill Selection Handling
        pillButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const range = btn.getAttribute('data-range');
                if (!range || range === selectedRange) return;

                selectedRange = range;

                // Update active pill styling
                pillButtons.forEach(b => {
                    const isTarget = b === btn;
                    b.classList.toggle('active', isTarget);
                    b.setAttribute('aria-checked', isTarget ? 'true' : 'false');
                });

                // Update dynamic description with subtle fade
                if (descEl && descriptions[range]) {
                    descEl.style.opacity = '0';
                    descEl.style.transform = 'translateY(3px)';
                    setTimeout(() => {
                        descEl.textContent = descriptions[range];
                        descEl.style.opacity = '1';
                        descEl.style.transform = 'translateY(0)';
                    }, 120);
                }
            });
        });

        // Google Calendar URLs
        function getGoogleCalendarUrl(range) {
            if (range === 'saturday') {
                return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Wedding+of+Dr.+Favas+%26+Ayesha+and+Dr.+Fanseem+%26+Rafna&dates=20261212T113000Z/20261212T170000Z&details=Nikah+at+5:00+PM,+Walima+after+Nikah.&location=K-Hills+Convention+Centre,+Ramanattukara,+Feroke,+Calicut,+Kerala';
            } else if (range === 'sunday') {
                return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Wedding+Celebration+Day+2+-+Dr.+Favas+%26+Ayesha+and+Dr.+Fanseem+%26+Rafna&dates=20261213T073000Z/20261213T133000Z&details=Nikah+at+1:00+PM,+Walima+after+Nikah.&location=Meethalayancheri+(H),+Nadakkuthazha,+Puthur,+Vadakara,+Calicut';
            } else {
                return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Wedding+Celebration:+Dr.+Favas+%26+Ayesha+and+Dr.+Fanseem+%26+Rafna&dates=20261212T113000Z/20261213T153000Z&details=Day+1+(Sat+12+Dec):+Nikah+at+5:00+PM,+Walima+after+Nikah+at+K-Hills+Convention+Centre,+Ramanattukara.%0A%0ADay+2+(Sun+13+Dec):+Nikah+at+1:00+PM,+Walima+after+Nikah+at+Residence+Meethalayancheri+(H),+Puthur,+Vadakara.&location=Calicut+%26+Vadakara,+Kerala';
            }
        }

        // iCalendar (.ics) Generation
        function downloadIcsFile(range) {
            let filename = '';
            let icsEvents = [];

            const eventSaturday = [
                'BEGIN:VEVENT',
                'UID:wedding-saturday-20261212@favas-fanseem',
                'DTSTAMP:20261212T000000Z',
                'DTSTART:20261212T113000Z',
                'DTEND:20261212T170000Z',
                'SUMMARY:Wedding Day 1: Dr. Favas & Ayesha and Dr. Fanseem & Rafna',
                'DESCRIPTION:Nikah at 5:00 PM followed by Walima reception.',
                'LOCATION:K-Hills Convention Centre\\, Ramanattukara\\, Feroke\\, Calicut\\, Kerala',
                'STATUS:CONFIRMED',
                'END:VEVENT'
            ];

            const eventSunday = [
                'BEGIN:VEVENT',
                'UID:wedding-sunday-20261213@favas-fanseem',
                'DTSTAMP:20261213T000000Z',
                'DTSTART:20261213T073000Z',
                'DTEND:20261213T133000Z',
                'SUMMARY:Wedding Day 2: Nikah & Walima at Residence',
                'DESCRIPTION:Nikah at 1:00 PM followed by Walima feast at ancestral residence.',
                'LOCATION:Meethalayancheri (H)\\, Nadakkuthazha\\, Puthur\\, Vadakara\\, Calicut',
                'STATUS:CONFIRMED',
                'END:VEVENT'
            ];

            if (range === 'saturday') {
                filename = 'Wedding-Saturday-12Dec2026.ics';
                icsEvents = eventSaturday;
            } else if (range === 'sunday') {
                filename = 'Wedding-Sunday-13Dec2026.ics';
                icsEvents = eventSunday;
            } else {
                filename = 'Wedding-Full-Weekend-12-13Dec2026.ics';
                icsEvents = [...eventSaturday, ...eventSunday];
            }

            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Dr Favas & Fanseem Wedding//EN',
                'CALSCALE:GREGORIAN',
                'METHOD:PUBLISH',
                ...icsEvents,
                'END:VCALENDAR'
            ].join('\r\n');

            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        }

        // Single Unified Action Button
        if (btnUnified) {
            btnUnified.addEventListener('click', () => {
                if (isApple) {
                    downloadIcsFile(selectedRange);
                } else {
                    const url = getGoogleCalendarUrl(selectedRange);
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            });
        }

        // Secondary / Alternate Action Link
        if (altLink) {
            altLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (isApple) {
                    // Apple user explicitly asking for Google Calendar link
                    const url = getGoogleCalendarUrl(selectedRange);
                    window.open(url, '_blank', 'noopener,noreferrer');
                } else {
                    // Non-Apple user explicitly asking for .ICS file
                    downloadIcsFile(selectedRange);
                }
            });
        }
    }

    /**
     * MODULE 6: FALLING ROSE PETALS
     * Authentic burgundy rose petals with organic drifting motion
     * Non-blocking (pointer-events: none)
     */
    function initializePetals() {
        const petalLayer = document.getElementById('petalLayer');
        if (!petalLayer) return;

        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        const isMobile = window.innerWidth <= 768;
        const petalCount = isMobile ? 12 : 18;
        const petalImages = [
            'images/floral/petal-1.png',
            'images/floral/petal-2.png',
            'images/floral/petal-3.png',
            'images/floral/petal-4.png'
        ];

        for (let i = 0; i < petalCount; i++) {
            createPetalElement(petalLayer, petalImages, i, petalCount);
        }
    }

    function createPetalElement(container, images, index, total) {
        const petal = document.createElement('div');
        petal.className = 'rose-petal-item';

        const img = document.createElement('img');
        const imgIndex = index % images.length;
        img.src = images[imgIndex];
        img.alt = '';
        petal.appendChild(img);

        // Randomized dimensions & kinematics
        const size = Math.floor(18 + Math.random() * 16); // 18px to 34px
        const left = (index / total * 96 + Math.random() * 4).toFixed(1); // Spread across screen width
        const duration = (8 + Math.random() * 7).toFixed(1); // 8s to 15s gentle float
        const delay = (Math.random() * 12).toFixed(1); // 0s to 12s staggered start
        const driftX = (Math.random() * 80 - 40).toFixed(0); // -40px to +40px horizontal sway
        const rotEnd = (Math.random() * 540 - 270).toFixed(0);
        const rotY = (Math.random() * 360).toFixed(0);

        petal.style.width = `${size}px`;
        petal.style.left = `${left}%`;
        petal.style.animationDuration = `${duration}s`;
        petal.style.animationDelay = `${delay}s`;
        petal.style.setProperty('--drift-x', `${driftX}px`);
        petal.style.setProperty('--rot-end', `${rotEnd}deg`);
        petal.style.setProperty('--rot-y', `${rotY}deg`);

        container.appendChild(petal);
    }

    /**
     * MODULE 7: SCROLL REVEAL ANIMATIONS
     * Lightweight IntersectionObserver for soft section reveals
     */
    function initializeScrollAnimations() {
        const revealElements = document.querySelectorAll('.reveal-on-scroll');

        // On mobile & touch screens, reveal immediately for instant, 100% fluid native scrolling
        const isMobileOrTouch = window.innerWidth <= 768 ||
            window.matchMedia('(max-width: 768px)').matches ||
            ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0);

        if (isMobileOrTouch || !('IntersectionObserver' in window)) {
            revealElements.forEach(el => el.classList.add('revealed'));
            return;
        }

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.04,
            rootMargin: '0px 0px 80px 0px' // Triggers smoothly before element enters view
        });

        revealElements.forEach(el => {
            revealObserver.observe(el);
        });
    }
});
