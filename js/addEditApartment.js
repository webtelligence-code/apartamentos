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

    // Set default values if selectedApartment is selected
    if (selectedApartment) {
        document.getElementById('name').value = selectedApartment.name;
        document.getElementById('start_date').value = selectedApartment.start_date
        document.getElementById('end_date').value = selectedApartment.end_date
        document.getElementById('check_in').value = selectedApartment.check_in
        document.getElementById('check_out').value = selectedApartment.check_out
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
    const guestsSelect = document.getElementById('guests');
    const keyHostSelect = document.getElementById('key_host');
    console.log(users);
    users.map((user) => {
        var option1 = document.createElement('option');
        option1.innerText = user.NAME;
        option1.value = user.NAME;

        // Check if the user is in the selectedGuests array and set the selected attribute
        if (selectedApartment) {
            const trimmedParticipants = selectedApartment.a_guests.map(guest => guest.trim());
            if (trimmedParticipants.includes(user.NAME.trim())) {
                option1.selected = true; // Set guests default value
            }
        }

        guestsSelect.appendChild(option1) // Append option to select

        var option2 = document.createElement('option');
        option2.innerText = user.NAME;
        option2.value = user.NAME;

        keyHostSelect.appendChild(option2);
    });

    // Set default value for keyHostSelected
    if (selectedApartment && selectedApartment.key_host) {
        const keyHostOption = keyHostSelect.querySelector(`option[value='${selectedApartment.key_host}']`);
        if (keyHostOption) {
            keyHostOption.selected = true // Set default value for key host option
        }
    }

    // Initialize Select2
    $('#guests').select2({
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
    const apartment_id = selectedApartment ? selectedApartment.id : null;
    const name = document.getElementById('name').value;
    const start_date = document.getElementById('start_date').value;
    const end_date = document.getElementById('end_date').value;
    const check_in = document.getElementById('check_in').value;
    const check_out = document.getElementById('check_out').value;
    const guests = $('#guests').val();
    const key_host = document.getElementById('key_host').value;

    // Prepare the apartment object
    const apartment = { apartment_id, name, start_date, end_date, check_in, check_out, host, key_host, guests };

    console.log(apartment)

    const conflict = await checkApartmentConflict(apartment_id, start_date, end_date, check_in, check_out);

    console.log('Conflict:', conflict)
    if (conflict === 'true') {
        Swal.fire({
            icon: 'error',
            title: 'Conflicto!',
            text: `Já existe um apartamento agendado para ${start_date} - ${end_date} à hora que selecionou. Por favor selecione outra data/hora.`,
        });
    } else {
        if (selectedApartment) {
            updateApartment(apartment) // Update the meeting
        } else {
            addApartment(apartment); // Add new meeting
        }
    }
}

/**
 * This function will make an api call to check in the database for booked apartments
 * in the range of the selected apartment dates and times
 * @param {int} apartment_id 
 * @param {date} start_date 
 * @param {date} end_date 
 * @param {time} check_in 
 * @param {time} check_out 
 * @returns response data
 */
const checkApartmentConflict = async (apartment_id, start_date, end_date, check_in, check_out) => {
    const response = await $.get('api/index.php', {
        action: 'check_apartment_conflict',
        apartment_id,
        start_date,
        end_date,
        check_in,
        check_out
    });

    return response;
}

// Function that will handle the meeting update
// It will call PHP API to handle update on database
const updateApartment = async (apartment) => {
    console.log(apartment);
    apartment = JSON.stringify(apartment);
    $.ajax({
        url: 'api/index.php',
        type: 'POST',
        data: {
            action: 'update_apartment',
            apartment
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
    console.log(apartment);
    apartment = JSON.stringify(apartment);
    $.ajax({
        url: 'api/index.php',
        type: 'POST',
        data: {
            action: 'add_apartment',
            apartment
        },
        success: (response) => {
            console.log(response);
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