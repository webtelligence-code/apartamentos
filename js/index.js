let sessionUsername;
let sessionDepartment;
const API_URL = 'https://amatoscar.pt/GAP/NovasPlataformas/_API/apartamentos/index.php';
// Meetings array
const apartments = [];
// Grab the add meeting button id
const addDepartmentBtn = document.getElementById('add-apartment-btn');
const manualBtn = document.getElementById('manual-btn');
// Grab root container that will be populated with the meetings
const apartmentsContainer = document.getElementById('apartments-container');
// Grab theloading overlay div
const loadingOverlay = document.getElementById('loading-overlay');
// Event listener for add meeting button
addDepartmentBtn.addEventListener('click', () => gotToAddEditApartmentPage(null));
manualBtn.addEventListener('click', () => openUserManual());

// This function will get current session username
const getSessionInfo = async () => {
    loadingOverlay.style.display = 'block'; // Show loading overlay

    // To fetch session username
    $.get(`${API_URL}?action=get_username`, (data, status) => {
        if (status === 'success') {
            // API call success
            const parsedData = JSON.parse(data)
            console.log('USERNAME =>', parsedData);
            sessionUsername = parsedData
        } else {
            // API call error
            alert('Failed to fetch session username');
        }
    })

    // To fetch Department
    $.get(`${API_URL}?action=get_department`, (data, status) => {
        if (status === 'success') {
            // API call success
            const parsedData = JSON.parse(data);
            console.log('DEPARTMENT =>', parsedData);
            sessionDepartment = parsedData;
            getApartments();
        }
    })
}
getSessionInfo(); // Grab the current session USERNAME/DEPARTAMENTO via ajax call

// Function to call api to fetch all meetings
const getApartments = () => {
    $.get(`${API_URL}?action=get_apartments`, (data, status) => {
        if (status === 'success') {
            // Api call success
            const parsedData = JSON.parse(data); // Parse json data
            console.log(parsedData) // Log result
            parsedData.forEach(apartment => {
                apartments.push(apartment); // Push parsed department data to meetings array
            });
            populateApartmentsContainer() // Populate departments container
        } else {
            alert('Error fetching api data'); // Error fetching data from api
        }
    })
}

