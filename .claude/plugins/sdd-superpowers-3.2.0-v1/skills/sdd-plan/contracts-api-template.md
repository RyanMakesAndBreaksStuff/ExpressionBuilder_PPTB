# API Contracts: <Feature Name>

## <VERB> /path/to/endpoint

**Purpose:** <What this endpoint does>
**Spec requirement:** <FR-X, Story Y>

### Request

```json
{
  "field": "type — description"
}
```

### Response (200 OK)

```json
{
  "field": "type — description"
}
```

### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| 400 | <validation failure> | {"error": "message"} |
| 404 | <not found condition> | {"error": "Not found"} |
| 409 | <conflict condition> | {"error": "message"} |
