// Grab all DOM id elems
const selectedApartment = JSON.parse(localStorage.getItem('selectedApartment'));

if (selectedApartment && typeof selectedApartment.guests === 'string') {
    selectedApartment.guests = JSON.parse(selectedApartment.guests);
}

const host = JSON.parse(localStorage.getItem('host'));
const apartmentForm = document.getElementById('apartment-form');
const formTitle = document.getElementById('form-title');
const addEditApartmentBtn = document.getElementById('add-edit-apartment-btn');
const cancelBtn = document.getElementById('cancel-btn');

console.log(host)

// This function will set the minimum date available in the date inputs
const setMinimumDate = () => {
    const startDateInput = document.getElementById('start_date');
    const endDateInput = document.getElementById('end_date');

    const today = new Date();
    today.setDate(today.getDate() + 1) // Allow starting tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Allow starting the day before tomorrow

    const startMinDate = today.toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' });
    const endMinDate = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' });

    startDateInput.setAttribute('min', startMinDate);
    endDateInput.setAttribute('min', endMinDate);
}

// Function that will populate the form data inputs
const handleDOMFormData = () => {
    setMinimumDate();

    let labelText = 'Adicionar apartamento';
    if (selectedApartment) {
        labelText = 'Editar apartamento';
    }
    document.title = labelText
    formTitle.innerText = labelText
    addEditApartmentBtn.innerText = labelText;

    getUsers();

    if (selectedApartment) {
        document.getElementById('motivo').value = selectedApartment.motivo;
        document.getElementById('data').value = selectedApartment.data;
        document.getElementById('hora_inicio').value = selectedApartment.hora_inicio;

        const startTime = new Date(`${selectedApartment.data}T${selectedApartment.hora_inicio}`);
        const endTime = new Date(`${selectedApartment.data}T${selectedApartment.hora_fim}`);
        const duration = (endTime - startTime) / 60000 // Duration in minutes

        // Set the duration to the dropdown
        const durationSelect = document.getElementById('duration');
        for (let i = 0; i < durationSelect.options.length; i++) {
            if (parseInt(durationSelect.options[i].value) === duration) {
                durationSelect.selectedIndex = i;
                break;
            }
        }
    }
}

// Function that will call api to fetch all users from database
const getUsers = async () => {
    $.get('api/index.php?action=get_users', (data, status) => {
        if (status === 'success') {
            const parsedData = JSON.parse(data);
            populateUsers(parsedData);
        } else {
            console.log('Failed to fetch guests from api')
        }
    })
}

/**
 * This function will populate users dropdown select
 * @param {array object} users 
 */
const populateUsers = (users) => {
    const usersSelect = document.getElementById('users');
    const keyHostSelect = document.getElementById('key-host');
    console.log(users);
    users.map((user) => {
        var option1 = document.createElement('option');
        option1.innerText = user.NAME;
        option1.value = user.NAME;

        // Check if the user is in the selectedGuests array and set the selected attribute
        if (selectedApartment) {
            const trimmedParticipants = selectedApartment.participantes.map(participant => participant.trim());
            if (trimmedParticipants.includes(user.NAME.trim())) {
                option1.selected = true;
            }
        }

        usersSelect.appendChild(option1) // Append option to select

        var option2 = document.createElement('option');
        option2.innerText = user.NAME;
        option2.value = user.NAME;

        keyHostSelect.appendChild(option2);
    });

    // Initialize Select2
    $('#users').select2({
        theme: "bootstrap-5",
        width: $(this).data('width') ? $(this).data('width') : $(this).hasClass('w-100') ? '100%' : 'style',
        placeholder: $(this).data('placeholder'),
        closeOnSelect: false,
        allowClear: true
    });
}

// Function to handle edit/add PHP API
const submitApartment = async (e) => {
    e.preventDefault();

    // Get the form data
    const id_reuniao = selectedMeeting ? selectedMeeting.id : null;
    const motivo = document.getElementById('motivo').value;
    const data = document.getElementById('data').value;
    const hora_inicio = document.getElementById('hora_inicio').value;
    const duration = parseInt(document.getElementById('duration').value);
    const sala = document.getElementById('sala').value;
    const participantes = $('#users').val();

    // Calculate hora_fim
    const startTime = new Date(`${data}T${hora_inicio}`);
    const [hours, minutes] = startTime.toISOString().substr(11, 5).split(':');
    let endTimeHours = parseInt(hours) + Math.floor((parseInt(minutes) + duration) / 60) + Math.floor(duration / 60);
    let endTimeMinutes = (parseInt(minutes) + duration) % 60;
    const hora_fim = `${endTimeHours.toString().padStart(2, '0')}:${endTimeMinutes.toString().padStart(2, '0')}`;

    // Prepare the meeting object
    const apartment = { id_reuniao, motivo, data, hora_inicio, hora_fim, organizador, sala, participantes };

    if (selectedApartment) {
        updateApartment(apartment) // Update the meeting
    } else {
        addApartment(apartment); // Add new meeting
    }
}

// Function that will handle the meeting update
// It will call PHP API to handle update on database
const updateApartment = async (apartment) => {
    console.log(apartment)
    $.ajax({
        url: 'api/index.php',
        type: 'POST',
        data: {
            action: 'update_apartment',
            apartment: JSON.stringify(apartment)
        },
        success: (response) => {
            const parsedResponse = JSON.parse(response);
            popupSweetAlert(parsedResponse);
        },
        error: (error) => {
            console.error(error);
        }
    });
}

// Function that will handle add new meeting
// It will call PHP API to handle insert into database
const addApartment = async (apartment) => {
    $.ajax({
        url: 'api/index.php',
        type: 'POST',
        data: {
            action: 'add_apartment',
            apartment: JSON.stringify(apartment)
        },
        success: (response) => {
            const parsedResponse = JSON.parse(response);
            popupSweetAlert(parsedResponse);
        },
        error: (error) => {
            console.error(error);
        }
    });
}

const popupSweetAlert = (response) => {
    const swalWithBootstrapButtons = Swal.mixin({
        customClass: {
            confirmButton: 'btn btn-success ms-1',
            cancelButton: 'btn btn-danger'
        },
        buttonsStyling: false
    })

    swalWithBootstrapButtons.fire({
        title: response.title,
        text: response.message,
        icon: response.status,
        showCancelButton: false,
        confirmButtonText: 'Ok',
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = 'index.html'
        }
    });
}

///////////////////////////////////////////////////////////////////////
// DOM EVENT LISTENERS ////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////

window.addEventListener('DOMContentLoaded', (event) => {
    handleDOMFormData();
})

// Event listener for form submit
apartmentForm.addEventListener('submit', (e) => submitApartment(e));

// Event listener for cancel button
cancelBtn.addEventListener('click', () => history.back());

// Log the selected meeting object (if present)
console.log('Selected Apartment:', selectedApartment);