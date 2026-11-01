/**
 * getGraphQLData
 * Runs a GraphQL query or mutation and returns only the "data" part as a JSON string.
 * GraphQL reports most problems inside a 200 response, in an "errors" array.
 * This action turns those into an exception, unless allowPartialData is true and
 * the server still returned some data.
 *
 * Inputs:
 *   endpointUrl        (string)
 *   query              (string)
 *   variablesJson      (string)     optional JSON object with variables
 *   operationName      (string)     optional
 *   headers            (Properties) optional
 *   ignoreCertificate  (boolean)
 *   allowPartialData   (boolean)    log errors as warnings and return data when both are present
 * Return type: string
 */
var logPrefix = "[GraphQL][getGraphQLData] ";

var body = System.getModule("in.co.cloudblogger.graphql").executeGraphQLRequest(
    endpointUrl, query, variablesJson, operationName, headers, ignoreCertificate);

var result;
try {
    result = JSON.parse(body);
} catch (e) {
    throw logPrefix + "Response is not JSON: " + (body ? body.substring(0, 500) : "(empty)");
}

var hasData = result.data !== undefined && result.data !== null;
var hasErrors = result.errors && result.errors.length > 0;

if (hasErrors) {
    var messages = [];
    for (var i = 0; i < result.errors.length; i++) {
        var err = result.errors[i];
        var where = "";
        if (err.path) {
            where = " (path: " + err.path.join(".") + ")";
        }
        messages.push(err.message + where);
    }
    if (allowPartialData === true && hasData) {
        System.warn(logPrefix + "Partial data returned with " + messages.length + " error(s): " + messages.join("; "));
    } else {
        throw logPrefix + "GraphQL error(s): " + messages.join("; ");
    }
}

if (!hasData) {
    throw logPrefix + "Response has no data";
}

return JSON.stringify(result.data);
