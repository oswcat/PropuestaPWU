// Cita-script.js
// ==========================================================================
// LÓGICA DEL FRONTEND PARA LA PÁGINA DE AGENDAMIENTO UNIREM
// Usando Cloudflare Worker como Proxy
// Incluye campos para Oferta Educativa y Modalidad de Contacto
// ==========================================================================

// IMPORTANTE: Asegúrate de que esta URL apunte a tu Cloudflare Worker desplegado
const PROXY_WORKER_URL = 'https://unirem-proxy-mk2.oswaldomartinezalvarez.workers.dev/'; // O tu URL de Worker correcta

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const monthYearDisplay = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const calendarGrid = document.querySelector('.calendar-grid');
    const selectedDateDisplay = document.querySelector('.selected-date-display');
    const timeSlotsContainer = document.querySelector('.time-slots');
    const userInfoFormDiv = document.querySelector('.user-info-form');
    const bookingFormStatus = document.getElementById('booking-form-status');
    const confirmBtn = document.getElementById('btn-confirmar');

    const inputNombre = document.getElementById('input-nombre');
    const inputEmail = document.getElementById('input-email');
    const inputPhone = document.getElementById('input-phone');
    const selectOferta = document.getElementById('select-oferta'); // <<< NUEVO CAMPO
    const selectModalidad = document.getElementById('select-modalidad'); // <<< NUEVO CAMPO
    const inputFormSource = document.querySelector('.user-info-form input[name="form_source"]');
    // const inputCarrera = document.getElementById('input-carrera'); // Si lo tenías antes para otra cosa
    // const inputMensaje = document.getElementById('input-mensaje'); 

    // --- Nombres para UI ---
    const DAY_NAMES_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    // --- ESTADO ---
    let currentDate = new Date();
    let selectedDate = null; // YYYY-MM-DD
    let selectedTime = null; // HH:MM
    let formInteractionStarted = false; // Para GA event 'form_start'

    // --- FUNCIONES ---
    function renderCalendar(year, month) {
        const firstDayOfMonth = new Date(year, month, 1);
        const firstDayOfWeek = firstDayOfMonth.getDay();
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

        monthYearDisplay.textContent = `${MONTH_NAMES[month]} ${year}`;
        monthYearDisplay.setAttribute('aria-live', 'polite');

        while (calendarGrid.children.length > 7) {
            if (!calendarGrid.lastChild.classList.contains('day-name')) {
                calendarGrid.removeChild(calendarGrid.lastChild);
            } else { break; }
        }

        const lastDayOfPrevMonth = new Date(year, month, 0).getDate();
        for (let i = 0; i < firstDayOfWeek; i++) {
            const dayElement = document.createElement('div');
            dayElement.textContent = lastDayOfPrevMonth - (firstDayOfWeek - 1) + i;
            dayElement.classList.add('day', 'outside-month');
            calendarGrid.appendChild(dayElement);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let day = 1; day <= lastDayOfMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.textContent = day;
            dayElement.classList.add('day', 'current-month');
            const fullDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            dayElement.dataset.date = fullDate;
            const dateToCompare = new Date(fullDate + 'T00:00:00');

            if (dateToCompare < today) {
                dayElement.classList.add('past-day');
            } else {
                dayElement.classList.add('available');
            }
            if (selectedDate === fullDate) {
                dayElement.classList.add('selected');
            }
            calendarGrid.appendChild(dayElement);
        }

        const totalDaysRendered = firstDayOfWeek + lastDayOfMonth;
        const remainingCells = 42 - totalDaysRendered;
        for (let i = 1; i <= remainingCells; i++) {
            const dayElement = document.createElement('div');
            dayElement.textContent = i;
            dayElement.classList.add('day', 'outside-month');
            calendarGrid.appendChild(dayElement);
        }
    }

    async function fetchAndRenderTimeSlots(dateString) {
        selectedDateDisplay.textContent = 'Cargando horarios...';
        timeSlotsContainer.innerHTML = '<div class="spinner-center"><i class="fas fa-circle-notch fa-spin fa-2x"></i></div>';
        userInfoFormDiv.style.display = 'none';
        confirmBtn.disabled = true;
        displayFormStatus('');
        selectedTime = null;

        if (!PROXY_WORKER_URL || PROXY_WORKER_URL.length < 30 || PROXY_WORKER_URL.includes("URL_DE_TU_WORKER_AQUI")) { 
            const errorMsg = 'Error de configuración: URL del proxy no especificada correctamente.';
            console.error(errorMsg, "URL actual:", PROXY_WORKER_URL);
            selectedDateDisplay.textContent = 'Error de Configuración';
            timeSlotsContainer.innerHTML = `<div class="no-date-selected">${errorMsg}</div>`;
            displayFormStatus(errorMsg, false);
            checkFormAndSelection();
            return;
        }

        try {
            const response = await fetch(`${PROXY_WORKER_URL}?action=getSlots&date=${dateString}`);
            if (!response.ok) {
                let errorMsg = `Error del servidor proxy o backend: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData && (errorData.error || errorData.message)) {
                         errorMsg = errorData.error || errorData.message;
                    }
                } catch (parseError) { /* ignora si no es json */ }
                throw new Error(errorMsg);
            }
            const slotsDataFromGAS = await response.json();
            if (slotsDataFromGAS.error) { 
                throw new Error(slotsDataFromGAS.error);
            }

            const dateObj = new Date(dateString + 'T00:00:00Z'); 
            const dayOfWeek = DAY_NAMES_LONG[dateObj.getUTCDay()];
            const dayOfMonth = dateObj.getUTCDate();
            const monthName = MONTH_NAMES[dateObj.getUTCMonth()];
            selectedDateDisplay.textContent = `${dayOfWeek}, ${dayOfMonth} de ${monthName}`;
            
            renderSlotsBasedOnData(slotsDataFromGAS, dateString);

            if (typeof gtag === 'function' && slotsDataFromGAS && slotsDataFromGAS.length > 0) {
                const nowForGA = new Date();
                const isTodayForGA = (dateString === `${nowForGA.getFullYear()}-${(nowForGA.getMonth() + 1).toString().padStart(2, '0')}-${nowForGA.getDate().toString().padStart(2, '0')}`);
                let availableSlotsClickable = slotsDataFromGAS.filter(s => {
                    if (!s.isAvailable) return false;
                    if (isTodayForGA) {
                        const [h, m] = s.time.split(':').map(Number);
                        const slotDt = new Date(nowForGA.getFullYear(), nowForGA.getMonth(), nowForGA.getDate(), h, m);
                        return slotDt >= nowForGA;
                    }
                    return true;
                }).length;

                gtag('event', 'view_time_slots', {
                    'event_category': 'Calendar Interaction',
                    'selected_calendar_date': selectedDate,
                    'time_slots_displayed': slotsDataFromGAS.length,
                    'time_slots_available_clickable': availableSlotsClickable
                });
            }

        } catch (error) {
            console.error('Error al obtener horarios:', error);
            selectedDateDisplay.textContent = 'Error al Cargar Horarios';
            timeSlotsContainer.innerHTML = `<div class="no-date-selected">No se pudieron cargar los horarios. ${error.message || 'Intenta de nuevo más tarde.'}</div>`;
            displayFormStatus('Error al cargar horarios. Intenta de nuevo.', false);
        }
        checkFormAndSelection();
    }

    function renderSlotsBasedOnData(slotsData, dateString) {
        timeSlotsContainer.innerHTML = ''; 
        selectedTime = null;

        if (!slotsData || !Array.isArray(slotsData)) { // Asegurarse que slotsData sea un array
            console.error("renderSlotsBasedOnData: slotsData no es un array o está vacío.", slotsData);
            timeSlotsContainer.innerHTML = '<div class="no-date-selected">Error al procesar horarios.</div>';
            userInfoFormDiv.style.display = 'none';
            timeSlotsContainer.classList.add('has-message');
            checkFormAndSelection();
            return;
        }
        if (slotsData.length === 0) {
            timeSlotsContainer.innerHTML = '<div class="no-date-selected">No hay horarios programados para esta fecha.</div>';
            userInfoFormDiv.style.display = 'none';
            timeSlotsContainer.classList.add('has-message');
        } else {
            const now = new Date();
            const todayDateString = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
            const isToday = (dateString === todayDateString);
            let availableSlotsExist = false;

            slotsData.forEach(slotInfo => {
                if (typeof slotInfo !== 'object' || slotInfo === null || typeof slotInfo.time === 'undefined' || typeof slotInfo.isAvailable === 'undefined') {
                    console.warn("renderSlotsBasedOnData: Se encontró un objeto de slot inválido:", slotInfo);
                    return; // Saltar este slot inválido
                }

                const timeSlotElement = document.createElement('button');
                timeSlotElement.textContent = slotInfo.time;
                timeSlotElement.classList.add('time-slot');
                timeSlotElement.dataset.time = slotInfo.time;
                let slotIsActuallyRenderedAsAvailable = slotInfo.isAvailable;

                if (isToday && slotIsActuallyRenderedAsAvailable) {
                    const [slotHour, slotMinute] = slotInfo.time.split(':').map(Number);
                    const slotDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), slotHour, slotMinute, 0, 0);
                    if (slotDateTime < now) {
                        slotIsActuallyRenderedAsAvailable = false;
                        timeSlotElement.title = "Horario ya transcurrido";
                    }
                }

                if (!slotIsActuallyRenderedAsAvailable) {
                    timeSlotElement.classList.add('disabled');
                    timeSlotElement.disabled = true;
                    if (slotInfo.isAvailable && isToday) {
                         timeSlotElement.title = "Horario ya transcurrido";
                    } else if (!slotInfo.isAvailable) {
                        timeSlotElement.title = "Horario completo";
                    }
                } else {
                    availableSlotsExist = true;
                }
                timeSlotsContainer.appendChild(timeSlotElement);
            });

            if (availableSlotsExist) {
                userInfoFormDiv.style.display = 'block';
            } else {
                if (slotsData.length > 0) { 
                    timeSlotsContainer.innerHTML = '<div class="no-date-selected">No hay horarios disponibles para esta fecha y hora.</div>';
                } else { 
                     timeSlotsContainer.innerHTML = '<div class="no-date-selected">No hay horarios programados para esta fecha.</div>';
                }
                userInfoFormDiv.style.display = 'none';
            }
            timeSlotsContainer.classList.remove('has-message');
        }
        checkFormAndSelection(); 
    }

    function handleDayClick(event) {
        const clickedDay = event.target.closest('.day');
        if (!clickedDay || clickedDay.classList.contains('outside-month') || clickedDay.classList.contains('past-day')) {
            return;
        }
        if (clickedDay.classList.contains('selected') && selectedDate === clickedDay.dataset.date) {
             return;
        }
        const previouslySelectedDay = calendarGrid.querySelector('.day.selected');
        if (previouslySelectedDay) previouslySelectedDay.classList.remove('selected');
        clickedDay.classList.add('selected');
        selectedDate = clickedDay.dataset.date;

        if (typeof gtag === 'function' && selectedDate) {
            gtag('event', 'select_date', {
                'event_category': 'Calendar Interaction',
                'selected_calendar_date': selectedDate
            });
        }
        fetchAndRenderTimeSlots(selectedDate);
        displayFormStatus('');
    }

    function handleTimeSlotClick(event) {
        const clickedTimeSlot = event.target.closest('.time-slot:not(.disabled)');
        if (!clickedTimeSlot) return;
        if (clickedTimeSlot.classList.contains('selected')) return;
        const previouslySelectedTime = timeSlotsContainer.querySelector('.time-slot.selected');
        if (previouslySelectedTime) previouslySelectedTime.classList.remove('selected');
        clickedTimeSlot.classList.add('selected');
        selectedTime = clickedTimeSlot.dataset.time;

        if (typeof gtag === 'function' && selectedTime) {
            gtag('event', 'select_time_slot', {
                'event_category': 'Calendar Interaction',
                'selected_calendar_date': selectedDate,
                'selected_time': selectedTime
            });
        }
        checkFormAndSelection();
    }

    function checkFormAndSelection() {
        const nameFilled = inputNombre && inputNombre.value.trim() !== '';
        const emailFilled = inputEmail && inputEmail.value.trim() !== '';
        const phoneFilled = inputPhone && inputPhone.value.trim() !== '';
        const emailValid = emailFilled ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputEmail.value.trim()) : false;
        
        const ofertaSelected = selectOferta && selectOferta.value !== ''; // <<< VALIDACIÓN AÑADIDA
        const modalidadSelected = selectModalidad && selectModalidad.value !== ''; // <<< VALIDACIÓN AÑADIDA

        const dateSelected = selectedDate !== null;
        const timeSelected = selectedTime !== null;
        
        const isReadyToConfirm = dateSelected && timeSelected && 
                                 nameFilled && emailValid && phoneFilled &&
                                 ofertaSelected && modalidadSelected; // <<< CONDICIONES AÑADIDAS

        if (confirmBtn) {
            confirmBtn.disabled = !isReadyToConfirm;
            let btnText = 'Selecciona Fecha y Hora';
            if (isReadyToConfirm) {
                btnText = 'Confirmar Cita';
            } else if (dateSelected && timeSelected) {
                if (!nameFilled) btnText = 'Ingresa tu Nombre';
                else if (!emailFilled) btnText = 'Ingresa tu Correo';
                else if (!emailValid) btnText = 'Correo Inválido';
                else if (!phoneFilled) btnText = 'Ingresa tu Teléfono';
                else if (!ofertaSelected) btnText = 'Selecciona Oferta Educativa'; // <<< MENSAJE AÑADIDO
                else if (!modalidadSelected) btnText = 'Selecciona Modalidad'; // <<< MENSAJE AÑADIDO
                else btnText = 'Completa tus Datos';
            } else if (dateSelected) {
                btnText = 'Selecciona una Hora';
            }
            const iconClass = isReadyToConfirm ? 'bi-calendar-check-fill' : 'bi-calendar';
            const iconPath = isReadyToConfirm ? '<path d="M4 .5a.5.5 0 0 0-1 0V1H2a2 2 0 0 0-2 2v1h16V3a2 2 0 0 0-2-2h-1V.5a.5.5 0 0 0-1 0V1H4V.5zm11.5 2v10.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V2.5a2 2 0 0 1 2-2H2v12.5A1.5 1.5 0 0 0 3.5 16h11a1.5 1.5 0 0 0 1.5-1.5V2.5h-1z"/><path d="M10.854 7.854a.5.5 0 0 0-.708-.708L7.5 9.793 6.354 8.646a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l3-3z"/>' : '<path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>';
            confirmBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi ${iconClass}" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 8px;"> ${iconPath} </svg> ${btnText}`;
        }
    }

    function displayFormStatus(message, isSuccess = false) {
        if (!bookingFormStatus) return;
        bookingFormStatus.textContent = message;
        bookingFormStatus.classList.remove('success', 'error', 'visible');
        if (message) {
            bookingFormStatus.classList.add('visible');
            bookingFormStatus.classList.add(isSuccess ? 'success' : 'error');
        }
    }

    async function sendBookingData(bookingData) {
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="margin-right: 8px;"></i> Enviando...';
        }
        displayFormStatus('');

        if (!PROXY_WORKER_URL || PROXY_WORKER_URL.length < 30 || PROXY_WORKER_URL.includes("URL_DE_TU_WORKER_AQUI")) {
            displayFormStatus('Error de configuración: URL del proxy no especificada correctamente.', false);
            if(confirmBtn){ confirmBtn.disabled = false; checkFormAndSelection(); }
            return;
        }

        try {
            const response = await fetch(PROXY_WORKER_URL, { // Usar PROXY_WORKER_URL
                method: 'POST',
                cache: 'no-cache',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(bookingData)
            });

            const result = await response.json(); 

            if (response.ok && result.success) {
                displayFormStatus(result.message || '¡Tu solicitud de cita ha sido enviada con éxito! Revisa tu correo.', true);
                if (typeof gtag === 'function') {
                     gtag('event', 'generate_lead', {
                         'event_category': 'Form Submission',
                         'event_label': 'Cita Form Submitted',
                         'form_source': bookingData.form_source,
                         'booking_date': bookingData.fecha_reserva,
                         'booking_time': bookingData.hora_reserva,
                         'oferta_educativa': bookingData.oferta_educativa, // <<< GA AÑADIDO
                         'modalidad_contacto': bookingData.modalidad_contacto // <<< GA AÑADIDO
                     });
                }
                setTimeout(resetFormAndCalendar, 4000);
            } else {
                if (typeof gtag === 'function') {
                    gtag('event', 'form_submission_error', {
                        'event_category': 'Form Interaction',
                        'error_message': result.message || `Error del servidor: ${response.status}`,
                        'booking_date_attempt': bookingData.fecha_reserva,
                        'booking_time_attempt': bookingData.hora_reserva
                    });
                }
                throw new Error(result.message || `Error del servidor: ${response.status}`);
            }
        } catch (error) {
            console.error('Error al enviar datos:', error);
            displayFormStatus(error.message || 'Hubo un error al procesar tu solicitud.', false);
            if (confirmBtn) { confirmBtn.disabled = false; checkFormAndSelection(); }
        }
    }

    function resetFormAndCalendar() {
        selectedDate = null;
        selectedTime = null;
        if(inputNombre) inputNombre.value = '';
        if(inputEmail) inputEmail.value = '';
        if(inputPhone) inputPhone.value = '';
        if(selectOferta) selectOferta.value = ''; // <<< RESET AÑADIDO
        if(selectModalidad) selectModalidad.value = ''; // <<< RESET AÑADIDO
        formInteractionStarted = false;
        
        if(userInfoFormDiv) userInfoFormDiv.style.display = 'none';
        
        const prevSelDay = calendarGrid.querySelector('.day.selected');
        if (prevSelDay) prevSelDay.classList.remove('selected');
        
        selectedDateDisplay.textContent = '';
        timeSlotsContainer.innerHTML = '<div class="no-date-selected">Selecciona una fecha en el calendario para ver los horarios disponibles.</div>';
        timeSlotsContainer.classList.add('has-message');

        displayFormStatus('');
        checkFormAndSelection(); 
    }
    
    function handleFormInteraction() {
        if (!formInteractionStarted && typeof gtag === 'function') {
            gtag('event', 'form_start', {
                'event_category': 'Form Interaction',
                'form_name': 'Cita UNIREM'
            });
            formInteractionStarted = true; 
        }
    }

    // --- EVENT LISTENERS ---
    if (prevMonthBtn) { /* ... código existente ... */ }
    if (nextMonthBtn) { /* ... código existente ... */ }
    if (calendarGrid) calendarGrid.addEventListener('click', handleDayClick);
    if (timeSlotsContainer) timeSlotsContainer.addEventListener('click', handleTimeSlotClick);
    
    // Inputs básicos
    if (inputNombre) inputNombre.addEventListener('input', () => { handleFormInteraction(); checkFormAndSelection(); });
    if (inputEmail) inputEmail.addEventListener('input', () => { handleFormInteraction(); checkFormAndSelection(); });
    if (inputPhone) inputPhone.addEventListener('input', () => { handleFormInteraction(); checkFormAndSelection(); });
    
    // Nuevos selects usan 'change' event
    if (selectOferta) selectOferta.addEventListener('change', () => { handleFormInteraction(); checkFormAndSelection(); }); // <<< LISTENER AÑADIDO
    if (selectModalidad) selectModalidad.addEventListener('change', () => { handleFormInteraction(); checkFormAndSelection(); }); // <<< LISTENER AÑADIDO

    if (confirmBtn) {
        confirmBtn.addEventListener('click', (event) => {
            console.log("Botón 'Confirmar Cita' CLICADO"); 
            event.preventDefault();
            if(confirmBtn.disabled) {
                console.log("Botón está deshabilitado, no se hace nada.");
                return;
            }
            console.log("Preparando bookingData...");
            const bookingData = {
                form_source: inputFormSource ? inputFormSource.value : 'cita_calendario_default',
                fecha_reserva: selectedDate,
                hora_reserva: selectedTime,
                nombre: inputNombre ? inputNombre.value.trim() : '',
                email: inputEmail ? inputEmail.value.trim() : '',
                telefono: inputPhone ? inputPhone.value.trim() : '',
                oferta_educativa: selectOferta ? selectOferta.value : '', // <<< CAMPO AÑADIDO A BOOKING DATA
                modalidad_contacto: selectModalidad ? selectModalidad.value : '' // <<< CAMPO AÑADIDO A BOOKING DATA
            };
            console.log("bookingData:", bookingData);

            // VALIDACIÓN ACTUALIZADA
            if (!selectedDate || !selectedTime || 
                !bookingData.nombre || 
                !bookingData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingData.email) || 
                !bookingData.telefono ||
                !bookingData.oferta_educativa || // <<< VALIDACIÓN AÑADIDA
                !bookingData.modalidad_contacto) { // <<< VALIDACIÓN AÑADIDA
                 console.error("VALIDACIÓN FALLÓ: Faltan datos o campos de selección no elegidos.");
                 displayFormStatus('Completa todos los campos requeridos correctamente.', false);
                 checkFormAndSelection();
                 return;
            }
            console.log("Validación pasada, llamando a sendBookingData...");
            sendBookingData(bookingData);
        });
    } else {
        console.error("Elemento del botón #btn-confirmar NO encontrado.");
    }

    // --- INICIALIZACIÓN ---
    console.log("Elemento confirmBtn al final de DOMContentLoaded:", document.getElementById('btn-confirmar'));
    renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
    timeSlotsContainer.innerHTML = '<div class="no-date-selected">Selecciona una fecha en el calendario para ver los horarios disponibles.</div>';
    timeSlotsContainer.classList.add('has-message');
    checkFormAndSelection();

    const todayForInit = new Date(); todayForInit.setDate(1); todayForInit.setHours(0,0,0,0);
    const currentCalendarMonthForInit = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    if (prevMonthBtn && currentCalendarMonthForInit <= todayForInit) {
        prevMonthBtn.disabled = true;
    }
});