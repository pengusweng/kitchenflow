# Recipe API

All routes use `/api/recipes` and a bearer session.
Allowed roles: SUPERADMIN, RECIPE_MANAGER, SUPERVISOR, KITCHEN_HEAD,
INVENTORY_STAFF, KITCHEN_STAFF. CASHIER_STAFF is denied with `403 ACCESS_DENIED`.
Both routes are read-only. Recipes are created and activated or deactivated
through the service layer only; there is no HTTP route to update a recipe.

Interactive schemas are available under **Recipes** at `/api/docs` (OpenAPI JSON:
`/api/docs-json`). Send `Authorization: Bearer <session-token>`. Unknown query
properties are rejected with `400`.

| Endpoint (relative to `/api/recipes`) | Required input                  | Success                        |
| ------------------------------------- | ------------------------------- | ------------------------------ |
| `GET /`                               | Optional query parameters below | `200`, `{ data, meta }`        |
| `GET /:id`                            | `id` path parameter, a UUID     | `200`, the recipe              |

## List recipes

`GET /api/recipes` returns a page of recipes across all brands.

| Query parameter | Required | Type and constraints                                                         |
| --------------- | -------- | ---------------------------------------------------------------------------- |
| `page`          | No       | Integer, 1 or more; default `1`. The calculated offset must fit a signed 32-bit integer |
| `limit`         | No       | Integer, 1-100; default `10`                                                 |
| `status`        | No       | `active` (default), `inactive`, or `all`                                     |
| `search`        | No       | Up to 100 characters. Case-insensitive partial match on `code` and `name`; every whitespace-separated term must match. Blank means no search |
| `brand_id`      | No       | UUID. Only recipes owned by this brand                                       |
| `sortBy`        | No       | `name`, `code`, `created_at`, or `modified_at`. Omitted: newest first        |
| `sortOrder`     | No       | `asc` (default) or `desc`. Ignored when `sortBy` is omitted                  |

Filters are combined with AND. Ties always fall back to `recipe_id`, so pages
are stable. Example request:

```http
GET /api/recipes?status=all&search=kimchi&sortBy=name&page=1&limit=20
Authorization: Bearer <session-token>
```

Example `200` response:

```json
{
  "data": [
    {
      "recipe_id": "00000000-0000-4000-8000-000000000010",
      "brand_id": "00000000-0000-4000-8000-000000000001",
      "code": "RCP-GC-KIMCHI-FRIED-RICE",
      "name": "Kimchi Fried Rice",
      "version": 1,
      "is_active": true,
      "created_at": "2026-10-31T08:00:00.000Z",
      "modified_at": "2026-10-31T08:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "counts": { "all": 1, "active": 1, "inactive": 0 }
  }
}
```

`total` is the number of recipes matching the filters and `status`.
`counts` ignores `status` but respects `search` and `brand_id`, so the UI can
show tab totals. When nothing matches, `data` is `[]` and `total` is `0`. A page
beyond the supported offset range returns `400 PAGINATION_UNSUPPORTED_RANGE`.

## Get a recipe

`GET /api/recipes/:id` returns one recipe, active or inactive. A malformed `id`
returns `400`; an unknown one returns `404 RECIPE_NOT_FOUND`.

## Formulation notes

`formulation_notes` is confidential. It is included in list and get responses
only when the caller is a RECIPE_MANAGER or SUPERADMIN, and is omitted for every
other allowed role. The role is reloaded from the database; it is never taken
from the request.

## Related

`recipe-access.md` describes the earlier grant-based access model
(`RECIPE_ACCESS_GRANTS`, `PATCH /api/recipes/:id`). That model has been removed
and the document no longer reflects the code.
