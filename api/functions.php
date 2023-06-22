<?php

include '../DatabaseConnect.php';

include 'session.php';

$databaseObj = new DatabaseConnect;
$conn = $databaseObj->connect();

// Function that will fetch session username
function getUsername()
{
    return $_SESSION['USERNAME'];
}

// Function that will fetch departamento value for the current user
function getDepartment()
{
    return $_SESSION['DEPARTAMENTO'];
}

/**
 * Function to fetch all apartments from database
 * We need to join the salas table to apartments table
 * @return void 
 */
function getApartments()
{
    global $conn;
    $sql = 'SELECT tb_apartamentos.id, tb_apartamentos.name, tb_apartamentos.start_date, tb_apartamentos.end_date, tb_apartamentos.check_in, tb_apartamentos.check_out, tb_apartamentos.host, tb_apartamentos.key_host
            FROM tb_apartamentos
            ORDER BY tb_apartamentos.start_date DESC, tb_apartamentos.check_in DESC
    ';
    $result = $conn->query($sql);

    $apartments = array();
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $apartments[] = $row;
        }

        // Fetch guests for each apartment
        foreach ($apartments as &$apartment) {
            $guestsSql = 'SELECT name FROM tb_apartamentos_visitas WHERE apartment_id = ?';
            $stmt = $conn->prepare($guestsSql);
            $stmt->bind_param('i', $apartment['id']);
            $stmt->execute();
            $guestsResult = $stmt->get_result();

            $guests = array();
            while ($guestRow = $guestsResult->fetch_assoc()) {
                $guests[] = $guestRow['name'];
            }

            $apartment['a_guests'] = $guests;
        }
    } else {
        // Return an empty array
        $apartments = [];
    }

    // Encode the result as JSON
    return $apartments;
}

// Function that will fetch all users (guests) from the database
function getUsers()
{
    global $conn;
    $sql = 'SELECT * FROM users WHERE ACT = 1 AND COLABORADOR = 1 ORDER BY NAME ASC';
    $result = $conn->query($sql);

    $users = array();
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $users[] = $row;
        }
    } else {
        $users = [];
    }

    return $users;
}

function checkApartmentConflict($apartment_id, $start_date, $end_date, $check_in, $check_out)
{
    global $conn;

    $sql = 'SELECT * FROM tb_apartamentos
            WHERE start_date <= ?
            AND end_date >= ?
            AND check_in <= ?
            AND check_out >= ?
        ';

    if ($apartment_id) {
        $sql .= ' AND id != ?';
    }

    $stmt = mysqli_prepare($conn, $sql);
    if (!$stmt) {
        throw new Exception('Error in preparing statement: ' . mysqli_error($conn));
    }

    mysqli_stmt_bind_param($stmt, 'dddd', $start_date, $end_date, $check_in, $check_out);

    if ($apartment_id) {
        mysqli_stmt_bind_param($stmt, 'dddti', $start_date, $end_date, $check_in, $check_out, $apartment_id);
    }

    if (!mysqli_stmt_execute($stmt)) {
        throw new Exception('Error in executing statement: ' . mysqli_error($conn));
    }

    $result = mysqli_stmt_get_result($stmt);
    $apartments = array();

    if (mysqli_num_rows($result) > 0) {
        while ($row = mysqli_fetch_assoc($result)) {
            $apartments[] = $row;
        }
    }

    return count($apartments) > 0;
}


/**
 * Function that will handle inserting a new apartment into the database
 * @param mixed $apartment 
 * @return array 
 * @throws Exception 
 */
function updateApartment($apartment)
{
    global $conn;

    $apartment_id = mysqli_real_escape_string($conn, $apartment['apartment_id']);
    $name = mysqli_real_escape_string($conn, $apartment['name']);
    $start_date = mysqli_real_escape_string($conn, $apartment['start_date']);
    $end_date = mysqli_real_escape_string($conn, $apartment['end_date']);
    $check_in = mysqli_real_escape_string($conn, $apartment['check_in']);
    $check_out = mysqli_real_escape_string($conn, $apartment['check_out']);
    $host = mysqli_real_escape_string($conn, $apartment['host']);

    $apartmentSql = "UPDATE tb_apartamentos 
                     SET name = '$name', start_date = '$start_date', end_date = '$end_date', check_in = '$check_in', check_out = '$check_out', host = '$host'
                     WHERE id = $apartment_id";

    if (!mysqli_query($conn, $apartmentSql)) {
        throw new Exception('Error: ' . mysqli_error($conn));
    }

    $deleteGuestsSql = "DELETE FROM tb_apartamentos_visitas WHERE apartment_id = $apartment_id";

    if (!mysqli_query($conn, $deleteGuestsSql)) {
        throw new Exception('Error: ' . mysqli_error($conn));
    }

    $guestsSql = "INSERT INTO tb_apartamentos_visitas (apartment_id, name) VALUES ";

    foreach ($apartment['guests'] as $guest) {
        $guest = mysqli_real_escape_string($conn, $guest);
        $guestsSql .= "($apartment_id, '$guest'),";
    }

    $guestsSql = rtrim($guestsSql, ','); // Remove the trailing comma

    if (!mysqli_query($conn, $guestsSql)) {
        throw new Exception('Error: ' . mysqli_error($conn));
    }

    return [
        'status' => 'success',
        'message' => 'Apartamento atualizado com sucesso!',
        'title' => 'Atualizado!'
    ];
}

/**
 * This function will handle a transaction to delete apartment in apartments table
 * and also delete all the guests associated to the apartment in question
 * @param int $apartment_id 
 * @return bool|void 
 */
function deleteApartment($apartment_id)
{
    global $conn;

    try {
        // Start a transaction
        mysqli_begin_transaction($conn);

        // Delete the associated guests
        $guestsSql = 'DELETE FROM tb_apartamentos_visitas WHERE apartment_id = ?';
        $stmt = mysqli_prepare($conn, $guestsSql);
        if (!$stmt) {
            throw new Exception('Error in preparing statement: ' . mysqli_error($conn));
        }

        mysqli_stmt_bind_param($stmt, 'i', $apartment_id);

        if (!mysqli_stmt_execute($stmt)) {
            throw new Exception('Error in executing statement: ' . mysqli_error($conn));
        }

        // Delete the meeting
        $meetingsSql = 'DELETE FROM tb_apartamentos WHERE id = ?';
        $stmt = mysqli_prepare($conn, $meetingsSql);
        if (!$stmt) {
            throw new Exception('Error in preparing statement: ' . mysqli_error($conn));
        }

        mysqli_stmt_bind_param($stmt, 'i', $apartment_id);

        $result = mysqli_stmt_execute($stmt);

        // Commit the transaction
        mysqli_commit($conn);

        if ($result) {
            $response = [
                'status' => 'success',
                'message' => 'Apartamento removido com sucesso!',
                'title' => 'Removido!'
            ];
        } else {
            $response = [
                'status' => 'error',
                'message' => 'Erro ao remover apartamento da base de dados.',
                'title' => 'Erro ao remover.'
            ];
        }

        return $response;
    } catch (Exception $e) {
        // Rollback the transaction if there is an error
        mysqli_rollback($conn);
        error_log('Error while deleting Apartment: ' . $e->getMessage());
    }
}
