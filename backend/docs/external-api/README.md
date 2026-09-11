# Abid Air Partner API v1

The Partner API allows approved integrations to read Abid Air's live public group inventory and create bookings against that same inventory. It does not maintain a separate stock pool.

## Base URL and authentication

Production base URL:

```text
https://abidairtravels.com/api/external/v1
```

Send the API key on every request. Abid Air issues keys individually; never expose one in browser code or commit it to source control.

```http
Authorization: Bearer aa_live_REPLACE_WITH_YOUR_KEY
Accept: application/json
```

`X-API-Key` is also supported. Keys can be revoked and limited to `inventory:read`, `bookings:read`, and/or `bookings:write`. The default limit is 120 requests per minute per API client.

## Endpoints

| Method | Path | Scope | Purpose |
|---|---|---|---|
| GET | `/group-ticketing` | `inventory:read` | Paginated available public groups |
| GET | `/group-ticketing/{groupId}` | `inventory:read` | Current group details and availability |
| GET | `/umrah-packages` | `inventory:read` | Paginated available public Umrah packages |
| GET | `/umrah-packages/{packageId}` | `inventory:read` | Current Umrah package details and availability |
| POST | `/availability` | `inventory:read` | Check requested availability and receive a booking token |
| POST | `/bookings` | `bookings:write` | Create an on-hold booking and reserve seats |
| GET | `/bookings` | `bookings:read` | List only bookings created by this API client |
| GET | `/bookings/{bookingId}` | `bookings:read` | Read a booking created by this API client |
| POST | `/bookings/{bookingId}/cancel` | `bookings:write` | Cancel an on-hold booking and release inventory |

An API client can only fetch its own bookings. Submit either a group-ticketing ID or
an Umrah-package ID as `inventoryId`; the API detects the inventory type and creates
the correct booking. Group bookings deduct adults plus children. Umrah bookings
reserve package availability for all passengers.

List the authenticated API client's bookings with `GET /bookings?page=1&limit=25`.
Results combine group-ticketing and Umrah-package bookings and are sorted newest first.

## List inventory

```bash
curl "https://abidairtravels.com/api/external/v1/group-ticketing?page=1&limit=25&groupType=Umrah%20Groups" \
  -H "Authorization: Bearer aa_live_REPLACE_WITH_YOUR_KEY"
```

Optional query parameters are `page`, `limit` (maximum 100), `groupType`, and `airline`.
Groups whose first departure date has passed are not returned and cannot be booked.

## List Umrah packages

```bash
curl "https://abidairtravels.com/api/external/v1/umrah-packages?page=1&limit=25" \
  -H "Authorization: Bearer aa_live_REPLACE_WITH_YOUR_KEY"
```

Only public packages with at least one available room are returned. Optional query
parameters are `page`, `limit` (maximum 100), and `source` (`local-db` or
`travel-network`).
Packages whose first departure date has passed are not returned and cannot be booked.

## Create booking

Before creating a booking, check the exact passenger counts:

```bash
curl -X POST "https://abidairtravels.com/api/external/v1/availability" \
  -H "Authorization: Bearer aa_live_REPLACE_WITH_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "inventoryId": "65fd12ab34cd56ef7890abcd", "adults": 1, "children": 1, "infants": 0 }'
```

When availability is sufficient, the response contains an `availabilityToken` valid
for five minutes. Send it as `X-Availability-Token` when creating the booking. The
token is tied to the API client, inventory ID, inventory type, and requested counts.
Each request to the booking endpoint creates a new booking. Passenger types and field values are case-sensitive.

```bash
curl -X POST "https://abidairtravels.com/api/external/v1/bookings" \
  -H "Authorization: Bearer aa_live_REPLACE_WITH_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Availability-Token: REPLACE_WITH_AVAILABILITY_TOKEN" \
  -d '{
      "inventoryId": "65fd12ab34cd56ef7890abcd",
    "roomType": "double",
    "contactPersonName": "Muhammad Ali",
    "passengers": [
      {
        "type": "Adult",
        "title": "MR",
        "givenName": "Muhammad",
        "surName": "Ali",
        "passport": "AB1234567",
        "dateOfBirth": "1990-05-15",
        "passportIssue": "2022-06-01",
        "passportExpiry": "2032-05-31",
        "nationality": "Pakistan"
      },
      {
        "type": "Child",
        "title": "CHD",
        "givenName": "Ahmed",
        "surName": "Ali",
        "passport": "CD7654321",
        "dateOfBirth": "2017-08-10",
        "passportIssue": "2023-01-01",
        "passportExpiry": "2028-12-31",
        "nationality": "Pakistan"
      }
    ]
  }'
```

Counts, flight details, fares, totals, and booking expiry are calculated by Abid Air. Integrators must not submit or trust their own prices. Fetch inventory immediately before displaying or booking because availability and fares may change.

Successful creation returns HTTP `201`.

```json
{
  "success": true,
  "data": {
    "_id": "6aa3e6b9a88c2c844c958b54",
    "status": "on hold",
    "expiresAt": "2026-09-11T14:30:00.000Z",
    "contactPersonName": "Muhammad Ali",
    "passengerCounts": { "adults": 1, "children": 1, "infants": 0, "total": 2 },
    "pricing": { "adultPrice": 150000, "childPrice": 120000, "infantPrice": 25000, "adultTotal": 150000, "childTotal": 120000, "infantTotal": 0, "grandTotal": 270000 }
  }
}
```

## Errors

Errors use a stable machine-readable code:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_INVENTORY",
    "message": "The group is unavailable or does not have enough seats."
  }
}
```

Common statuses are `400` malformed request, `401` invalid key, `403` missing scope/inactive client, `404` not found, `409` inventory or booking-state conflict, `422` invalid payload, `429` rate limit, and `500` unexpected server error.

The complete machine-readable contract is in [openapi.yaml](./openapi.yaml).
