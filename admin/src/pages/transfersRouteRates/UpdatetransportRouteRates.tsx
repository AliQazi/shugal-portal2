import { useEffect, useState } from "react";
import { useFormik } from "formik";
// import * as Yup from "yup";
import { useNavigate, useParams } from "react-router";
import CreatableSelect from "react-select/creatable";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import {
  getSelectStyles,
  TransportRouteRatesvalidationSchema,
} from "../../schemas";
import axiosInstance from "../../Api/axios";

interface TransferFormValues {
  staffName: string;
  staffNumber: string;
  supplier: string;
  selectTransport: string;
  route: string;
  buyingRate: string;
  sellingRate: string;
}

// const suppliers = [
//   { value: "Supplier 1", label: "Supplier 1" },
//   { value: "Supplier 2", label: "Supplier 2" },
//   { value: "Supplier 3", label: "Supplier 3" },
// ];

interface TransportOption {
  value: string;
}

export default function UpdatetransportRouteRates() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [transportOptions, setTransportOptions] = useState<TransportOption[]>(
    []
  );

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
    onSubmit: async (values) => {
      setLoading(true);
      try {
        await axiosInstance.put(
          `/transport-route-rates/${id}`,
          values,
          {
            headers: { "Content-Type": "application/json" },
          }
        );
        navigate("/transport-route-rates");
      } catch (error) {
        console.error("Error updating transfer:", error);
      } finally {
        setLoading(false);
      }
    },
  });

  const {
    values,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    errors,
    touched,
  } = formik;

  // Fetch record and transport options
  useEffect(() => {
    if (id) {
      fetchTransferData();
    }
    fetchTransportOptions();
  }, [id]);

  const fetchTransportOptions = async () => {
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

  const fetchTransferData = async () => {
    try {
      const response = await axiosInstance.get(
        `/transport-route-rates/${id}`
      );
      const data = response.data?.data;
      if (data) {
        Object.keys(data).forEach((key) => {
          if (formik.values.hasOwnProperty(key)) {
            setFieldValue(key, data[key]);
          }
        });
      }
    } catch (error) {
      console.error("Error fetching transfer record:", error);
    }
  };

  return (
    <ComponentCard title="Update Transport Route and Rates">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Select Transport (Creatable) */}
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
              value={values.sellingRate}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {touched.sellingRate && errors.sellingRate && (
              <p className="text-red-500 text-sm">{errors.sellingRate}</p>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate("/transport-route-rates")}
            className="px-4 py-2 rounded text-white bg-gray-500 hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 rounded text-white ${loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
              }`}
          >
            {loading ? "Updating..." : "Update"}
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}
