import { useEffect, useState } from "react";
import { useFormik } from "formik";
import { useNavigate, useParams } from "react-router";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "react-select";
import { addvisaSchema, getSelectStyles } from "../../schemas";
import axiosInstance from "../../Api/axios";
import toast from "react-hot-toast";


interface VisaFormValues {
  visaName: string;
  supplierAccount: string;
  adultVisaCost: string;
  adultVisaSelling: string;
  childVisaCost: string;
  childVisaSelling: string;
  infantVisaCost: string;
  infantVisaSelling: string;
}

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
const legacyVisaNameMap: Record<string, string> = {
  pax01: "umrahPax01",
  pax02: "umrahPax02",
  pax03: "umrahPax03",
  pax04: "umrahPax04",
  pax05To19: "umrahPax05To19",
  pax20To29: "umrahPax20To29",
  pax30To47: "umrahPax30To47",
  infant: "umrahInfant",
};

const initialValues: VisaFormValues = {
  visaName: "",
  supplierAccount: "",
  adultVisaCost: "",
  adultVisaSelling: "",
  childVisaCost: "",
  childVisaSelling: "",
  infantVisaCost: "",
  infantVisaSelling: "",
};

const UpdateVisa = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);

  const formik = useFormik<VisaFormValues>({
    initialValues,
    validationSchema: addvisaSchema,
    onSubmit: async (values) => {
      const formData = new FormData();
      formData.append("visaName", values.visaName);
      formData.append("supplierAccount", values.supplierAccount);
      formData.append("adultVisaCost", values.adultVisaCost);
      formData.append("adultVisaSelling", values.adultVisaSelling);
      formData.append("childVisaCost", values.childVisaCost);
      formData.append("childVisaSelling", values.childVisaSelling);
      formData.append("infantVisaCost", values.infantVisaCost);
      formData.append("infantVisaSelling", values.infantVisaSelling);

      try {
        setLoading(true);

        const res = await axiosInstance.put(`/ummrah-visa/${id}`, formData, {
          headers: { "Content-Type": "application/json", },
        }
        );

        toast.success("Visa updated Successfully")
        navigate("/add-visa");
        console.log("Visa updated successfully:", res.data);
      } catch (err) {
        console.error("Visa update failed:", err);
      } finally {
        setLoading(false);
      }
    },
  });

  const {
    values,
    setValues,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
  } = formik;

  // Fetch visa data for edit
  useEffect(() => {
    if (!id) return;
    axiosInstance
      .get(`/ummrah-visa/${id}`)
      .then((res) => {
        const data = res.data.data;
        setValues({
          visaName: legacyVisaNameMap[data.visaName] || data.visaName || "",
          supplierAccount: data.supplierAccount || "",
          adultVisaCost: data.adultVisaCost || "",
          adultVisaSelling: data.adultVisaSelling || "",
          childVisaCost: data.childVisaCost || "",
          childVisaSelling: data.childVisaSelling || "",
          infantVisaCost: data.infantVisaCost || "",
          infantVisaSelling: data.infantVisaSelling || "",
        });
      })
      .catch((err) => console.error("Failed to fetch visa:", err));
  }, [id, setValues]);

  return (
    <ComponentCard title={"Update Visa"}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Visa Name */}
          <div>
            <Label>Visa Name</Label>
            <Select
              options={visaNameOptions}
              value={
                visaNameOptions.find((opt) => opt.value === values.visaName) ||
                null
              }
              onChange={(option) =>
                setFieldValue("visaName", option?.value || "")
              }
              styles={getSelectStyles(false)}
            />
            {formik.touched.visaName && formik.errors.visaName && (
              <p className="text-red-500 text-sm">{formik.errors.visaName}</p>
            )}
          </div>

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
            {formik.touched.supplierAccount && formik.errors.supplierAccount && (
              <p className="text-red-500 text-sm">{formik.errors.supplierAccount}</p>
            )}
          </div>

          {/* Adult Visa Cost */}
          <div>
            <Label>Adult Visa Cost</Label>
            <Input
              name="adultVisaCost"
              type="number"
              min="0"
              placeholder="Enter adult visa cost"
              value={values.adultVisaCost}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {formik.touched.adultVisaCost && formik.errors.adultVisaCost && (
              <p className="text-red-500 text-sm">
                {formik.errors.adultVisaCost}
              </p>
            )}
          </div>

          {/* Adult Visa Selling */}
          <div>
            <Label>Adult Visa Selling</Label>
            <Input
              name="adultVisaSelling"
              type="number"
              min="0"
              placeholder="Enter adult visa selling price"
              value={values.adultVisaSelling}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {formik.touched.adultVisaSelling &&
              formik.errors.adultVisaSelling && (
                <p className="text-red-500 text-sm">
                  {formik.errors.adultVisaSelling}
                </p>
              )}
          </div>
          {/* Child Visa Cost */}
          <div>
            <Label>Child Visa Cost</Label>
            <Input
              name="childVisaCost"
              type="number"
              min="0"
              placeholder="Enter child visa cost"
              value={values.childVisaCost}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {formik.touched.childVisaCost && formik.errors.childVisaCost && (
              <p className="text-red-500 text-sm">
                {formik.errors.childVisaCost}
              </p>
            )}
          </div>

          {/* Child Visa Selling */}
          <div>
            <Label>Child Visa Selling</Label>
            <Input
              name="childVisaSelling"
              type="number"
              min="0"
              placeholder="Enter child visa selling price"
              value={values.childVisaSelling}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {formik.touched.childVisaSelling &&
              formik.errors.childVisaSelling && (
                <p className="text-red-500 text-sm">
                  {formik.errors.childVisaSelling}
                </p>
              )}
          </div>

          {/* Infant Visa Cost */}
          <div>
            <Label>Infant Visa Cost</Label>
            <Input
              name="infantVisaCost"
              type="number"
              min="0"
              placeholder="Enter infant visa cost"
              value={values.infantVisaCost}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {formik.touched.infantVisaCost && formik.errors.infantVisaCost && (
              <p className="text-red-500 text-sm">
                {formik.errors.infantVisaCost}
              </p>
            )}
          </div>

          {/* Infant Visa Selling */}
          <div>
            <Label>Infant Visa Selling</Label>
            <Input
              name="infantVisaSelling"
              type="number"
              min="0"
              placeholder="Enter infant visa selling price"
              value={values.infantVisaSelling}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {formik.touched.infantVisaSelling &&
              formik.errors.infantVisaSelling && (
                <p className="text-red-500 text-sm">
                  {formik.errors.infantVisaSelling}
                </p>
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
            {loading ? "Updating..." : "Update Visa"}
          </button>
        </div>
      </form>
    </ComponentCard>
  );
};

export default UpdateVisa;
