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

// A rate is valid only when one date band covers every charged hotel night.
// Checkout is not a charged night, so a band ending on 30 Sep may cover a stay
// checking out on 01 Oct. Cross-band stays deliberately return undefined; the
// package form must not blend or average independently configured date rates.
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
  const lastNight = new Date(end);
  lastNight.setUTCDate(lastNight.getUTCDate() - 1);
  const firstNightIso = start.toISOString().slice(0, 10);
  const lastNightIso = lastNight.toISOString().slice(0, 10);
  const band = hotelRate.dateRates.find(
    (dateRate) => dateRate.fromDate <= firstNightIso && dateRate.toDate >= lastNightIso,
  );

  return band ? { ...hotelRate, ...band, dateRates: hotelRate.dateRates } : undefined;
};
