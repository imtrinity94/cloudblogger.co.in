/**
 * executeGraphQLRequest
 * Sends one GraphQL operation (query or mutation) to a GraphQL endpoint and
 * returns the full response body ({ data, errors }) as a JSON string.
 * Throws when the HTTP call fails or the endpoint answers with a non-2xx code.
 *
 * Inputs:
 *   endpointUrl        (string)     full URL of the GraphQL endpoint, e.g. https://countries.trevorblades.com/
 *   query              (string)     the GraphQL document
 *   variablesJson      (string)     optional JSON object with variables, e.g. {"code":"IN"}
 *   operationName      (string)     optional, needed only when the document has several operations
 *   headers            (Properties) optional extra headers, e.g. Authorization
 *   ignoreCertificate  (boolean)    skip certificate checks (lab use only)
 * Return type: string
 */
var logPrefix = "[GraphQL][executeGraphQLRequest] ";

if (!endpointUrl) {
    throw logPrefix + "endpointUrl is required";
}
if (!query) {
    throw logPrefix + "query is required";
}

var payload = { query: query };

if (variablesJson) {
    try {
        payload.variables = JSON.parse(variablesJson);
    } catch (e) {
        throw logPrefix + "variablesJson is not valid JSON: " + e;
    }
}
if (operationName) {
    payload.operationName = operationName;
}

var host = RESTHostManager.createTransientHostFrom(RESTHostManager.createHost("GraphQL-" + new Date().getTime()));
host.url = endpointUrl;
if (ignoreCertificate === true) {
    host.hostVerification = false;
}

var request = host.createRequest("POST", "", JSON.stringify(payload));
request.contentType = "application/json";
request.setHeader("Accept", "application/json");
request.setHeader("User-Agent", "vRO-GraphQL-Client/1.0");

if (headers) {
    var keys = headers.keys;
    for (var i = 0; i < keys.length; i++) {
        request.setHeader(keys[i], String(headers.get(keys[i])));
    }
}

System.debug(logPrefix + "POST " + endpointUrl + (operationName ? " (" + operationName + ")" : ""));
var start = new Date().getTime();
var response = request.execute();
var body = response.contentAsString;
System.log(logPrefix + "HTTP " + response.statusCode + " in " + (new Date().getTime() - start) + " ms");

if (response.statusCode < 200 || response.statusCode > 299) {
    // Many GraphQL servers return 400 with a normal { errors } body for invalid queries.
    // Keep that body in the message so the caller can see why.
    throw logPrefix + "HTTP " + response.statusCode + ": " + (body ? body.substring(0, 1000) : "(empty body)");
}

return body;
