# Unit API

All routes use `/api/units` and a bearer session. Units are the measurement
units recipe ingredients are quantified in (for example `g`, `kg`, `ml`, `pc`).

| Action                 | Allowed roles                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Read                   | SUPERADMIN, RECIPE_MANAGER, SUPERVISOR, KITCHEN_HEAD, INVENTORY_STAFF, KITCHEN_STAFF |
| Create, update, delete | SUPERADMIN, RECIPE_MANAGER                                                           |

Any other role gets `403 ACCESS_DENIED`. CASHIER_STAFF cannot read units.

Interactive schemas are available under **Units** at `/api/docs` (OpenAPI JSON:
`/api/docs-json`). Send `Authorization: Bearer <session-token>`. Unknown body
and query properties are rejected with `400`.

| Endpoint (relative to `/api/units`) | Required input                    | Success                 |
| ----------------------------------- | --------------------------------- | ----------------------- |
| `POST /`                            | Body below                        | `201`, the created unit |
| `GET /`                             | Optional query parameters below   | `200`, `{ data, meta }` |
| `GET /:code`                        | `code` path parameter             | `200`, the unit         |
| `PATCH /:code`                      | `code` path parameter, body below | `200`, the updated unit |
| `DELETE /:code`                     | `code` path parameter             | `200`, the deleted unit |

## Unit shape

```json
{
  "code": "kg",
  "name": "Kilogram",
  "dimension": "MASS",
  "to_base": "1000"
}
```

`to_base` converts one of this unit into the base unit of its dimension, so
`1 kg = 1000 g`. It is stored as `DECIMAL(18, 6)` and returned as a string.

## Create a unit

`POST /api/units`

| Field       | Required | Type and constraints                                                       |
| ----------- | -------- | -------------------------------------------------------------------------- |
| `code`      | Yes      | String, 1-16 characters. Unique; it is the unit's key                      |
| `name`      | Yes      | String, 1-50 characters                                                    |
| `dimension` | Yes      | `MASS`, `VOLUME`, or `COUNT`                                               |
| `to_base`   | Yes      | JSON number greater than 0, at most 999999999999, at most 6 decimal places |

A code that already exists returns `409 DUPLICATE_RESOURCE`.

```http
POST /api/units
Authorization: Bearer <session-token>
Content-Type: application/json

{ "code": "kg", "name": "Kilogram", "dimension": "MASS", "to_base": 1000 }
```

## List units

`GET /api/units` returns a page of units ordered by `dimension`, then
`to_base`, then `code`.

| Query parameter | Required | Type and constraints                                                                                                                         |
| --------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `page`          | No       | Integer, 1 or more; default `1`. The calculated offset must fit a signed 32-bit integer                                                      |
| `limit`         | No       | Integer, 1-100; default `10`                                                                                                                 |
| `search`        | No       | Up to 100 characters. Case-insensitive partial match on `code` and `name`; every whitespace-separated term must match. Blank means no search |
| `dimension`     | No       | `MASS`, `VOLUME`, or `COUNT`                                                                                                                 |

Example `200` response:

```json
{
  "data": [
    { "code": "kg", "name": "Kilogram", "dimension": "MASS", "to_base": "1000" }
  ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

When nothing matches, `data` is `[]` and `total` is `0`. A page beyond the
supported offset range returns `400 PAGINATION_UNSUPPORTED_RANGE`.

## Get a unit

`GET /api/units/:code` returns one unit. An unknown code returns
`404 UNIT_NOT_FOUND`. Codes are case-sensitive.

## Update a unit

`PATCH /api/units/:code` accepts any of `name`, `dimension`, and `to_base`, with
the same constraints as create. Omitted fields are unchanged. `code` cannot be
changed; sending it returns `400`. An unknown code returns `404 UNIT_NOT_FOUND`.

## Delete a unit

`DELETE /api/units/:code` permanently deletes the unit and returns it. Units
have no active flag, so there is no deactivate or reactivate.

| Status               | When                                              |
| -------------------- | ------------------------------------------------- |
| `404 UNIT_NOT_FOUND` | The code does not exist                           |
| `409 UNIT_IN_USE`    | One or more recipe ingredients still use the unit |

## Audit

Create, update, and delete write `UNIT_CREATED`, `UNIT_UPDATED`, and
`UNIT_DELETED` audit rows with `entity_type` `units`. Audit `entity_id` only
holds UUIDs, so unit rows have a null `entity_id` and no before/after snapshot.
