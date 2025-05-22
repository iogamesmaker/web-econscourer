<?php
header('Access-Control-Allow-Origin: https://iogamesplayer.com');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

$url = isset($_GET['url']) ? $_GET['url'] : null;
if (!$url) {
    http_response_code(400);
    echo json_encode(['error' => 'No URL provided']);
    exit;
}

// Validate the URL is from pub.drednot.io
if (!preg_match('/^https:\/\/pub\.drednot\.io\/prod\/econ\//', $url)) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid URL']);
    exit;
}

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($httpCode);
echo $response;
