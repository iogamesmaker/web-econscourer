<?php
header('Access-Control-Allow-Origin: https://iogamesplayer.com');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Get the requested path from the query string
$path = isset($_GET['path']) ? $_GET['path'] : '';

// Validate the path
if (empty($path)) {
    http_response_code(400);
    echo json_encode(['error' => 'No path provided']);
    exit;
}

// Base URL for the Drednot.io API
$baseUrl = 'https://pub.drednot.io/prod/econ';

// Remove leading slash if present
$path = ltrim($path, '/');

// Construct the full URL
$url = $baseUrl . '/' . $path;

// Validate URL format
if (!preg_match('/^https:\/\/pub\.drednot\.io\/prod\/econ\//', $url)) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid URL']);
    exit;
}

// Initialize cURL session
$ch = curl_init($url);

// Set cURL options
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 5,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_USERAGENT => 'web-econscourer/1.0',
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2
]);

// Execute cURL request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

// Check for cURL errors
if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(['error' => 'Proxy error: ' . curl_error($ch)]);
    exit;
}

curl_close($ch);

// Forward the original content type and response code
if ($contentType) {
    header('Content-Type: ' . $contentType);
}
http_response_code($httpCode);

// Output the response
echo $response;
