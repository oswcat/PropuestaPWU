document.addEventListener('DOMContentLoaded', () => {

    // =============================================
    // ==           MENÚ MÓVIL SUPERIOR           ==
    // =============================================
    const menuToggle = document.getElementById('menu-toggle');
    const navLinksContainer = document.getElementById('nav-links');

    if (menuToggle && navLinksContainer) {
        menuToggle.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
            menuToggle.classList.toggle('active');
            const isExpanded = navLinksContainer.classList.contains('active');
            menuToggle.setAttribute('aria-expanded', isExpanded);
            // Prevenir scroll del body cuando el menú está abierto
            document.body.style.overflow = isExpanded ? 'hidden' : '';
            // Si se cierra el menú, cerrar también los dropdowns abiertos
            if (!isExpanded) {
                closeAllMobileDropdowns();
            }
        });

        // Cerrar menú si se hace click en un link (que no sea dropdown) o sublink
        navLinksContainer.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                const listItem = link.closest('li');
                const isDropdownTrigger = listItem && listItem.classList.contains('has-dropdown') && link.parentElement === listItem; // Solo el trigger principal
                const isInDropdownMenu = link.closest('.dropdown-menu');

                 // Cerrar si es link normal (no trigger) y el menú está activo
                if (!isDropdownTrigger && navLinksContainer.classList.contains('active')) {
                     // Si es un link de submenú, cerrar siempre
                     if (isInDropdownMenu) {
                        closeMobileNav();
                     } else {
                         // Si es un link principal (ej: #inicio) cerrar solo si es ancla
                        const href = link.getAttribute('href');
                        if (href && href.startsWith('#')) {
                            closeMobileNav();
                        }
                        // Si es un link a otra página (inscripciones.html), NO cerrar aquí, la página cambiará.
                     }
                }
            });
        });

        // Manejar apertura/cierre de dropdowns en móvil
        const dropdownTriggers = navLinksContainer.querySelectorAll('.has-dropdown > a');
        dropdownTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                // Solo actuar si estamos en vista móvil (navLinksContainer tiene clase 'active')
                if (navLinksContainer.classList.contains('active')) {
                    // Prevenir comportamiento de link si es solo para abrir/cerrar
                     if (trigger.getAttribute('href') && trigger.getAttribute('href').startsWith('#')) {
                         e.preventDefault();
                     }
                    const parentLi = trigger.parentElement;
                    const isOpen = parentLi.classList.contains('open');

                    // Opcional: cerrar otros dropdowns antes de abrir este
                    // closeAllMobileDropdowns(parentLi);

                    parentLi.classList.toggle('open');
                    trigger.setAttribute('aria-expanded', !isOpen);
                }
                 // En Desktop, el hover se encarga, no necesitamos JS para abrir/cerrar al click.
            });
        });

        function closeMobileNav() {
             navLinksContainer.classList.remove('active');
             menuToggle.classList.remove('active');
             menuToggle.setAttribute('aria-expanded', 'false');
             document.body.style.overflow = ''; // Restaurar scroll
             closeAllMobileDropdowns(); // Asegurarse que los dropdowns se cierren
        }

        function closeAllMobileDropdowns(keepOpenLi = null) {
            navLinksContainer.querySelectorAll('.has-dropdown').forEach(li => {
                 // Cerrar solo si no es el que queremos mantener abierto (si aplica)
                 if (li !== keepOpenLi) {
                    li.classList.remove('open');
                    // Asegurarse que el <a> directo tenga el aria-expanded correcto
                    const directLink = li.querySelector(':scope > a');
                    if (directLink) {
                       directLink.setAttribute('aria-expanded', 'false');
                    }
                 }
            });
        }
    }

    // =============================================
    // ==     NAVBAR SUPERIOR (OCULTAR/MOSTRAR)   ==
    // =============================================
    const navbar = document.getElementById('main-navbar');
    if (navbar) {
        let lastScrollTop = 0;
        const delta = 10; // Umbral de scroll más generoso
        const navbarHeight = navbar.offsetHeight;
        let didScroll; // Flag para optimizar

        window.addEventListener('scroll', () => {
            didScroll = true;
        }, { passive: true }); // Listener pasivo para rendimiento

        setInterval(() => {
            if (didScroll) {
                hasScrolled();
                didScroll = false;
            }
        }, 150); // Chequear scroll más frecuentemente

        function hasScrolled() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            // No hacer nada si el scroll es muy pequeño
            if (Math.abs(lastScrollTop - scrollTop) <= delta) return;

            // Si scrollea hacia abajo Y está más allá de la altura de la navbar
            if (scrollTop > lastScrollTop && scrollTop > navbarHeight) {
                // Ocultar navbar
                navbar.classList.add('navbar--hidden');
            } else {
                // Si scrollea hacia arriba O está cerca del top
                if (scrollTop < lastScrollTop || scrollTop <= delta) {
                     navbar.classList.remove('navbar--hidden');
                }
            }
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // Manejo para scroll hacia arriba o negativo
        }
    }

    // =============================================
    // ==       TYPED.JS (EFECTO ESCRITURA)       ==
    // =============================================
    // SE HA MOVIDO AL SCRIPT INLINE EN EL HTML
    // para que use las frases específicas de la página de inicio.
    // Dejamos esto comentado o eliminado para evitar conflictos.
    /*
    const typedTarget = document.getElementById('typed-output');
    if (typedTarget && typeof Typed !== 'undefined') {
        try {
            const typed = new Typed('#typed-output', {
                strings: [
                    "Frase genérica 1.", // Estas no se usarían en el index
                    "Frase genérica 2."
                ],
                typeSpeed: 50, backSpeed: 30, backDelay: 1500, startDelay: 500, loop: true, showCursor: true, cursorChar: '|',
            });
        } catch (error) {
            console.error("Error al inicializar Typed.js (general):", error);
            if (typedTarget) { typedTarget.textContent = "Texto fallback."; }
        }
    } else if (typedTarget) {
        // console.warn("Typed.js no está definido o el elemento target no existe.");
        // typedTarget.textContent = "Texto fallback.";
    }
    */

    // =============================================
    // ==    NAVEGACIÓN VERTICAL TIMELINE LOGIC   ==
    // =============================================
    const timelineNav = document.getElementById('timeline-nav');
    const timelineNavLinks = timelineNav ? timelineNav.querySelectorAll('ul li a') : [];
    // Asegurarse que 'sections' incluye header y footer para que 'Inicio' e 'Información' funcionen
    const sections = document.querySelectorAll('section[id], header[id], footer[id]');

    if (timelineNav && timelineNavLinks.length > 0 && sections.length > 0) {
         // Ajustar rootMargin: más negativo significa que la sección debe estar más arriba para activarse.
         // '-40% 0px -60% 0px' -> activa cuando el top de la sección está entre el 40% y 60% de la altura del viewport
        const observerOptions = {
            root: null,
            rootMargin: '-40% 0px -60% 0px', // Activa en una franja central de la pantalla
            threshold: 0 // Apenas entre en el margen
        };

        let currentActiveSectionId = null; // Track sección activa actual

        const sectionObserver = new IntersectionObserver((entries, observer) => {
            let bestIntersectingEntry = null;

             // Encontrar la entrada que esté más centrada o más visible dentro del rootMargin
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Dar prioridad si ya hay una activa o si es la primera
                     if (!bestIntersectingEntry || entry.intersectionRatio > bestIntersectingEntry.intersectionRatio) {
                        bestIntersectingEntry = entry;
                    }
                }
            });

             let activeSectionId;
             if (bestIntersectingEntry) {
                 activeSectionId = bestIntersectingEntry.target.id;
             } else {
                 // Si nada interseca claramente dentro del margen, buscar la más cercana arriba
                 let closestSectionAbove = null;
                 let minDistanceAbove = Infinity;

                 sections.forEach(section => {
                     const rect = section.getBoundingClientRect();
                     if (rect.bottom < (window.innerHeight * 0.4)) { // Sección claramente arriba de la zona de activación
                         const distance = Math.abs(rect.bottom - (window.innerHeight * 0.4)); // Distancia a la zona
                         if (distance < minDistanceAbove) {
                             minDistanceAbove = distance;
                             closestSectionAbove = section;
                         }
                     }
                 });
                 activeSectionId = closestSectionAbove ? closestSectionAbove.id : 'inicio'; // Default a inicio
             }


             // Forzar 'inicio' si estamos muy cerca de la parte superior
            if (window.pageYOffset < window.innerHeight * 0.5) {
                 activeSectionId = 'inicio';
             }


            // Solo actualizar si la sección activa ha cambiado
            if (activeSectionId && activeSectionId !== currentActiveSectionId) {
                currentActiveSectionId = activeSectionId;
                timelineNavLinks.forEach(link => {
                    // Usar dataset.section que pusimos en el HTML
                    if (link.dataset.section === activeSectionId) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }

            // Lógica para mostrar/ocultar el timeline nav basado en scroll
            const heroSection = document.getElementById('inicio');
            const heroRect = heroSection ? heroSection.getBoundingClientRect() : null;
            // Mostrar la nav cuando la parte inferior del hero esté aprox 70% arriba del viewport
            const showNavThreshold = window.innerHeight * 0.7;
            if (heroRect && heroRect.bottom < showNavThreshold) {
                timelineNav.classList.add('visible');
            } else {
                timelineNav.classList.remove('visible');
                 // Si se oculta, asegurarse que ningún link quede activo (opcional)
                 // timelineNavLinks.forEach(link => link.classList.remove('active'));
                 // currentActiveSectionId = null; // Resetear sección activa
            }

        }, observerOptions);

        sections.forEach(section => {
            sectionObserver.observe(section);
        });

        // Smooth scroll para los links del timeline
        timelineNavLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    let offset = 0;
                    const topNavbar = document.getElementById('main-navbar');
                    // Considerar el offset solo si el navbar es sticky y está visible
                    if (topNavbar && getComputedStyle(topNavbar).position === 'sticky' && !topNavbar.classList.contains('navbar--hidden')) {
                         offset = topNavbar.offsetHeight;
                    }

                    const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
                    const offsetPosition = elementPosition - offset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });

                    // Actualizar visualmente el estado activo inmediatamente (opcional)
                     timelineNavLinks.forEach(l => l.classList.remove('active'));
                     link.classList.add('active');
                     currentActiveSectionId = link.dataset.section;
                }
            });
        });
    } else {
        // Si no hay nav o links/secciones, ocultar la nav
         if(timelineNav) timelineNav.style.display = 'none';
    }

}); // Fin de DOMContentLoaded