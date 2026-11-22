# Errors

Failed requests answer with a 4xx or 5xx status and an error object that names what went wrong.

The error's type groups the cause, its message is written for people, and param names the field when one parameter is at fault.

```json
{ "error": { "type": "invalid_request_error", "message": "Missing required parameter: title.", "param": "title" } }
```

## Types

authentication_error - no key or a wrong one. invalid_request_error - a parameter is missing or malformed. resource_missing - no object with that id. rate_limit_error - too many requests.

Interactive: [Errors in the app](../../application/app-api-docs.html#/guides/errors).
