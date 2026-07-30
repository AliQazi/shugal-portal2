import { useEffect, useState } from "react";
import { useFormik } from "formik";
import Select from "react-select";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { addvisaSchema, getSelectStyles } from "../../schemas";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useNavigate } from "react-router";
// import { ErrorNotify, SuccessNotify } from "../../components/toastMessages/Message";
import axiosInstance from "../../Api/axios";
import toast from "react-hot-toast";

type Visa = {
  _id: string;
  visaName: string;
  supplierAccount: string;
  adultVisaCost: string;
  adultVisaSelling: string;
  infantVisaCost: string;
  infantVisaSelling: string;
  childVisaCost: string;
  childVisaSelling: string;
};

export default function Visa() {
  const [visas, setVisas] = useState<Visa[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();


  const visaNameOptions = [
    { value: "umrahWithTransport", label: "Umrah With Transport" },
    { value: "umrahWithoutTransport", label: "Umrah Without Transport" },
    { value: "hajjWithTransport", label: "Hajj With Transport" },
    { value: "hajjWithoutTransport", label: "Hajj Without Transport" },
    { value: "umrahPax01", label: "01 PAX" },
    { value: "umrahPax02", label: "02 PAX" },
    { value: "umrahPax03", label: "03 PAX" },
    { value: "umrahPax04", label: "04 PAX" },
    { value: "umrahPax05To19", label: "05 TO 19 PAX" },
    { value: "umrahPax20To29", label: "20 TO 29 PAX" },
    { value: "umrahPax30To47", label: "30 TO 47 PAX" },
    { value: "umrahInfant", label: "INFANT" },
  ];

  // legacy values saved before the "umrah" prefix was added to pax-tier types
  const legacyVisaLabels: Record<string, string> = {
    pax01: "01 PAX",
    pax02: "02 PAX",
    pax03: "03 PAX",
    pax04: "04 PAX",
    pax05To19: "05 TO 19 PAX",
    pax20To29: "20 TO 29 PAX",
    pax30To47: "30 TO 47 PAX",
    infant: "INFANT",
  };

  const getVisaLabel = (name: string) =>
    visaNameOptions.find((opt) => opt.value === name)?.label ||
    legacyVisaLabels[name] ||
    name.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());

  const formik = useFormik({
    initialValues: {
      visaName: "",
      supplierAccount: "",
      adultVisaCost: "",
      adultVisaSelling: "",
      infantVisaCost: "",
      infantVisaSelling: "",
      childVisaCost: "",
      childVisaSelling: "",
    },
    validationSchema: addvisaSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        await axiosInstance.post("/ummrah-visa", values);
        toast.success("Visa added successfully");
        fetchVisas();
        resetForm();
      } catch (error) {
        console.error("Error saving visa:", error);
        toast.error("Failed to save visa");
      }
    },
  });

  const { values, setFieldValue, handleChange, handleBlur, handleSubmit, errors, touched } = formik;

  const fetchVisas = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/ummrah-visa");
      setVisas(response.data);
    } catch (error) {
      console.error("Error fetching visas:", error);
      toast.error("Failed to fetch visas");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVisa = async (id: string) => {
    try {
      await axiosInstance.delete(`/ummrah-visa/${id}`);
      toast.success("Visa deleted successfully");
      fetchVisas();
    } catch (error) {
      console.error("Error deleting visa:", error);
      toast.error("Failed to delete visa");
    }
  };

  useEffect(() => {
    fetchVisas();
  }, []);

  return (
    <ComponentCard title="Visa Management">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Visa Name</Label>
            <Select
              options={visaNameOptions}
              value={visaNameOptions.find((opt) => opt.value === values.visaName) || null}
              onChange={(option) => setFieldValue("visaName", option?.value || "")}
              styles={getSelectStyles(false)}
            />
            {errors.visaName && touched.visaName && (
              <p className="text-red-500 text-sm">{errors.visaName}</p>
            )}
          </div>
          {/* Supplier */}
          <div>
            <Label>Supplier</Label>
            <Input
              name="supplierAccount"
              type="text"
              placeholder="Enter supplier name"
              value={values.supplierAccount}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {touched.supplierAccount && errors.supplierAccount && (
              <p className="text-red-500 text-sm">{errors.supplierAccount}</p>
            )}
          </div>

          <div>
            <Label>Adult Visa Cost</Label>
            <Input
              type="number"
              name="adultVisaCost"
              min="0"
              value={values.adultVisaCost}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {errors.adultVisaCost && touched.adultVisaCost && (
              <p className="text-red-500 text-sm">{errors.adultVisaCost}</p>
            )}
          </div>

          <div>
            <Label>Adult Visa Selling</Label>
            <Input
              type="number"
              min="0"
              name="adultVisaSelling"
              value={values.adultVisaSelling}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {errors.adultVisaSelling && touched.adultVisaSelling && (
              <p className="text-red-500 text-sm">{errors.adultVisaSelling}</p>
            )}
          </div>
          <div>
            <Label>Child Visa Cost</Label>
            <Input
              type="number"
              name="childVisaCost"
              min="0"
              value={values.childVisaCost}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {errors.childVisaCost && touched.childVisaCost && (
              <p className="text-red-500 text-sm">{errors.childVisaCost}</p>
            )}
          </div>

          <div>
            <Label>Child Visa Selling</Label>
            <Input
              type="number"
              min="0"
              name="childVisaSelling"
              value={values.childVisaSelling}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {errors.childVisaSelling && touched.childVisaSelling && (
              <p className="text-red-500 text-sm">{errors.childVisaSelling}</p>
            )}
          </div>

          <div>
            <Label>Infant Visa Cost</Label>
            <Input
              type="number"
              min="0"
              name="infantVisaCost"
              value={values.infantVisaCost}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {errors.infantVisaCost && touched.infantVisaCost && (
              <p className="text-red-500 text-sm">{errors.infantVisaCost}</p>
            )}
          </div>

          <div>
            <Label>Infant Visa Selling</Label>
            <Input
              type="number"
              min="0"
              name="infantVisaSelling"
              value={values.infantVisaSelling}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {errors.infantVisaSelling && touched.infantVisaSelling && (
              <p className="text-red-500 text-sm">{errors.infantVisaSelling}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2"
          >
            Add Visa
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100">
              <TableRow>
                {[
                  "Sr. No",
                  "Visa Name",
                  "Supplier Account",
                  "Adult Visa Cost",
                  "Adult Visa Selling",
                  "Child Visa Cost",
                  "Child Visa Selling",
                  "Infant Visa Cost",
                  "Infant Visa Selling",
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
              {loading ? (
                <TableRow>
                  <TableCell className="text-center py-6 text-gray-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : visas && visas.length > 0 ? (
                visas.map((visa, index) => (
                  <TableRow key={visa._id}>
                    <TableCell className="px-5 py-4">{index + 1}</TableCell>
                    <TableCell className="px-4 py-3">
                      {getVisaLabel(visa.visaName)}
                    </TableCell>
                    <TableCell className="px-4 py-3">{visa.supplierAccount}</TableCell>
                    <TableCell className="px-4 py-3">{visa.adultVisaCost}</TableCell>
                    <TableCell className="px-4 py-3">{visa.adultVisaSelling}</TableCell>
                    <TableCell className="px-4 py-3">{visa.childVisaCost}</TableCell>
                    <TableCell className="px-4 py-3">{visa.childVisaSelling}</TableCell>
                    <TableCell className="px-4 py-3">{visa.infantVisaCost}</TableCell>
                    <TableCell className="px-4 py-3">{visa.infantVisaSelling}</TableCell>
                    <TableCell className="px-4 py-3 flex gap-2">
                      <button
                        className="flex items-center justify-center gap-2 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow hover:bg-gray-50"
                        onClick={() => navigate(`/update-ummrah-visa/${visa._id}`)}
                      >
                        Edit
                      </button>
                      <button
                        className="bg-white px-4 py-2 text-sm text-red-600 shadow hover:bg-red-100"
                        onClick={() => handleDeleteVisa(visa._id)}
                      >
                        Delete
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="text-center py-6 text-gray-500">
                    No records found
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
