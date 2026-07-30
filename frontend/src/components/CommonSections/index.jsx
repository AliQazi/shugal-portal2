import AboutSection from "../AboutSection";
import ServicesSection from "../ServicesSection";
import ChooseUsSection from "../ChooseUsSection";
import SpecialOffer from "../SpecialOffer/SpecialOffer";
import DestinationsSection from "../Destination/Destinations";

export default function CommonSections() {
  return (
    <>
      <ServicesSection />
      <AboutSection />
      <SpecialOffer />
      {/* <DestinationsSection /> */}
      <ChooseUsSection />
    </>
  );
}
