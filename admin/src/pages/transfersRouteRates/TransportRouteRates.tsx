import { useEffect, useState } from "react";
import { useFormik } from "formik";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import {
  getSelectStyles,
  TransportRouteRatesvalidationSchema,
} from "../../schemas";
import { useNavigate } from "react-router";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../components/ui/table";
import axiosInstance from "../../Api/axios";
import CreatableSelect from "react-select/creatable";
import toast from "react-hot-toast";

interface TransferFormValues {
  staffName: string;
  staffNumber: string;
  supplier: string;
  selectTransport: string;
  route: string;
  buyingRate: string;
  sellingRate: string;
}

interface TransferRecord extends TransferFormValues {
  _id: number;
}

interface TransportOption {
  value: string;
}

export default function TransportRouteRates() {
  const [records, setRecords] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [transportOptions, setTransportOptions] = useState<TransportOption[]>(
    []
  );

  useEffect(() => {
    fetchData();
    const transport = async () => {
      const response = await axiosInstance.post(
        "/viewCity",
        { type: "transport" },
        { headers: { "Content-Type": "application/json" } }
      );

      const processedData = response?.data?.map((item: any) => ({
        value: item?.name,
      }));
      setTransportOptions(processedData);
    };
    transport();
  }, []);

  const handleDeleteRoute = async (id: Number) => {
    try {
      await axiosInstance.delete(`/transport-route-rates/${id}`);
      toast.success("Transport route deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting Transport route:", error);
      toast.error("Failed to delete Transport route");
    }
  };

  const fetchData = async () => {
    const response = await axiosInstance.get("/transport-route-rates");
    setRecords(response?.data?.data);
    // console.log("response?.data?.data", response?.data?.data);
  };

  const formik = useFormik<TransferFormValues>({
    initialValues: {
      staffName: "",
      staffNumber: "",
      supplier: "",
      selectTransport: "",
      route: "",
      buyingRate: "",
      sellingRate: "",
    },
    validationSchema: TransportRouteRatesvalidationSchema,
    onSubmit: async (values, { resetForm }) => {
      console.log("values", values)
      setLoading(true);
      await axiosInstance.post("/transport-route-rates", values, {
        headers: { "Content-Type": "application/json" },
      });
      fetchData();
      resetForm();
      setLoading(false);
    },
  });

  const {
    values,
    handleChange,
    handleBlur,
    handleSubmit,
    errors,
    touched,
  } = formik;

  return (
    <ComponentCard title="Add Transport Route and Rates">
      {/* Form Section */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Select Transport */}
          <div>
            <Label>Vehicle Type</Label>
            <CreatableSelect<TransportOption, false>
              id="selectTransport"
              name="selectTransport"
              placeholder="Select or create transport"
              value={
                transportOptions.find(
                  (t) => t.value === values.selectTransport
                ) || null
              }
              onChange={(option) =>
                formik.setFieldValue(
                  "selectTransport",
                  option ? option.value : ""
                )
              }
              onCreateOption={(inputValue: string) => {
                const formattedTransport = inputValue
                  .trim()
                  .split(" ")
                  .map(
                    (word) =>
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  )
                  .join(" ");
                const newOption: TransportOption = {
                  value: formattedTransport,
                };
                setTransportOptions((prev) => [...prev, newOption]);
                formik.setFieldValue("selectTransport", newOption.value);
              }}
              onBlur={() => formik.setFieldTouched("selectTransport", true)}
              options={transportOptions}
              getOptionLabel={(option) =>
                option.value
                  .split(" ")
                  .map(
                    (word) =>
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  )
                  .join(" ")
              }
              getOptionValue={(option) => option.value}
              styles={getSelectStyles(
                !!(touched.selectTransport && errors.selectTransport)
              )}
            />
            {touched.selectTransport && errors.selectTransport && (
              <p className="text-red-500 text-sm">{errors.selectTransport}</p>
            )}
          </div>

          {/* Staff Name */}
          <div>
            <Label>Staff Name</Label>
            <Input
              name="staffName"
              type="text"
              placeholder="Enter staff name"
              value={values.staffName}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {touched.staffName && errors.staffName && (
              <p className="text-red-500 text-sm">{errors.staffName}</p>
            )}
          </div>

          {/* Staff Number */}
          <div>
            <Label>Staff Number</Label>
            <Input
              name="staffNumber"
              type="number"
              min="0"
              placeholder="Enter staff number"
              value={values.staffNumber}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {touched.staffNumber && errors.staffNumber && (
              <p className="text-red-500 text-sm">{errors.staffNumber}</p>
            )}
          </div>

          {/* Supplier */}
          <div>
            <Label>Supplier</Label>
            <Input
              name="supplier"
              type="text"
              placeholder="Enter supplier name"
              value={values.supplier}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {touched.supplier && errors.supplier && (
              <p className="text-red-500 text-sm">{errors.supplier}</p>
            )}
          </div>

          {/* Route */}
          <div>
            <Label>Route</Label>
            <Input
              name="route"
              type="text"
              placeholder="Enter route"
              value={values.route}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {touched.route && errors.route && (
              <p className="text-red-500 text-sm">{errors.route}</p>
            )}
          </div>

          {/* Buying Rate */}
          <div>
            <Label>Buying Rate</Label>
            <Input
              name="buyingRate"
              type="number"
              min="0"
              placeholder="Enter buying rate"
              value={values.buyingRate}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {touched.buyingRate && errors.buyingRate && (
              <p className="text-red-500 text-sm">{errors.buyingRate}</p>
            )}
          </div>

          {/* Selling Rate */}
          <div>
            <Label>Selling Rate</Label>
            <Input
              name="sellingRate"
              type="number"
              min="0"
              placeholder="Enter selling rate"
              value={values.sellingRate}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {touched.sellingRate && errors.sellingRate && (
              <p className="text-red-500 text-sm">{errors.sellingRate}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 rounded text-white ${loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
              }`}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>

      {/* Table Section */}
      <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100">
              <TableRow>
                {[
                  "Sr. No",
                  "Staff Name",
                  "Staff Number",
                  "Supplier",
                  "Transport", // Added to match selectTransport
                  "Route",
                  "Buying Rate",
                  "Selling Rate",
                  "Actions",
                ].map((header, idx) => (
                  <TableCell
                    key={idx}
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start"
                  >
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100">
              {records && records.length > 0 ? (
                records.map((record, index) => (
                  <TableRow key={record._id}>
                    <TableCell className="px-5 py-4">{index + 1}</TableCell>
                    <TableCell className="px-4 py-3">
                      {record.staffName}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {record.staffNumber}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {record.supplier}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {record.selectTransport}
                    </TableCell>
                    <TableCell className="px-4 py-3">{record.route}</TableCell>
                    <TableCell className="px-4 py-3">
                      {record.buyingRate}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {record.sellingRate}
                    </TableCell>
                    <TableCell className="px-4 py-3 flex gap-2">
                      <button
                        className="flex items-center justify-center gap-2 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800"
                        onClick={() =>
                          navigate(`/transport-route-rates/${record._id}`)
                        }
                      >
                        <svg
                          className="fill-current"
                          width="18"
                          height="18"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        className="bg-white px-4 py-2 text-sm text-red-600 shadow hover:bg-red-100"
                        onClick={() => handleDeleteRoute(record._id)}
                      >
                        Delete
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    className="text-center py-6 text-gray-500"
                  >
                    No transfer records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </ComponentCard>
  );
}
