<?php

include 'DatabaseConnect.php';

$databaseObj = new DatabaseConnect;
$conn = $databaseObj->connect();

$sql = 'SELECT * FROM tb_apartamentos_visitas';

$result = $conn->query($sql);

$guests = array();

if($result->num_rows > 0) {
  while($row = $result->fetch_assoc()) {
    $guests[] = $row;
  }
} else {
  $guests = [];
}

echo json_encode($guests);