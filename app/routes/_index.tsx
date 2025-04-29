import { useLoaderData } from "react-router";
import { loader } from "@/root";
import { HeroSection } from "@/components/landing/HeroSection";

const WabiSabiLanding = () => {
  const { user } = useLoaderData<typeof loader>();
  
  return (
    <div className="">
      <HeroSection />
      {/* <Footers />  */}
    </div>
  );
};

export default WabiSabiLanding;