// Function to populate meetings container
const populateApartmentsContainer = () => {
    apartmentsContainer.innerHTML = ''; // Clear meetingsContainer inner HTML

    if (apartments.length === 0) {
        // Display warning message if no meetings found
        const warningDiv = document.createElement('div');
        warningDiv.className = 'alert alert-warning text-center';
        warningDiv.innerText = 'Não há apartamentos agendados no momento.';
        apartmentsContainer.appendChild(warningDiv);
    } else {
        // Loop through meetings array and populate each meeting
        apartments.forEach((apartment, index) => {
            const divRow = document.createElement('div'); // Create div with row class (bootstrap)

            // Condition to verify if session USERNAME/DEPARTAMENTO matches apartment row 
            const showEditDeleteButtons = sessionUsername === apartment.host || sessionDepartment === 'Informático';

            // Formatted date and time
            const formattedStartDate = moment(apartment.start_date).format('DD/MM/YYYY');
            const formattedEndDate = moment(apartment.end_date).format('DD/MM/YYYY');
            const formattedCheckIn = moment(apartment.check_in, 'HH:mm:ss').format('HH:mm');
            const formattedCheckOut = moment(apartment.check_out, 'HH:mm:ss').format('HH:mm');

            // If true, show edit/delete buttons
            const editDeleteButtons = showEditDeleteButtons ? `
                <div class='col-sm-12 mt-3'>
                    <button id='edit-apartment-${index}' class='btn btn-primary'>Editar</button>
                    <button id='delete-apartment-${index}' class='btn btn-danger'>Remover</button>
                </div>
            ` : '';

            // Populate row inner HTML
            divRow.innerHTML = `
                <div class='card my-3 c-card'>
                    <div class='row g-0 align-items-center'>
                        <div class='col-sm-12 col-md-4 text-center text-md-start'>
                            <img src='assets/img/building.webp' class='img-fluid rounded meeting-image' alt='apartment logo' />
                        </div>
                        <div class='col-sm-12 col-md-8 text-center text-md-start'>
                            <div class='card-body'>
                                <div class='row align-items-center'>
                                    <div class='col-sm-12 col-md'>
                                        <h3 class='card-title' style='color: #ed6337'>${apartment.name}</h3>
                                        <p class='card-text'><strong>Data Check In: </strong>${formattedStartDate}</p>
                                        <p class='card-text'><strong>Data Check Out: </strong>${formattedEndDate}</p>
                                        <p class='card-text'><strong>Hora Check In: </strong>${formattedCheckIn}h</p>
                                        <p class='card-text'><strong>Hora Check Out: </strong>${formattedCheckOut}h</p>
                                        <p class='card-text'><strong>Responsável da chave:</strong> ${apartment.key_host}</p>
                                        <p class='card-text'>
                                            <button type='button' class='btn btn-primary' id='btn-guests-${index}'>
                                                Convidados <span class='badge badge-warning'>${apartment.a_guests.length}</span>
                                            </button>
                                        </p>
                                    </div>
                                    ${editDeleteButtons}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            apartmentsContainer.appendChild(divRow); // Append row HTML to parent container

            const guestsBtn = document.getElementById(`btn-guests-${index}`);

            guestsBtn.addEventListener('click', () => popupSweetAlert(apartment.a_guests))

            // Condition to add event listener (if aplicable) for each edit/delete button
            if (showEditDeleteButtons) {
                const editBtn = document.getElementById(`edit-apartment-${index}`);
                const deleteBtn = document.getElementById(`delete-apartment-${index}`);

                editBtn.addEventListener('click', () => gotToAddEditApartmentPage(apartment));
                deleteBtn.addEventListener('click', () => alertDelete(apartment));
            }


        });
    }

    loadingOverlay.style.display = 'none'; // Hide loading overlay
}

const popupSweetAlert = (guests) => {
    let html = ''
    guests.map((guest) => {
        html += `
            <p>${guest}</p>
        `
    });

    const swalWithBootstrapButtons = Swal.mixin({
        customClass: {
            confirmButton: 'btn btn-success ms-1',
            cancelButton: 'btn btn-danger'
        },
        buttonsStyling: false
    })

    swalWithBootstrapButtons.fire({
        title: 'Convidados',
        html,
        icon: 'info',
        showCancelButton: false,
        confirmButtonText: 'Ok',
    }).then((result) => {

    });
}

/**
 * Function that will navigate to addEditApartment page and pass apartment object to localstorage to grab
 * apartment object and populate the other page form with the correct data.
 * If no object is passed through this function, it will navigate to addEditApartment.html
 * to add a new apartment.
 * @param {object} apartment 
 */
const gotToAddEditApartmentPage = (apartment) => {
    if (apartment) {
        localStorage.setItem('selectedApartment', JSON.stringify(apartment)); // Save meeting object to local storage
    } else {
        localStorage.removeItem('selectedApartment'); // Remove localStorage object set if meeting object is null
    }
    localStorage.setItem('host', JSON.stringify(sessionUsername));
    window.location.href = 'addEditApartment.html'; // Navigate to add/edit department
}

// This function will open the user manual in a new tab
const openUserManual = () => {
    window.open('assets/manual/Manual-Apartamentos.pdf');
}

/**
 * Function that will handle alert delete meeting
 * @param {object} apartment
 */
const alertDelete = (apartment) => {
    const meetingHtml = generateApartmentHtml(apartment); // Generate meeting data html to display on sweet alert
    const swalWithBootstrapButtons = Swal.mixin({
        customClass: {
            confirmButton: 'btn btn-success ms-1',
            cancelButton: 'btn btn-danger'
        },
        buttonsStyling: false
    })

    swalWithBootstrapButtons.fire({
        title: 'De certeza que quer apagar este apartamento?',
        html: meetingHtml,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, quero apagar!',
        cancelButtonText: 'Não, cancelar!',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            deleteApartment(apartment)
                .then(apiResponse => {
                    swalWithBootstrapButtons.fire({
                        title: apiResponse.title,
                        text: apiResponse.message,
                        icon: apiResponse.status,
                        showCancelButton: false,
                        confirmButtonText: 'Ok',
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.reload() // Reload page
                        }
                    });
                })
                .catch(error => console.error(error));
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            swalWithBootstrapButtons.fire(
                'Cancelado',
                'O teu apartamento está seguro :)',
                'error'
            )
        }
    })
}

/**
 * This function will make an api call to delete meeting by id
 * @param {object} meeting 
 * @returns promise to handle response
 */
const deleteApartment = (apartment) => {
    // Return a Promise
    return new Promise((resolve, reject) => {
        // Handle API logic here
        $.ajax({
            url: API_URL,
            type: 'POST',
            data: {
                action: 'delete_apartment',
                apartment_id: apartment.id,
            },
            success: (response) => {
                // Resolve the Promise with the response data
                resolve(JSON.parse(response));
            },
            error: (error) => {
                console.error(error);
                // Reject the Promise with the error
                reject(error);
            }
        });
    });
};

const generateApartmentHtml = (apartment) => {
    // Formatted date and time
    const formattedStartDate = moment(apartment.start_date).format('DD/MM/YYYY');
    const formattedEndDate = moment(apartment.end_date).format('DD/MM/YYYY');
    const formattedCheckIn = moment(apartment.check_in, 'HH:mm:ss').format('HH:mm');
    const formattedCheckOut = moment(apartment.check_out, 'HH:mm:ss').format('HH:mm');

    const html = `
        <h3 style='color: #ed6337'>${apartment.name}</h3>
        <p><strong>Data: </strong>${formattedStartDate} - ${formattedEndDate}</p>
        <p><strong>Check in: </strong>${formattedCheckIn}h</p>
        <p><strong>Check Out: </strong>${formattedCheckOut}h</p>
        <p><strong>Organizador: </strong>${apartment.host}</p>
        <p><strong>Responsável da chave: </strong>${apartment.key_host}</p>
    `;

    return html;
}

window.onbeforeunload = () => {
    loadingOverlay.style.display = 'none'; // Hide the loading spinner before leaving page
};