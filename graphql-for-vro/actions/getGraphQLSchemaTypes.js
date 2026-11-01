/**
 * getGraphQLSchemaTypes
 * Uses GraphQL introspection to list what an endpoint offers: the root query
 * and mutation fields, and the names of the object types it defines.
 * Handy for exploring an API before writing queries. Some production servers
 * switch introspection off; the action then throws with the server's message.
 *
 * Inputs:
 *   endpointUrl        (string)
 *   headers            (Properties) optional
 *   ignoreCertificate  (boolean)
 * Return type: Properties
 *   queryFields     Array/string   fields you can query, e.g. countries, country
 *   mutationFields  Array/string   fields you can mutate (empty if none)
 *   objectTypes     Array/string   object type names, without the built-in __ types
 */
var introspection =
    "query SchemaSummary { __schema { " +
    "queryType { fields { name } } " +
    "mutationType { fields { name } } " +
    "types { name kind } } }";

var dataJson = System.getModule("in.co.cloudblogger.graphql").getGraphQLData(
    endpointUrl, introspection, null, "SchemaSummary", headers, ignoreCertificate, false);
var schema = JSON.parse(dataJson).__schema;

function fieldNames(rootType) {
    var names = [];
    if (rootType && rootType.fields) {
        for (var i = 0; i < rootType.fields.length; i++) {
            names.push(rootType.fields[i].name);
        }
    }
    return names;
}

var objectTypes = [];
for (var t = 0; t < schema.types.length; t++) {
    var type = schema.types[t];
    if (type.kind === "OBJECT" && type.name.indexOf("__") !== 0) {
        objectTypes.push(type.name);
    }
}

var summary = new Properties();
summary.put("queryFields", fieldNames(schema.queryType));
summary.put("mutationFields", fieldNames(schema.mutationType));
summary.put("objectTypes", objectTypes);

System.log("[GraphQL][getGraphQLSchemaTypes] " + summary.get("queryFields").length + " query field(s), " +
    summary.get("mutationFields").length + " mutation field(s), " + objectTypes.length + " object type(s)");
return summary;
