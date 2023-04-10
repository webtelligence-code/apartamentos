<?php

include 'DatabaseConnect.php';

include 'session.php';

$databaseObj = new DatabaseConnect;
$conn = $databaseObj->connect();

// Function that will fetch session username
function getUsername()
{
    return $_SESSION['USERNAME'];
}

/**
 * Function to fetch all apartments from database
 * We need to join the salas table to apartments table
 * @return void 
 */
function getApartments()
{
    global $conn;
    $sql = 'SELECT a_apartments.id, a_apartments.name, a_apartments.start_date, a_apartments.end_date, a_apartments.check_in, a_apartments.check_out, a_apartments.host, a_apartments.key_host,
            (
                SELECT GROUP_CONCAT(a_guests.name SEPARATOR \', \')
                FROM a_guests
                WHERE a_guests.apartment_id = a_apartments.id
            ) AS a_guests
            FROM a_apartments
            ORDER BY a_apartments.start_date DESC, a_apartments.check_in ASC
    ';
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $apartments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($apartments as $key => $apartment) {
        $apartments[$key]['guests'] = explode(',', $apartment['guests']);
    }

    return $apartments;
}

// Function that will fetch all users (guests) from the database
function getUsers()
{
    global $conn;
    $sql = 'SELECT * FROM users ORDER BY NAME ASC';
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return $users;
}

/**
 * Function that will handle insert a new apartment into the database
 * @param mixed $apartment 
 * @return void 
 * @throws PDOException 
 */
function addApartment($apartment)
{
    global $conn;

    $apartmentsSql = 'INSERT INTO a_apartments (name, start_date, end_date, check_in, check_out, host, key_host)
                    VALUES (:name, :start_date, :end_date, :check_in, :check_out, :host, :key_host)';
    // Add the meeting to the reunioes table
    $stmt = $conn->prepare($apartmentsSql);
    $stmt->bindParam(':name', $apartment['name']);
    $stmt->bindParam(':start_date', $apartment['start_date']);
    $stmt->bindParam(':end_date', $apartment['end_date']);
    $stmt->bindParam(':check_in', $apartment['check_in']);
    $stmt->bindParam(':check_out', $apartment['check_out']);
    $stmt->bindParam(':host', $apartment['host']);
    $stmt->bindParam(':key_host', $apartment['key_host']);
    $stmt->execute();

    // Get the id of the inserted meeting
    $apartment_id = $conn->lastInsertId();

    $guestsSql = 'INSERT INTO a_guests (apartment_id, name)
                    VALUES (:apartment_id, :name)';
    // Add the guests to the participantes table
    foreach ($apartment['guests'] as $guest) {
        $stmt = $conn->prepare($guestsSql);
        $stmt->bindParam(':apartment_id', $apartment_id);
        $stmt->bindParam(':name', $guest);
        $stmt->execute();
    }

    return [
        'status' => 'success',
        'message' => 'Apartamento adicionado com sucesso!',
        'title' => 'Sucesso!'
    ];
}

/**
 * This function will update the apartment in the database
 * @param object $apartment 
 * @return string[] response array
 * @throws PDOException 
 */
function updateApartment($apartment)
{
    global $conn;

    $apartmentSql = 'UPDATE a_apartments 
                    SET name = :name, start_date = :start_date, end_date = :end_date, check_in = :check_in, check_out = :check_out, host = :host
                    WHERE id = :id';
    // Update the meeting in the reunioes table
    $stmt = $conn->prepare($apartmentSql);
    $stmt->bindParam(':name', $apartment['name']);
    $stmt->bindParam(':start_date', $apartment['start_date']);
    $stmt->bindParam(':end_date', $apartment['end_date']);
    $stmt->bindParam(':check_in', $apartment['check_in']);
    $stmt->bindParam(':check_out', $apartment['check_out']);
    $stmt->bindParam(':host', $apartment['host']);
    $stmt->bindParam(':id', $apartment['apartment_id']);
    $stmt->execute();

    $deleteGuestsSql = 'DELETE FROM a_guests WHERE apartment_id = :apartment_id';
    // Delete the existing guests in the guests table
    $stmt = $conn->prepare($deleteGuestsSql);
    $stmt->bindParam(':apartment_id', $apartment['apartment_id']);
    $stmt->execute();

    $updateGuestsSql = 'INSERT INTO a_guests (apartment_id, name) 
                        VALUES (:apartment_id, :name)';
    // Add the updated guests to the guests table
    foreach ($apartment['guests'] as $guest) {
        $stmt = $conn->prepare($updateGuestsSql);
        $stmt->bindParam(':apartment_id', $apartment['apartment_id']);
        $stmt->bindParam(':name', $guest);
        $stmt->execute();
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
 * @throws PDOException 
 */
function deleteApartment($apartment_id)
{
    global $conn;

    try {
        // Start a transaction
        $conn->beginTransaction();

        // Delete the associated guests
        $guestsSql = 'DELETE FROM a_guests WHERE apartment_id = :apartment_id';
        $stmt = $conn->prepare($guestsSql);
        $stmt->bindParam(':apartment_id', $apartment_id, PDO::PARAM_INT);
        $stmt->execute();

        // Delete the meeting
        $meetingsSql = 'DELETE FROM a_apartments WHERE id = :apartment_id';
        $stmt = $conn->prepare($meetingsSql);
        $stmt->bindParam(':apartment_id', $apartment_id, PDO::PARAM_INT);
        $result = $stmt->execute();

        // Commit the transaction
        $conn->commit();

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
    } catch (PDOException $e) {
        // Rollback the transaction if there is an error
        $conn->rollBack();
        error_log('Error while deleting Apartment: ' . $e->getMessage());
    }
}
