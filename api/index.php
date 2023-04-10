<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: *");

include 'functions.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

        // GET REQUESTS
    case 'GET':
        $get_action = isset($_GET['action']) ? $_GET['action'] : '';
        switch ($get_action) {
            case 'get_username':
                $response = getUsername();
                break;
            case 'get_apartments';
                $response = getApartments();
                break;
            case 'get_users':
                $response = getUsers();
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
