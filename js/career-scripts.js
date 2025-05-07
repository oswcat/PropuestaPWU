/*
  Archivo: career-scripts.js
  Descripción: Scripts específicos para las páginas de carreras en UNIREM.
  Maneja interactividad como acordeones y el carrusel del plan de estudios (Swiper).
  Complementa script.js.
*/

document.addEventListener('DOMContentLoaded', () => {

    // ==================== Funcionalidad para Acordeón de FAQ ====================
    const faqQuestions = document.querySelectorAll('.faq-question');

    if (faqQuestions.length > 0) {
        faqQuestions.forEach(question => {
            question.addEventListener('click', () => {
                const faqItem = question.closest('.faq-item');

                faqItem.classList.toggle('active');

                // Opcional: Cerrar otros acordeones si solo uno debe estar abierto a la vez
                // const parentList = question.closest('.faq-list');
                // if (parentList) {
                //      const allItems = parentList.querySelectorAll('.faq-item');
                //      allItems.forEach(item => {
                //          if (item !== faqItem && item.classList.contains('active')) {
                //              item.classList.remove('active');
                //          }
                //      });
                // }

            });
        });
    }

    // ==================== Funcionalidad para Carrusel del Plan de Estudios (Swiper) ====================

    const curriculumCarousel = document.getElementById('curriculum-carousel-swiper');
    const curriculumTabsNav = document.getElementById('curriculum-tabs-nav'); // Contenedor de los botones

    if (curriculumCarousel && typeof Swiper !== 'undefined') {
        const curriculumSwiper = new Swiper(curriculumCarousel, {
            // Opciones de Swiper
            direction: 'horizontal',
            loop: false,
            speed: 600,
            autoHeight: true,
            slidesPerView: 1,
            spaceBetween: 20, // Espacio entre slides

            // Flechas de navegación
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },

            // Paginación (puntos)
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },

             // Eventos para conectar con los botones de navegación personalizados y actualizar clases activas
             on: {
                 init: function () {
                     // Activar el primer botón al inicializar Swiper
                     const firstButton = curriculumTabsNav ? curriculumTabsNav.querySelector('.tab-button') : null;
                     if (firstButton) {
                         firstButton.classList.add('active');
                     }
                 },
                 slideChange: function () {
                     // Remover clase 'active' de todos los botones
                     if (curriculumTabsNav) {
                         curriculumTabsNav.querySelectorAll('.tab-button').forEach(button => {
                             button.classList.remove('active');
                         });
                     }
                     // Añadir clase 'active' al botón que corresponde a la slide activa
                     const activeIndex = this.activeIndex;
                     if (curriculumTabsNav) {
                         const targetButton = curriculumTabsNav.querySelector(`.tab-button[data-slide-index="${activeIndex}"]`);
                         if (targetButton) {
                             targetButton.classList.add('active');
                             // Opcional: hacer scroll horizontal para que el botón activo sea visible
                             targetButton.scrollIntoView({ behavior: 'smooth', inline: 'center' });
                         }
                     }
                 },
                 // Opcional: Actualizar altura si el contenido cambia dinámicamente
                 // observer: true,
                 // observeParents: true,
             }
        });

        // --- Conectar los botones personalizados al Carrusel ---
        if (curriculumTabsNav) {
            const tabButtons = curriculumTabsNav.querySelectorAll('.tab-button');
            tabButtons.forEach(button => {
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    const slideIndex = parseInt(button.dataset.slideIndex, 10);

                    if (!isNaN(slideIndex)) {
                        // Navegar al slide correspondiente
                        curriculumSwiper.slideTo(slideIndex);
                    }
                });
            });
        }


    } else {
        // Fallback si Swiper no carga (ocultar botones, mostrar slides estáticamente)
        if (curriculumTabsNav) {
            curriculumTabsNav.style.display = 'none';
        }
        // Mostrar todas las slides como bloques estáticos
        document.querySelectorAll('.curriculum-slide').forEach(slide => {
            slide.style.display = 'block';
            slide.style.minHeight = 'auto'; // Eliminar altura mínima para el layout estático
            slide.style.boxShadow = 'none'; // Quitar sombra si no están en carrusel
            slide.style.backgroundColor = 'transparent'; // Fondo transparente
            slide.style.padding = '20px 0'; // Ajustar padding

            // Asegurarse de que los títulos de slide tengan margen superior si no es la primera
            const prevSibling = slide.previousElementSibling;
            if (prevSibling && prevSibling.classList && prevSibling.classList.contains('curriculum-slide')) {
                 slide.style.marginTop = '40px'; // Espacio entre secciones estáticas
            }

        });
         // Ocultar elementos de navegación de Swiper si existen en el HTML pero Swiper falló
         document.querySelectorAll('.swiper-pagination, .swiper-button-prev, .swiper-button-next').forEach(navEl => {
              navEl.style.display = 'none';
         });

        console.error("Swiper no se inicializó o el contenedor no existe. Mostrando contenido del currículo de forma estática.");

        // Puedes añadir un mensaje de error visual para el usuario si lo consideras necesario
        // const curriculumSection = document.querySelector('.curriculum-section');
        // if(curriculumSection) {
        //     const errorDiv = document.createElement('div');
        //     errorDiv.textContent = 'Hubo un error al cargar el plan de estudios interactivo. Por favor, recarga la página o descarga el PDF.';
        //     errorDiv.style.color = 'red';
        //     errorDiv.style.textAlign = 'center';
        //     errorDiv.style.marginTop = '20px';
        //     curriculumSection.querySelector('.container').appendChild(errorDiv);
        // }
    }

});