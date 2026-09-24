export interface RatePricing {
  buyingPrice: number;
  buyingRoe: number;
  buyingCurrency: string;
  sellingPrice: number;
  sellingRoe: number;
  sellingCurrency: string;
  sharedRoomBuyingPrice: number;
  sharedRoomBuyingRoe: number;
  sharedRoomBuyingCurrency: string;
  sharedRoomSellingPrice: number;
  sharedRoomSellingRoe: number;
  sharedRoomSellingCurrency: string;
}

export interface RateVolumeDateRate extends RatePricing {
  fromDate: string;
  toDate: string;
}

export interface RateVolumeHotelRate extends RatePricing {
  hotelId?: string;
  city?: string;
  dateRates: RateVolumeDateRate[];
}

export interface RateVolumeData {
  volumeName: string;
  fromDate?: string;
  toDate?: string;
  dateRanges: { fromDate?: string; toDate?: string }[];
  hotelRates: RateVolumeHotelRate[];
}

export interface RateVolumeOption {
  value: string;
  label: string;
  data: RateVolumeData;
}

const dateOnly = (value?: string) => value ? value.slice(0, 10) : "";

export const emptyRatePricing = (): RatePricing => ({
  buyingPrice: 0,
  buyingRoe: 1,
  buyingCurrency: "PKR",
  sellingPrice: 0,
  sellingRoe: 1,
  sellingCurrency: "PKR",
  sharedRoomBuyingPrice: 0,
  sharedRoomBuyingRoe: 1,
  sharedRoomBuyingCurrency: "PKR",
  sharedRoomSellingPrice: 0,
  sharedRoomSellingRoe: 1,
  sharedRoomSellingCurrency: "PKR",
});

const normalizePricing = (rate: any): RatePricing => ({
  buyingPrice: rate?.buyingPrice ?? 0,
  buyingRoe: rate?.buyingRoe ?? 1,
  buyingCurrency: rate?.buyingCurrency || "PKR",
  sellingPrice: rate?.sellingPrice ?? 0,
  sellingRoe: rate?.sellingRoe ?? 1,
  sellingCurrency: rate?.sellingCurrency || "PKR",
  sharedRoomBuyingPrice: rate?.sharedRoomBuyingPrice ?? 0,
  sharedRoomBuyingRoe: rate?.sharedRoomBuyingRoe ?? 1,
  sharedRoomBuyingCurrency: rate?.sharedRoomBuyingCurrency || "PKR",
  sharedRoomSellingPrice: rate?.sharedRoomSellingPrice ?? 0,
  sharedRoomSellingRoe: rate?.sharedRoomSellingRoe ?? 1,
  sharedRoomSellingCurrency: rate?.sharedRoomSellingCurrency || "PKR",
});

export const normalizeRateVolume = (volume: any): RateVolumeOption => {
  const rawRates = Array.isArray(volume.hotelRates) && volume.hotelRates.length ? volume.hotelRates : [volume];
  const firstFrom = volume.fromDate || rawRates[0]?.fromDate;
  const firstTo = volume.toDate || rawRates[0]?.toDate;
  const dateRanges = (Array.isArray(volume.dateRanges) && volume.dateRanges.length
    ? volume.dateRanges
    : [{ fromDate: firstFrom, toDate: firstTo }]
  ).map((range: any) => ({ fromDate: dateOnly(range.fromDate), toDate: dateOnly(range.toDate) }));

  const hotelRates: RateVolumeHotelRate[] = rawRates.map((rate: any) => {
    const dateRates = Array.isArray(rate.dateRates) && rate.dateRates.length
      ? rate.dateRates.map((dateRate: any) => ({
          fromDate: dateOnly(dateRate.fromDate),
          toDate: dateOnly(dateRate.toDate),
          ...normalizePricing(dateRate),
        }))
      : dateRanges.map((range: { fromDate?: string; toDate?: string }) => ({
          fromDate: range.fromDate || "",
          toDate: range.toDate || "",
          ...normalizePricing(rate),
        }));
    return {
      hotelId: typeof rate.hotel === "string" ? rate.hotel : rate.hotel?._id,
      city: rate.city,
      ...normalizePricing(dateRates[0] || rate),
      dateRates,
    };
  });

  return {
    value: volume._id,
    label: `${volume.volumeName} (${hotelRates.length} hotel ${hotelRates.length === 1 ? "rate" : "rates"})`,
    data: { volumeName: volume.volumeName, fromDate: dateOnly(firstFrom), toDate: dateOnly(firstTo), dateRanges, hotelRates },
  };
};

