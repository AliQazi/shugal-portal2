import test from "node:test";
import assert from "node:assert/strict";
import Booking from "../models/Booking.js";
import GroupTicketing from "../models/GroupTicketing.js";
import UmrahPackage from "../models/umrahPackgemodel.js";
import UmrahPackageBooking from "../models/UmrahPackageBooking.js";
import SeatLock from "../models/SeatLock.js";
import { checkExternalAvailability, createExternalBooking } from "../controllers/externalApi.controller.js";

const packageId = "507f1f77bcf86cd799439011";
const groupId = "507f1f77bcf86cd799439012";
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test("external Umrah uses remaining linked seats and rechecks under the group lock", async (t) => {
  process.env.JWT_SECRET = "test-secret";
  const pkg = { _id: packageId, selectedGroupTicketId: groupId, availableRooms: 15 };
  let booked = 13;
  let locked = false;
  t.mock.method(GroupTicketing, "findOne", () => ({ lean: async () => null }));
  t.mock.method(GroupTicketing, "findById", () => ({ select: () => ({ lean: async () => ({ totalSeats: 15 }) }) }));
  t.mock.method(UmrahPackage, "findOne", () => ({ lean: async () => pkg }));
  t.mock.method(UmrahPackage, "find", () => ({ select: () => ({ lean: async () => [{ _id: packageId }] }) }));
  t.mock.method(Booking, "aggregate", async () => [{ seats: 3 }]);
  t.mock.method(UmrahPackageBooking, "aggregate", async () => [{ seats: booked - 3 }]);
  t.mock.method(SeatLock, "findOneAndUpdate", async (query, update) => {
    assert.equal(query._id, groupId);
    locked = true;
    return { token: update.$set.token };
  });
  t.mock.method(SeatLock, "deleteOne", async () => { locked = false; });
  t.mock.method(UmrahPackage, "findOneAndUpdate", () => { throw new Error("Must reject before reserving package units"); });
  const req = { apiClient: { _id: packageId }, user: { _id: packageId }, body: { inventoryId: packageId } };
  const next = (error) => { throw error; };
  for (const [adults, children, infants, expected] of [[9, 9, 0, false], [3, 0, 0, false], [1, 1, 0, true], [2, 0, 1, true]]) {
    req.body = { inventoryId: packageId, adults, children, infants };
    const res = response();
    await checkExternalAvailability(req, res, next);
    assert.equal(res.body.data.available, expected);
    assert.equal(Boolean(res.body.data.availabilityToken), expected);
  }
  // Package units still impose their own limit, including infants.
  pkg.availableRooms = 1;
  const limited = response();
  await checkExternalAvailability(req, limited, next);
  assert.equal(limited.body.data.available, false);
  pkg.availableRooms = 15;
  req.body = { inventoryId: packageId, adults: 2 };
  const available = response();
  await checkExternalAvailability(req, available, next);
  req.get = () => available.body.data.availabilityToken;
  booked = 14;
  req.body = {
    inventoryId: packageId, contactPersonName: "Test", roomType: "double",
    passengers: Array.from({ length: 2 }, () => ({ type: "Adult", title: "MR", givenName: "Test", surName: "User", passport: "ABC", nationality: "PK", dateOfBirth: "1990-01-01", passportExpiry: "2030-01-01" })),
  };
  const rejected = response();
  await createExternalBooking(req, rejected, next);
  assert.equal(rejected.statusCode, 409);
  assert.equal(rejected.body.error.code, "INSUFFICIENT_INVENTORY");
  assert.equal(locked, false);
  assert.equal(pkg.availableRooms, 15);
});
