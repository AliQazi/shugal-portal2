import test from "node:test";
import assert from "node:assert/strict";
import Booking from "../models/Booking.js";
import GroupTicketing from "../models/GroupTicketing.js";
import UmrahPackage from "../models/umrahPackgemodel.js";
import SeatLock from "../models/SeatLock.js";
import GlobalSetting from "../models/GlobalSetting.js";
import ActivityLog from "../models/activitylogs.js";
import { checkExternalAvailability, createExternalBooking } from "../controllers/externalApi.controller.js";

const id = "507f1f77bcf86cd799439011";
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test("external booking keeps capacity, counts once, and rechecks availability under the shared lock", async (t) => {
  process.env.JWT_SECRET = "test-secret";
  const group = { _id: id, totalSeats: 20, totalSeatsAfterPartial: 20, flights: [], price: {} };
  let booked = 0;
  let locked = false;
  t.mock.method(GroupTicketing, "findOne", () => ({ lean: async () => group, then: (resolve) => Promise.resolve(group).then(resolve) }));
  t.mock.method(GroupTicketing, "findById", () => ({ select: () => ({ lean: async () => group }) }));
  t.mock.method(GroupTicketing, "findOneAndUpdate", () => { throw new Error("Capacity must not be decremented"); });
  t.mock.method(UmrahPackage, "findOne", () => ({ lean: async () => null }));
  t.mock.method(UmrahPackage, "find", () => ({ select: () => ({ lean: async () => [] }) }));
  t.mock.method(Booking, "aggregate", async (pipeline) => [{ _id: id, seats: booked }]);
  t.mock.method(SeatLock, "findOneAndUpdate", async (query, update) => { locked = true; return { token: update.$set.token }; });
  t.mock.method(SeatLock, "deleteOne", async () => { locked = false; });
  t.mock.method(GlobalSetting, "findOne", () => ({ lean: async () => null }));
  t.mock.method(ActivityLog, "create", async () => ({}));
  t.mock.method(Booking, "create", async (data) => {
    assert.equal(locked, true);
    assert.equal(data.inventoryDeducted, false);
    booked += data.adultsCount + data.childrenCount;
    return { ...data, _id: id, bookingReference: "TEST" };
  });
  const req = { apiClient: { _id: id }, user: { _id: id }, body: { inventoryId: id, adults: 1 } };
  const next = (error) => { throw error; };
  const available = response();
  await checkExternalAvailability(req, available, next);
  assert.equal(available.body.data.available, true);
  req.get = () => available.body.data.availabilityToken;
  req.body = { inventoryId: id, contactPersonName: "Test", passengers: [{ type: "Adult", title: "MR", givenName: "Test", surName: "User", passport: "ABC", nationality: "PK" }] };
  const created = response();
  await createExternalBooking(req, created, next);
  assert.equal(created.statusCode, 201);
  assert.equal(group.totalSeats, 20);
  assert.equal(booked, 1);
  assert.equal(locked, false);
  req.body = { inventoryId: id, adults: 19 };
  const remaining = response();
  await checkExternalAvailability(req, remaining, next);
  assert.equal(remaining.body.data.available, true);
  req.body.adults = 20;
  const full = response();
  await checkExternalAvailability(req, full, next);
  assert.equal(full.body.data.available, false);

  // Another channel fills the seats after the availability token was issued.
  booked = 20;
  req.body = { inventoryId: id, contactPersonName: "Test", passengers: [{ type: "Adult", title: "MR", givenName: "Test", surName: "User", passport: "ABC", nationality: "PK" }] };
  let failure;
  await createExternalBooking(req, response(), (error) => { failure = error; });
  assert.equal(failure.code, "SEATS_UNAVAILABLE");
  assert.equal(locked, false);
  assert.equal(booked, 20);
});