const utcDay = (value: string) => new Date(`${dateOnly(value)}T00:00:00.000Z`);

// Every charged hotel night, as an ISO date string, for a [checkIn, checkOut) stay.
// Checkout is not a charged night.
const nightsOf = (start: Date, end: Date): string[] => {
  const nights: string[] = [];
  const cursor = new Date(start);
  while (cursor < end) {
    nights.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return nights;
};

// A band covers a night the same way a hotel stay does: [fromDate, toDate) per night, so
// a night landing exactly on a band's toDate (its checkout day) belongs to the *next*
// band, not this one - letting adjacent bands share a boundary date.
const bandForNight = (dateRates: RateVolumeDateRate[], night: string) =>
  dateRates.find((dateRate) => dateRate.fromDate <= night && night < dateRate.toDate);

const priceRoePairs: { price: keyof RatePricing; roe: keyof RatePricing }[] = [
  { price: "buyingPrice", roe: "buyingRoe" },
  { price: "sellingPrice", roe: "sellingRoe" },
  { price: "sharedRoomBuyingPrice", roe: "sharedRoomBuyingRoe" },
  { price: "sharedRoomSellingPrice", roe: "sharedRoomSellingRoe" },
];

// Nights-weighted blend of every band a stay touches. Downstream totals are always
// `nights * price * roe`, so each field is blended as (price * roe) - its true per-night
// cost - averaged across the stay and re-expressed with roe = 1 so the blended price
// alone reproduces the same total regardless of how many currencies/ROEs were involved.
const blendBands = (bands: RateVolumeDateRate[]): RatePricing => {
  const blended = emptyRatePricing() as unknown as Record<keyof RatePricing, number | string>;
  const totalNights = bands.length || 1;
  for (const { price, roe } of priceRoePairs) {
    const sum = bands.reduce((acc, band) => acc + (Number(band[price]) || 0) * (Number(band[roe]) || 1), 0);
    blended[price] = Math.round((sum / totalNights) * 100) / 100;
    blended[roe] = 1;
  }
  blended.buyingCurrency = "PKR";
  blended.sellingCurrency = "PKR";
  blended.sharedRoomBuyingCurrency = "PKR";
  blended.sharedRoomSellingCurrency = "PKR";
  return blended as unknown as RatePricing;
};

// Resolves the rate for a hotel's stay. If every night falls in the same date band, that
// band's rate is used as-is. If the stay crosses band boundaries (e.g. check-in mid one
// band, check-out mid the next), the price is a nights-weighted average across the bands
// it actually touches. Returns undefined only when some night of the stay isn't covered
// by any band at all.
export const resolveHotelRateForStay = (
  volume: RateVolumeData,
  hotelId: string | undefined,
  checkIn?: string,
  checkOut?: string,
): RateVolumeHotelRate | undefined => {
  if (!hotelId) return undefined;
  const hotelRate = volume.hotelRates.find((rate) => rate.hotelId === hotelId);
  if (!hotelRate) return undefined;
  if (!checkIn || !checkOut) return hotelRate;

  const start = utcDay(checkIn);
  const end = utcDay(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return undefined;

  const nights = nightsOf(start, end);
  const perNightBands = nights.map((night) => bandForNight(hotelRate.dateRates, night));
  if (perNightBands.some((band) => !band)) return undefined;

  const bands = perNightBands as RateVolumeDateRate[];
  const uniqueBands = Array.from(new Set(bands));
  const pricing = uniqueBands.length === 1 ? uniqueBands[0] : blendBands(bands);

  return { ...hotelRate, ...pricing, dateRates: hotelRate.dateRates };
};
