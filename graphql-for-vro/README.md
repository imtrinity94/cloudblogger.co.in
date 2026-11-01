# GraphQL for VCF Operations Orchestrator

Plain ES5.1 actions that let Orchestrator (vRO) talk to any GraphQL API. No plugin needed: the actions use the built-in HTTP-REST scripting objects.

Companion to the cloudblogger.co.in post *Calling GraphQL APIs from VCF Operations Orchestrator*.

## What's inside

Package: `in.co.cloudblogger.graphql_v1.0.0_20261101.package`
Action module: `in.co.cloudblogger.graphql`

| Action | Returns | What it does |
| --- | --- | --- |
| `executeGraphQLRequest` | string | Sends one query or mutation (with optional variables, operation name and extra headers) and returns the full `{ data, errors }` body. Throws on HTTP errors. |
| `getGraphQLData` | string | Calls `executeGraphQLRequest` and returns only `data`. Throws when the server returns GraphQL `errors`, unless `allowPartialData` is true. |
| `getGraphQLSchemaTypes` | Properties | Uses introspection to list the query fields, mutation fields and object types an endpoint offers. |

The `actions/` folder has the same scripts as plain `.js` files, so you can read them without importing anything.

## Quick example

```javascript
var data = System.getModule("in.co.cloudblogger.graphql").getGraphQLData(
    "https://countries.trevorblades.com/",
    "query GetCountry($code: ID!) { country(code: $code) { name capital currency } }",
    '{"code":"IN"}',
    "GetCountry",
    null,      // headers, e.g. Authorization
    false,     // ignoreCertificate
    false      // allowPartialData
);
System.log(data); // {"country":{"capital":"New Delhi","currency":"INR","name":"India"}}
```

## Tested on

VCF Operations Orchestrator 9.1.1 (build 25643527), against the public Countries and Rick and Morty GraphQL APIs.

## Notes

- Authentication: pass an `Authorization` header (or whatever the API needs) in the `headers` Properties. Keep the token in a SecureString or a configuration element, not in the script.
- `ignoreCertificate` is for labs with self-signed certificates only.
- Some production APIs switch introspection off; `getGraphQLSchemaTypes` then throws with the server's message.
- Disclaimer: provided as is, without warranty. Test in a lab before using in production.
