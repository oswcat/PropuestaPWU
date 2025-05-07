document.addEventListener('DOMContentLoaded', () => {
    const btnPrepa = document.getElementById('btn-prepa');
    const btnBachillerato = document.getElementById('btn-bachillerato');
    const contentSlider = document.querySelector('.content-slider'); // Contenedor que se desliza

    // Función para actualizar los botones activos
    function updateActiveButton(activeButton) {
        btnPrepa.classList.remove('active');
        btnBachillerato.classList.remove('active');
        activeButton.classList.add('active');
    }

    // Evento para el botón Prepa UNAM
    btnPrepa.addEventListener('click', () => {
        // Elimina la clase que mueve el slider para mostrar Prepa
        contentSlider.classList.remove('show-bachillerato');
        updateActiveButton(btnPrepa);
    });

    // Evento para el botón Bachillerato General
    btnBachillerato.addEventListener('click', () => {
        // Añade la clase que mueve el slider para mostrar Bachillerato
        contentSlider.classList.add('show-bachillerato');
        updateActiveButton(btnBachillerato);
    });

    // Establecer el estado inicial (mostrar Prepa)
    // La clase 'active' ya está puesta en el HTML para btn-prepa
    // y el slider por defecto está en translateX(0)
    // Solo nos aseguramos de que si no está en show-bachillerato, se quede así
     contentSlider.classList.remove('show-bachillerato');
     updateActiveButton(btnPrepa);

});