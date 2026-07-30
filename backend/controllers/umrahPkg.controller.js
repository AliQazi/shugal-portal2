import zipAccountsService from "../services/zipAccounts.service.js";

export const fetchZIPUmrahPkgs = async (req, res) => {
  try {
    const query = {};
    const zipResponse = await zipAccountsService.fetchUmrahPackages();
    res.status(200).json({
      message: "Umrah voucher fetched succesfully",
      data: zipResponse,
    });
  } catch (error) {
    console.log("Error fetching umrah vouchers", error.message);
    res.status(400).json({
      message: "Error fetching umrah vouchers...",
    });
  }
};
