<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE");

include 'functions.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    header("Access-Control-Allow-Methods: GET, POST, DELETE");
    header("Access-Control-Allow-Headers: Content-Type");
    header("Access-Control-Max-Age: 86400");
    exit;
}


switch ($method) {

        // GET REQUESTS
    case 'GET':
        $get_action = isset($_GET['action']) ? $_GET['action'] : '';
        switch ($get_action) {
            case 'get_username':
                $response = getUsername();
                break;
            case 'get_department':
                $response = getDepartment();
                break;
            case 'get_apartments';
                $response = getApartments();
                break;
            case 'get_users':
                $response = getUsers();
                break;
            case 'check_apartment_conflict':
                $apartment_id = isset($_GET['apartment_id']) ? $_GET['apartment_id'] : '';
                $start_date = isset($_GET['start_date']) ? $_GET['start_date'] : '';
                $end_date = isset($_GET['end_date']) ? $_GET['end_date'] : '';
                $check_in = isset($_GET['check_in']) ? $_GET['check_in'] : '';
                $check_out = isset($_GET['check_out']) ? $_GET['check_out'] : '';

                $response = checkApartmentConflict($apartment_id, $start_date, $end_date, $check_in, $check_out);
                break;
        }

        echo json_encode($response);
        break;

        // POST REQUESTS
    case 'POST':
        $post_action = isset($_POST['action']) ? $_POST['action'] : '';
        $response = null;

        switch ($post_action) {
            case 'add_apartment':
                $apartment = json_decode($_POST['apartment'], true);
                $response = addApartment($apartment);
                break;
            case 'update_apartment':
                $apartment = json_decode($_POST['apartment'], true);
                $response = updateApartment($apartment);
                break;
            case 'delete_apartment':
                $apartment_id = isset($_POST['apartment_id']) ? $_POST['apartment_id'] : '';
                if ($apartment_id || $apartment_id == 0) {
                    $response = deleteApartment($apartment_id);
                } else {
                    $response = [
                        'status' => 'error',
                        'message' => 'É necessário o id do apartamento.',
                        'title' => 'ID em falta.'
                    ];
                }
                break;
        }

        echo json_encode($response); // return $response
        break;

        // DELETE REQUESTS
    case 'DELETE':
        parse_str(file_get_contents("php://input"), $_DELETE);
        $delete_action = isset($_DELETE['action']) ? $_DELETE['action'] : '';

        switch ($delete_action) {
            case 'delete_apartment':
                $apartment_id = isset($_DELETE['apartment_id']) ? $_DELETE['apartment_id'] : '';
                if ($apartment_id) {
                    $response = deleteApartment($apartment_id);
                } else {
                    $response = [
                        'status' => 'error',
                        'message' => 'É necessário o id do apartamento.',
                        'title' => 'ID em falta.'
                    ];
                }
                echo json_encode($response);
                break;
        }
        break;
}
